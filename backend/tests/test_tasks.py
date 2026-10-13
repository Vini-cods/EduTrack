"""Testes de tarefas (Task): CRUD, priority/estimated_hours, status e isolamento."""

from tests.conftest import make_auth_headers


def test_create_task_minimal(client, auth_headers, subject):
    resp = client.post("/api/v1/tasks/", json={"title": "Ler capítulo 1", "subject_id": subject["id"]}, headers=auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pendente"
    assert body["priority"] == "media"
    assert body["estimated_hours"] is None


def test_create_task_with_priority_and_estimated_hours(client, auth_headers, subject):
    resp = client.post(
        "/api/v1/tasks/",
        json={
            "title": "Estudar Árvores Binárias",
            "subject_id": subject["id"],
            "priority": "alta",
            "estimated_hours": 2.5,
            "due_date": "2026-12-01",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["priority"] == "alta"
    assert body["estimated_hours"] == 2.5


def test_create_task_invalid_priority_returns_422(client, auth_headers, subject):
    resp = client.post(
        "/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"], "priority": "inexistente"}, headers=auth_headers
    )
    assert resp.status_code == 422


def test_create_task_zero_estimated_hours_returns_422(client, auth_headers, subject):
    resp = client.post(
        "/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"], "estimated_hours": 0}, headers=auth_headers
    )
    assert resp.status_code == 422


def test_create_task_invalid_subject_returns_404(client, auth_headers):
    resp = client.post("/api/v1/tasks/", json={"title": "T", "subject_id": 999999}, headers=auth_headers)
    assert resp.status_code == 404


