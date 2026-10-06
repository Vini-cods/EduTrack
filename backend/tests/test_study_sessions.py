"""
Testes de sessões de estudo (StudySession): start/pause/resume/stop com
tempo real decorrido, conflito de sessão dupla, cascatas e isolamento.
"""

import time

from tests.conftest import make_auth_headers


def test_no_active_session_initially(client, auth_headers):
    resp = client.get("/api/v1/study-sessions/active", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() is None


def test_start_session(client, auth_headers, subject):
    resp = client.post("/api/v1/study-sessions/", json={"subject_id": subject["id"]}, headers=auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "em_andamento"
    assert body["elapsed_seconds"] == 0


def test_cannot_start_second_session_while_one_active(client, auth_headers):
    client.post("/api/v1/study-sessions/", json={}, headers=auth_headers)
    resp = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers)
    assert resp.status_code == 409


def test_start_with_invalid_subject_returns_404(client, auth_headers):
    resp = client.post("/api/v1/study-sessions/", json={"subject_id": 999999}, headers=auth_headers)
    assert resp.status_code == 404


def test_start_with_invalid_task_returns_404(client, auth_headers):
    resp = client.post("/api/v1/study-sessions/", json={"task_id": 999999}, headers=auth_headers)
    assert resp.status_code == 404


def test_active_session_includes_subject_and_task_context(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "Estudar X", "subject_id": subject["id"]}, headers=auth_headers).json()
    client.post("/api/v1/study-sessions/", json={"subject_id": subject["id"], "task_id": task["id"]}, headers=auth_headers)
    resp = client.get("/api/v1/study-sessions/active", headers=auth_headers)
    assert resp.json()["subject_name"] == subject["name"]
    assert resp.json()["task_title"] == "Estudar X"


def test_pause_freezes_elapsed_time(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    time.sleep(1.2)
    resp = client.patch(f"/api/v1/study-sessions/{session['id']}/pause", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "pausada"
    elapsed_at_pause = resp.json()["elapsed_seconds"]
    assert elapsed_at_pause >= 1

    time.sleep(1)
    resp2 = client.get("/api/v1/study-sessions/active", headers=auth_headers)
    assert resp2.json()["elapsed_seconds"] == elapsed_at_pause, "tempo não deveria avançar enquanto pausada"


def test_pause_when_not_active_returns_404(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{session['id']}/pause", headers=auth_headers)
    resp = client.patch(f"/api/v1/study-sessions/{session['id']}/pause", headers=auth_headers)
    assert resp.status_code == 404


def test_resume_after_pause(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{session['id']}/pause", headers=auth_headers)
    resp = client.patch(f"/api/v1/study-sessions/{session['id']}/resume", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "em_andamento"


def test_resume_when_not_paused_returns_404(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    resp = client.patch(f"/api/v1/study-sessions/{session['id']}/resume", headers=auth_headers)
    assert resp.status_code == 404


def test_full_cycle_accumulates_time_across_pause_resume(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    time.sleep(1)
    paused = client.patch(f"/api/v1/study-sessions/{session['id']}/pause", headers=auth_headers).json()
    first_segment = paused["elapsed_seconds"]

    client.patch(f"/api/v1/study-sessions/{session['id']}/resume", headers=auth_headers)
    time.sleep(1)
    stopped = client.patch(
        f"/api/v1/study-sessions/{session['id']}/stop", json={"pomodoro_cycles_completed": 1}, headers=auth_headers
    ).json()

    assert stopped["status"] == "concluida"
    assert stopped["elapsed_seconds"] > first_segment, "o segundo segmento deveria somar ao total"
    assert stopped["ended_at"] is not None
    assert stopped["pomodoro_cycles_completed"] == 1


def test_actions_on_completed_session_return_404(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{session['id']}/stop", json={"pomodoro_cycles_completed": 0}, headers=auth_headers)

    for action in ("pause", "resume"):
        resp = client.patch(f"/api/v1/study-sessions/{session['id']}/{action}", headers=auth_headers)
        assert resp.status_code == 404
    resp = client.patch(f"/api/v1/study-sessions/{session['id']}/stop", json={"pomodoro_cycles_completed": 0}, headers=auth_headers)
    assert resp.status_code == 404


def test_active_session_is_null_after_stop(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{session['id']}/stop", json={"pomodoro_cycles_completed": 0}, headers=auth_headers)
    resp = client.get("/api/v1/study-sessions/active", headers=auth_headers)
    assert resp.json() is None


def test_history_lists_sessions_most_recent_first(client, auth_headers):
    s1 = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{s1['id']}/stop", json={"pomodoro_cycles_completed": 0}, headers=auth_headers)
    s2 = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{s2['id']}/stop", json={"pomodoro_cycles_completed": 0}, headers=auth_headers)

    resp = client.get("/api/v1/study-sessions/", headers=auth_headers)
    assert len(resp.json()) == 2
    assert resp.json()[0]["id"] == s2["id"]


def test_delete_session_from_history(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{session['id']}/stop", json={"pomodoro_cycles_completed": 0}, headers=auth_headers)
    resp = client.delete(f"/api/v1/study-sessions/{session['id']}", headers=auth_headers)
    assert resp.status_code == 204
    assert client.get("/api/v1/study-sessions/", headers=auth_headers).json() == []


def test_deleting_linked_task_sets_null_on_session(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers).json()
    session = client.post("/api/v1/study-sessions/", json={"task_id": task["id"]}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{session['id']}/stop", json={"pomodoro_cycles_completed": 0}, headers=auth_headers)

    client.delete(f"/api/v1/tasks/{task['id']}", headers=auth_headers)
    resp = client.get("/api/v1/study-sessions/", headers=auth_headers)
    assert resp.json()[0]["task_id"] is None


def test_user_cannot_control_other_users_session(client, auth_headers):
    session = client.post("/api/v1/study-sessions/", json={}, headers=auth_headers).json()
    other_headers = make_auth_headers(client, "outro-ss@example.com")

    assert client.patch(f"/api/v1/study-sessions/{session['id']}/pause", headers=other_headers).status_code == 404
    assert client.get("/api/v1/study-sessions/", headers=other_headers).json() == []
    assert client.get("/api/v1/study-sessions/active", headers=other_headers).json() is None

    # limpa a sessão do usuário original para não vazar entre testes
    client.patch(f"/api/v1/study-sessions/{session['id']}/stop", json={"pomodoro_cycles_completed": 0}, headers=auth_headers)
