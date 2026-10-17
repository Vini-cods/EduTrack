"""Testes do endpoint de dashboard (agregados de tarefas/disciplinas)."""

import pytest


def test_dashboard_empty_state(client, auth_headers):
    resp = client.get("/api/v1/dashboard/", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_subjects"] == 0
    assert body["total_tasks"] == 0
    assert body["subjects_progress"] == []


def test_dashboard_reflects_tasks_and_subjects(client, auth_headers):
    s1 = client.post("/api/v1/subjects/", json={"name": "A"}, headers=auth_headers).json()
    s2 = client.post("/api/v1/subjects/", json={"name": "B"}, headers=auth_headers).json()

    t1 = client.post("/api/v1/tasks/", json={"title": "T1", "subject_id": s1["id"]}, headers=auth_headers).json()
    client.post("/api/v1/tasks/", json={"title": "T2", "subject_id": s1["id"]}, headers=auth_headers)
    client.post("/api/v1/tasks/", json={"title": "T3", "subject_id": s2["id"]}, headers=auth_headers)
    client.patch(f"/api/v1/tasks/{t1['id']}/status", json={"status": "concluida"}, headers=auth_headers)

    resp = client.get("/api/v1/dashboard/", headers=auth_headers)
    body = resp.json()
    assert body["total_subjects"] == 2
    assert body["total_tasks"] == 3
    assert body["tasks_completed"] == 1
    assert len(body["subjects_progress"]) == 2


def test_dashboard_isolated_per_user(client, auth_headers, subject):
    from tests.conftest import make_auth_headers

    client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers)
    other_headers = make_auth_headers(client, "outro-dash@example.com")
    resp = client.get("/api/v1/dashboard/", headers=other_headers)
    assert resp.json()["total_tasks"] == 0


def test_dashboard_aggregates_statuses_and_keeps_empty_subjects_without_foreign_task_data(academic_data):
    from app.models import Subject, Task
    from app.services.dashboard_service import get_dashboard_metrics
    from tests.conftest import TestingSessionLocal

    owner, other = academic_data["owner"], academic_data["other"]
    with TestingSessionLocal() as db:
        db.query(Task).filter(Task.id == owner["alternate_task_id"]).update({"status": "em_andamento"})
        db.add_all([
            Subject(user_id=owner["user_id"], name="Sem tarefas"),
            Task(user_id=owner["user_id"], subject_id=owner["subject_id"], title="Concluída", status="concluida"),
            # Referência antiga inconsistente também não deve atravessar o isolamento.
            Task(user_id=other["user_id"], subject_id=owner["subject_id"], title="Privada", status="concluida"),
        ])
        db.commit()
        result = get_dashboard_metrics(db, owner["user_id"])
        assert result.total_subjects == 3
        assert (result.total_tasks, result.tasks_pending, result.tasks_in_progress, result.tasks_completed) == (3, 1, 1, 1)
        assert result.overall_progress == pytest.approx(100 / 3)
        assert result.subjects_progress[-1].total_tasks == 0
        assert result.subjects_progress[-1].progress == 0
        assert result.subjects_progress[0].total_tasks == 2
        assert result.subjects_progress[0].progress == 50


def test_dashboard_uses_one_query_independent_of_subject_count(academic_data):
    from sqlalchemy import event

    from app.models import Subject
    from app.services.dashboard_service import get_dashboard_metrics
    from tests.conftest import TestingSessionLocal, engine

    user_id = academic_data["owner"]["user_id"]
    with TestingSessionLocal() as db:
        db.add_all(Subject(user_id=user_id, name=f"Disciplina {index}") for index in range(50))
        db.commit()
        statements = []

        def count_selects(connection, cursor, statement, parameters, context, executemany):
            if statement.lstrip().upper().startswith("SELECT"):
                statements.append(statement)

        event.listen(engine, "before_cursor_execute", count_selects)
        try:
            result = get_dashboard_metrics(db, user_id)
        finally:
            event.remove(engine, "before_cursor_execute", count_selects)
        assert result.total_subjects == 52
        assert result.total_tasks == 2
        assert len(statements) == 1