def test_list_all_tasks_includes_subject_name(client, auth_headers, subject):
    client.post("/api/v1/tasks/", json={"title": "T1", "subject_id": subject["id"]}, headers=auth_headers)
    resp = client.get("/api/v1/tasks/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()[0]["subject_name"] == subject["name"]


def test_list_tasks_by_subject(client, auth_headers, subject):
    client.post("/api/v1/tasks/", json={"title": "T1", "subject_id": subject["id"]}, headers=auth_headers)
    resp = client.get(f"/api/v1/tasks/subject/{subject['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_update_task_status(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers).json()
    resp = client.patch(f"/api/v1/tasks/{task['id']}/status", json={"status": "concluida"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "concluida"


def test_update_task_priority_and_hours_via_put(client, auth_headers, subject):
    """Regressão: PUT precisa aceitar priority/estimated_hours (esqueci isso na primeira versão do schema)."""
    task = client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers).json()
    resp = client.put(f"/api/v1/tasks/{task['id']}", json={"priority": "urgente", "estimated_hours": 3.0}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["priority"] == "urgente"
    assert resp.json()["estimated_hours"] == 3.0


def test_delete_task(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers).json()
    resp = client.delete(f"/api/v1/tasks/{task['id']}", headers=auth_headers)
    assert resp.status_code == 204
    assert len(client.get("/api/v1/tasks/", headers=auth_headers).json()) == 0


def test_delete_nonexistent_task_returns_404(client, auth_headers):
    resp = client.delete("/api/v1/tasks/999999", headers=auth_headers)
    assert resp.status_code == 404


def test_tasks_ordered_by_due_date_nulls_last(client, auth_headers, subject):
    client.post("/api/v1/tasks/", json={"title": "Sem prazo", "subject_id": subject["id"]}, headers=auth_headers)
    client.post("/api/v1/tasks/", json={"title": "Com prazo", "subject_id": subject["id"], "due_date": "2026-10-01"}, headers=auth_headers)
    resp = client.get("/api/v1/tasks/", headers=auth_headers)
    titles = [t["title"] for t in resp.json()]
    assert titles == ["Com prazo", "Sem prazo"]


def test_user_cannot_see_other_users_tasks(client, auth_headers, subject):
    client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers)
    other_headers = make_auth_headers(client, "outro-task@example.com")
    resp = client.get("/api/v1/tasks/", headers=other_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_user_cannot_update_other_users_task(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers).json()
    other_headers = make_auth_headers(client, "outro-task2@example.com")
    resp = client.patch(f"/api/v1/tasks/{task['id']}/status", json={"status": "concluida"}, headers=other_headers)
    assert resp.status_code == 404


def test_user_cannot_create_task_in_other_users_subject(client, auth_headers, subject):
    other_headers = make_auth_headers(client, "outro-task3@example.com")
    resp = client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=other_headers)
    assert resp.status_code == 404


def test_planner_task_rejects_blank_title_and_non_finite_estimates(client, auth_headers, subject):
    for invalid in ({"title": "   "}, {"estimated_hours": "NaN"}, {"estimated_hours": "Infinity"}):
        payload = {"title": "Revisar grafos", "subject_id": subject["id"], **invalid}
        assert client.post("/api/v1/tasks/", json=payload, headers=auth_headers).status_code == 422
    assert client.get("/api/v1/tasks/", headers=auth_headers).json() == []


def test_task_partial_update_rejects_null_required_fields_and_keeps_data(client, auth_headers, subject):
    task = client.post(
        "/api/v1/tasks/",
        json={"title": "  Revisar grafos  ", "subject_id": subject["id"], "estimated_hours": 2},
        headers=auth_headers,
    ).json()
    assert task["title"] == "Revisar grafos"
    for invalid in ({"title": None}, {"subject_id": None}, {"status": None}, {"priority": None}, {"estimated_hours": "NaN"}):
        assert client.put(f"/api/v1/tasks/{task['id']}", json=invalid, headers=auth_headers).status_code == 422
    saved = client.get(f"/api/v1/tasks/{task['id']}", headers=auth_headers).json()
    assert saved["title"] == task["title"]
    assert saved["estimated_hours"] == 2
    # Limpar dados opcionais continua sendo uma atualização válida.
    cleared = client.put(
        f"/api/v1/tasks/{task['id']}", json={"estimated_hours": None, "due_date": None}, headers=auth_headers
    )
    assert cleared.status_code == 200
    assert cleared.json()["estimated_hours"] is None


def test_moving_task_updates_planning_but_preserves_execution_context(client, auth_headers, subject):
    other_subject = client.post("/api/v1/subjects/", json={"name": "Redes"}, headers=auth_headers).json()
    task = client.post("/api/v1/tasks/", json={"title": "Revisar", "subject_id": subject["id"]}, headers=auth_headers).json()
    client.post(
        "/api/v1/calendar-events/",
        json={"title": task["title"], "category": "estudo", "task_id": task["id"], "start_datetime": "2026-10-12T10:00:00"},
        headers=auth_headers,
    )
    session = client.post("/api/v1/study-sessions/", json={"task_id": task["id"]}, headers=auth_headers).json()
    client.patch(f"/api/v1/study-sessions/{session['id']}/stop", json={}, headers=auth_headers)

    moved = client.put(f"/api/v1/tasks/{task['id']}", json={"subject_id": other_subject["id"]}, headers=auth_headers)
    assert moved.status_code == 200
    assert moved.json()["subject_id"] == other_subject["id"]
    events = client.get("/api/v1/calendar-events/", headers=auth_headers).json()
    assert events[0]["subject_id"] == other_subject["id"]
    assert events[0]["subject_name"] == other_subject["name"]
    history = client.get("/api/v1/study-sessions/", headers=auth_headers).json()
    assert history[0]["subject_id"] == subject["id"]
    assert history[0]["subject_name"] == subject["name"]
    next_session = client.post("/api/v1/study-sessions/", json={"task_id": task["id"]}, headers=auth_headers)
    assert next_session.status_code == 201
    assert next_session.json()["subject_id"] == other_subject["id"]


def test_cannot_move_task_into_another_users_subject(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "Revisar", "subject_id": subject["id"]}, headers=auth_headers).json()
    other_headers = make_auth_headers(client, "task-move-outsider@example.com")
    other_subject = client.post("/api/v1/subjects/", json={"name": "Privada"}, headers=other_headers).json()
    invalid = client.put(f"/api/v1/tasks/{task['id']}", json={"subject_id": other_subject["id"], "title": "Não salvar"}, headers=auth_headers)
    assert invalid.status_code == 404
    saved = client.get(f"/api/v1/tasks/{task['id']}", headers=auth_headers).json()
    assert saved["subject_id"] == subject["id"]
    assert saved["title"] == task["title"]
