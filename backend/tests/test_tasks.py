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


def test_moving_task_with_conflicting_class_preserves_all_contexts_and_can_be_retried(client, academic_data):
    owner, other = academic_data["owner"], academic_data["other"]
    headers = owner["headers"]
    task_url = f"/api/v1/tasks/{owner['task_id']}"
    original_task = client.get(task_url, headers=headers).json()
    common = {"title": "Aula vinculada", "category": "aula", "task_id": owner["task_id"]}
    for day in (2, 9):
        created = client.post("/api/v1/calendar-events/", headers=headers,
                              json={**common, "start_datetime": f"2026-11-{day:02}T14:00:00",
                                    "end_datetime": f"2026-11-{day:02}T15:00:00"})
        assert created.status_code == 201
    conflict = client.post("/api/v1/calendar-events/", headers=headers,
                           json={"title": "Aula já cadastrada", "category": "aula",
                                 "subject_id": owner["alternate_subject_id"],
                                 "start_datetime": "2026-11-09T14:00:00", "end_datetime": "2026-11-09T15:00:00"}).json()["events"][0]
    note = client.post("/api/v1/notes/", headers=headers,
                       json={"title": "Conteúdo preservado", "task_id": owner["task_id"]}).json()
    assessments_url = f"/api/v1/subjects/{owner['subject_id']}/assessments"
    assert client.post(assessments_url, headers=headers,
                       json={"name": "Resultado preservado", "score": 8, "task_id": owner["task_id"]}).status_code == 201
    assert client.post("/api/v1/calendar-events/", headers=other["headers"],
                       json={**common, "task_id": other["task_id"], "start_datetime": "2026-11-09T14:00:00",
                             "end_datetime": "2026-11-09T15:00:00"}).status_code == 201
    original_events = client.get("/api/v1/calendar-events/", headers=headers).json()
    other_events = client.get("/api/v1/calendar-events/", headers=other["headers"]).json()
    original_assessments = client.get(assessments_url, headers=headers).json()

    response = client.put(task_url, headers=headers,
                          json={"subject_id": owner["alternate_subject_id"], "title": "Não salvar", "status": "concluida"})
    assert response.status_code == 409
    assert "mesma data e horário" in response.json()["detail"]
    assert client.get(task_url, headers=headers).json() == original_task
    assert client.get("/api/v1/calendar-events/", headers=headers).json() == original_events
    assert client.get(f"/api/v1/notes/{note['id']}", headers=headers).json() == note
    assert client.get(assessments_url, headers=headers).json() == original_assessments
    assert client.get("/api/v1/calendar-events/", headers=other["headers"]).json() == other_events

    assert client.delete(f"/api/v1/calendar-events/{conflict['id']}", headers=headers).status_code == 204
    retried = client.put(task_url, headers=headers, json={"subject_id": owner["alternate_subject_id"]})
    assert retried.status_code == 200
    assert retried.json()["subject_id"] == owner["alternate_subject_id"]
    assert all(event["subject_id"] == owner["alternate_subject_id"]
               for event in client.get("/api/v1/calendar-events/", headers=headers).json())
    assert client.get(f"/api/v1/notes/{note['id']}", headers=headers).json()["subject_id"] == owner["alternate_subject_id"]
    assessment = client.get(assessments_url, headers=headers).json()["items"][0]
    assert assessment["task_id"] is None and assessment["score"] == 8
    assert client.get("/api/v1/calendar-events/", headers=other["headers"]).json() == other_events
