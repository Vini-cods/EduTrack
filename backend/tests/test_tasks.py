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
