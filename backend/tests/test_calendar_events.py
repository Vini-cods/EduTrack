"""Testes de eventos de calendário: evento único, recorrência, vínculo com task, ownership."""

from tests.conftest import make_auth_headers


def test_create_single_event(client, auth_headers):
    resp = client.post(
        "/api/v1/calendar-events/",
        json={"title": "Reunião do grupo", "start_datetime": "2026-09-20T14:00:00", "end_datetime": "2026-09-20T15:00:00"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["events"]) == 1
    assert body["recurrence_group_id"] is None


def test_create_recurring_weekly_event_generates_correct_occurrences(client, auth_headers, subject):
    """14/09/2026 é segunda; até 03/10/2026, seg+qua caem em: 14,16,21,23,28,30/09 = 6 ocorrências."""
    resp = client.post(
        "/api/v1/calendar-events/",
        json={
            "title": "Aula",
            "category": "aula",
            "subject_id": subject["id"],
            "start_datetime": "2026-09-14T10:00:00",
            "end_datetime": "2026-09-14T12:00:00",
            "recurrence": {"type": "weekly", "days_of_week": [0, 2], "until": "2026-10-03"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["events"]) == 6
    group_id = body["recurrence_group_id"]
    assert group_id is not None
    assert all(e["recurrence_group_id"] == group_id for e in body["events"])


def test_recurrence_until_before_start_returns_422(client, auth_headers):
    resp = client.post(
        "/api/v1/calendar-events/",
        json={
            "title": "x",
            "start_datetime": "2026-09-20T10:00:00",
            "recurrence": {"type": "weekly", "days_of_week": [0], "until": "2026-09-01"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_event_with_invalid_subject_returns_404(client, auth_headers):
    resp = client.post(
        "/api/v1/calendar-events/", json={"title": "x", "subject_id": 999999, "start_datetime": "2026-09-20T10:00:00"}, headers=auth_headers
    )
    assert resp.status_code == 404


def test_create_event_with_invalid_task_returns_404(client, auth_headers):
    resp = client.post(
        "/api/v1/calendar-events/", json={"title": "x", "task_id": 999999, "start_datetime": "2026-09-20T10:00:00"}, headers=auth_headers
    )
    assert resp.status_code == 404


def test_create_event_linked_to_task(client, auth_headers, subject):
    task = client.post(
        "/api/v1/tasks/", json={"title": "Estudar TCP/IP", "subject_id": subject["id"], "estimated_hours": 1}, headers=auth_headers
    ).json()
    resp = client.post(
        "/api/v1/calendar-events/",
        json={
            "title": task["title"],
            "category": "estudo",
            "task_id": task["id"],
            "subject_id": subject["id"],
            "start_datetime": "2026-09-18T19:00:00",
            "end_datetime": "2026-09-18T20:00:00",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["events"][0]["task_id"] == task["id"]

    listed = client.get(
        "/api/v1/calendar-events/", params={"start": "2026-09-18T00:00:00", "end": "2026-09-18T23:59:59"}, headers=auth_headers
    ).json()
    assert listed[0]["task_title"] == "Estudar TCP/IP"


def test_deleting_linked_task_sets_null_not_delete_event(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers).json()
    client.post(
        "/api/v1/calendar-events/",
        json={"title": "T", "task_id": task["id"], "start_datetime": "2026-09-20T10:00:00"},
        headers=auth_headers,
    )
    client.delete(f"/api/v1/tasks/{task['id']}", headers=auth_headers)

    events = client.get("/api/v1/calendar-events/", headers=auth_headers).json()
    assert len(events) == 1
    assert events[0]["task_id"] is None


def test_list_events_filtered_by_date_range(client, auth_headers):
    client.post("/api/v1/calendar-events/", json={"title": "Dentro", "start_datetime": "2026-09-20T10:00:00"}, headers=auth_headers)
    client.post("/api/v1/calendar-events/", json={"title": "Fora", "start_datetime": "2026-11-20T10:00:00"}, headers=auth_headers)
    resp = client.get(
        "/api/v1/calendar-events/", params={"start": "2026-09-01T00:00:00", "end": "2026-09-30T23:59:59"}, headers=auth_headers
    )
    titles = [e["title"] for e in resp.json()]
    assert titles == ["Dentro"]


def test_update_single_occurrence(client, auth_headers):
    created = client.post(
        "/api/v1/calendar-events/", json={"title": "T", "start_datetime": "2026-09-20T10:00:00"}, headers=auth_headers
    ).json()
    event_id = created["events"][0]["id"]
    resp = client.put(f"/api/v1/calendar-events/{event_id}", json={"location": "Sala 305"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["location"] == "Sala 305"


def test_delete_single_occurrence(client, auth_headers):
    created = client.post(
        "/api/v1/calendar-events/", json={"title": "T", "start_datetime": "2026-09-20T10:00:00"}, headers=auth_headers
    ).json()
    event_id = created["events"][0]["id"]
    resp = client.delete(f"/api/v1/calendar-events/{event_id}", headers=auth_headers)
    assert resp.status_code == 204


def test_delete_entire_series(client, auth_headers):
    created = client.post(
        "/api/v1/calendar-events/",
        json={
            "title": "Aula",
            "start_datetime": "2026-09-14T10:00:00",
            "recurrence": {"type": "weekly", "days_of_week": [0], "until": "2026-10-05"},
        },
        headers=auth_headers,
    ).json()
    group_id = created["recurrence_group_id"]
    assert len(created["events"]) > 1

    resp = client.delete(f"/api/v1/calendar-events/series/{group_id}", headers=auth_headers)
    assert resp.status_code == 204
    assert client.get("/api/v1/calendar-events/", headers=auth_headers).json() == []


def test_user_cannot_see_other_users_events(client, auth_headers):
    client.post("/api/v1/calendar-events/", json={"title": "T", "start_datetime": "2026-09-20T10:00:00"}, headers=auth_headers)
    other_headers = make_auth_headers(client, "outro-cal@example.com")
    resp = client.get("/api/v1/calendar-events/", headers=other_headers)
    assert resp.json() == []


def test_user_cannot_delete_other_users_event_series(client, auth_headers):
    created = client.post(
        "/api/v1/calendar-events/",
        json={
            "title": "Aula",
            "start_datetime": "2026-09-14T10:00:00",
            "recurrence": {"type": "weekly", "days_of_week": [0], "until": "2026-10-05"},
        },
        headers=auth_headers,
    ).json()
    other_headers = make_auth_headers(client, "outro-cal2@example.com")
    resp = client.delete(f"/api/v1/calendar-events/series/{created['recurrence_group_id']}", headers=other_headers)
    assert resp.status_code == 404
