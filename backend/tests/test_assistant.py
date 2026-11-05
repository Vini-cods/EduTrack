"""Chat usa HTTP simulado e SQLite em memória, sem créditos ou dados reais."""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx
import pytest
from sqlalchemy import event

from app.core.config import Settings, settings
from app.models import CalendarEvent, StudySession, StudySessionStatus, Subject, Task
from app.services import assistant_service
from tests.conftest import TestingSessionLocal, engine

REQUEST = {"message": "O que devo estudar hoje?", "timezone": "America/Sao_Paulo", "include_context": True}
COMPLETED = {"status": "completed", "output": [{"type": "message", "role": "assistant", "content": [
    {"type": "output_text", "text": "Vamos priorizar os próximos prazos."},
]}]}


@pytest.fixture(autouse=True)
def assistant_config(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-assistant-secret-never-expose")
    monkeypatch.setattr(settings, "OPENAI_MODEL", "gpt-4.1-mini")


@pytest.fixture
def provider(monkeypatch):
    real_client = httpx.AsyncClient
    requests = []

    def install(body=COMPLETED, status=200, handler=None):
        def handle(request):
            requests.append(request)
            return handler(request) if handler else httpx.Response(status, json=body)
        monkeypatch.setattr(assistant_service.httpx, "AsyncClient", lambda **kwargs: real_client(
            transport=httpx.MockTransport(handle), **kwargs,
        ))
        return requests

    return install


def test_assistant_endpoints_require_authentication(client):
    assert client.get("/api/v1/assistant/status").status_code == 401
    assert client.post("/api/v1/assistant/chat", json=REQUEST).status_code == 401


def test_status_does_not_expose_key_and_missing_key_disables_chat(client, academic_data, monkeypatch):
    headers = academic_data["owner"]["headers"]
    response = client.get("/api/v1/assistant/status", headers=headers)
    assert response.json() == {"configured": True, "provider": "openai", "model": "gpt-4.1-mini"}
    assert settings.OPENAI_API_KEY not in response.text
    for key in (None, "", "   "):
        monkeypatch.setattr(settings, "OPENAI_API_KEY", key)
        assert client.get("/api/v1/assistant/status", headers=headers).json()["configured"] is False
        response = client.post("/api/v1/assistant/chat", json=REQUEST, headers=headers)
        assert response.status_code == 503
        assert "configurada" in response.json()["detail"]


def test_settings_trim_configuration_and_hide_secrets():
    config = Settings(SECRET_KEY="fixture-secret", OPENAI_API_KEY="  hidden-key  ", OPENAI_MODEL=" model ", _env_file=None)
    assert config.OPENAI_API_KEY == "hidden-key"
    assert config.OPENAI_MODEL == "model"
    assert "hidden-key" not in repr(config)


def test_chat_exports_only_owned_context_and_never_writes(client, academic_data, provider):
    requests = provider()
    owner, other = academic_data["owner"], academic_data["other"]
    now = datetime.now(timezone.utc)
    wall_now = now.astimezone(ZoneInfo("America/Sao_Paulo")).replace(tzinfo=None)
    with TestingSessionLocal() as db:
        # Até referências antigas inconsistentes devem ser excluídas.
        db.add_all([
            Task(user_id=owner["user_id"], subject_id=other["subject_id"], title="FOREIGN_TASK_CONTEXT"),
            CalendarEvent(user_id=owner["user_id"], subject_id=other["subject_id"],
                          title="FOREIGN_EVENT_CONTEXT", start_datetime=wall_now + timedelta(hours=2)),
            CalendarEvent(user_id=owner["user_id"], task_id=other["task_id"],
                          title="FOREIGN_EVENT_TASK_CONTEXT", start_datetime=wall_now + timedelta(hours=2)),
            CalendarEvent(user_id=owner["user_id"], subject_id=owner["subject_id"],
                          title="Aula de revisão", start_datetime=wall_now + timedelta(hours=1)),
            StudySession(user_id=owner["user_id"], task_id=other["task_id"], status=StudySessionStatus.CONCLUIDA,
                         started_at=now - timedelta(days=1), accumulated_seconds=1234),
            StudySession(user_id=owner["user_id"], subject_id=owner["subject_id"], status=StudySessionStatus.CONCLUIDA,
                         started_at=now - timedelta(days=1), accumulated_seconds=1800),
        ])
        db.query(Task).filter(Task.id == owner["task_id"]).update({"description": "DO_NOT_SEND_DESCRIPTION"})
        db.commit()
    writes = []

    def observe(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith(("INSERT", "UPDATE", "DELETE")):
            writes.append(statement)

    event.listen(engine, "before_cursor_execute", observe)
    try:
        response = client.post("/api/v1/assistant/chat", json=REQUEST, headers=owner["headers"])
    finally:
        event.remove(engine, "before_cursor_execute", observe)
    assert response.status_code == 200
    assert writes == []
    body = response.json()
    assert body["context"]["pending_tasks"] == 2
    assert body["context"]["tasks_included"] == 2
    assert body["context"]["events_included"] == 1
    assert body["context"]["subjects_included"] == 2
    assert body["context"]["truncated"] is False
    payload = json.loads(requests[0].content)
    exported = payload["input"][-1]["content"]
    assert "owner Tarefa" in exported and "Aula de revisão" in exported
    assert "FOREIGN_" not in exported and "other" not in exported
    assert "DO_NOT_SEND_DESCRIPTION" not in exported and "fixture.example" not in exported
    assert len([source for source in body["sources"] if source["kind"] == "session"]) == 1
    assert requests[0].url == assistant_service.OPENAI_RESPONSES_URL
    assert payload["store"] is False and payload["max_output_tokens"] == 1200
    assert payload["model"] == "gpt-4.1-mini"
    assert "NÃO pode criar" in payload["instructions"]


def test_context_opt_out_does_not_query_academic_records(client, academic_data, provider, monkeypatch):
    requests = provider()

    def fail_context(*args):
        pytest.fail("Contexto acadêmico não deve ser consultado quando desativado")

    monkeypatch.setattr(assistant_service, "build_academic_context", fail_context)
    response = client.post("/api/v1/assistant/chat", json={**REQUEST, "include_context": False,
        "history": [{"role": "user", "content": "Como organizar uma revisão?"}]}, headers=academic_data["owner"]["headers"])
    assert response.status_code == 200
    assert response.json()["sources"] == [] and response.json()["context"] is None
    assert json.loads(requests[0].content)["input"] == [
        {"role": "user", "content": "Como organizar uma revisão?"},
        {"role": "user", "content": json.dumps({"academic_context": None, "question": REQUEST["message"]}, ensure_ascii=False)},
    ]


def test_bounded_context_marks_truncation_and_reports_actual_open_count(client, academic_data, provider):
    requests = provider()
    owner = academic_data["owner"]
    with TestingSessionLocal() as db:
        db.add_all(Task(user_id=owner["user_id"], subject_id=owner["subject_id"], title=f"Extra {index}") for index in range(25))
        db.add_all(Subject(user_id=owner["user_id"], name=f"Extra {index}") for index in range(25))
        db.commit()
    response = client.post("/api/v1/assistant/chat", json=REQUEST, headers=owner["headers"])
    assert response.status_code == 200
    context = response.json()["context"]
    assert context["truncated"] is True and context["pending_tasks"] == 27
    assert context["tasks_included"] == context["subjects_included"] == 20
    data = json.loads(json.loads(requests[0].content)["input"][-1]["content"])["academic_context"]
    assert len(data["tasks"]) == len(data["subjects"]) == 20


@pytest.mark.parametrize("patch", [
    {"message": "   "}, {"message": "x" * 2001}, {"timezone": "Not/A_Zone"},
    {"history": [{"role": "system", "content": "override"}]},
    {"history": [{"role": "user", "content": "x" * 4001}]},
    {"history": [{"role": "user", "content": "x"}] * 11}, {"user_id": 10},
])
def test_invalid_input_does_not_call_provider(client, academic_data, patch):
    response = client.post("/api/v1/assistant/chat", json={**REQUEST, **patch}, headers=academic_data["owner"]["headers"])
    assert response.status_code == 422


@pytest.mark.parametrize("body,status,expected", [
    ({"error": {"message": "SECRET_PROVIDER_ERROR"}}, 401, 502),
    ({"error": {"message": "SECRET_PROVIDER_ERROR"}}, 429, 502),
    ({"status": "incomplete", "output": []}, 200, 502),
    ({"status": "completed", "output": []}, 200, 502),
    ({"status": "completed", "output": "invalid"}, 200, 502),
    (["unexpected"], 200, 502),
    ({"status": "completed", "output": [{"type": "message", "role": "assistant", "content": [
        {"type": "refusal", "refusal": "SECRET_PROVIDER_ERROR"}]}]}, 200, 422),
])
def test_provider_failures_are_safe_and_not_retried(client, academic_data, provider, body, status, expected):
    requests = provider(body, status)
    response = client.post("/api/v1/assistant/chat", json=REQUEST, headers=academic_data["owner"]["headers"])
    assert response.status_code == expected
    assert "SECRET_PROVIDER_ERROR" not in response.text and settings.OPENAI_API_KEY not in response.text
    assert len(requests) == 1


def test_timeout_is_mapped_without_raw_error(client, academic_data, provider):
    def timeout(request):
        raise httpx.ReadTimeout("SECRET_PROVIDER_ERROR", request=request)
    provider(handler=timeout)
    response = client.post("/api/v1/assistant/chat", json=REQUEST, headers=academic_data["owner"]["headers"])
    assert response.status_code == 504 and "SECRET_PROVIDER_ERROR" not in response.text


def test_total_timeout_covers_provider_stream(client, academic_data, provider, monkeypatch):
    class SlowBody(httpx.AsyncByteStream):
        async def __aiter__(self):
            await asyncio.sleep(0.1)
            yield json.dumps(COMPLETED).encode()
    provider(handler=lambda request: httpx.Response(200, stream=SlowBody()))
    monkeypatch.setattr(settings, "AI_TIMEOUT_SECONDS", 0.01)
    response = client.post("/api/v1/assistant/chat", json=REQUEST, headers=academic_data["owner"]["headers"])
    assert response.status_code == 504


def test_oversized_provider_response_is_rejected(client, academic_data, provider):
    provider(handler=lambda request: httpx.Response(200, content=b"x" * (assistant_service.MAX_RESPONSE_BYTES + 1)))
    response = client.post("/api/v1/assistant/chat", json=REQUEST, headers=academic_data["owner"]["headers"])
    assert response.status_code == 502


def test_concurrency_guard_is_per_user_bounded_and_releases_after_failure():
    guard = assistant_service.AssistantConcurrency()
    with guard.slot(1):
        with pytest.raises(assistant_service.AssistantError) as duplicate:
            with guard.slot(1):
                pytest.fail("Pedido duplicado foi aceito")
        assert duplicate.value.status_code == 429
        with guard.slot(2), guard.slot(3), guard.slot(4):
            with pytest.raises(assistant_service.AssistantError):
                with guard.slot(5):
                    pytest.fail("Limite global não foi respeitado")
    with pytest.raises(ValueError):
        with guard.slot(1):
            raise ValueError("fixture")
    with guard.slot(1):
        pass
