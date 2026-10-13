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


def test_study_block_derives_subject_from_task(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "Revisar grafos", "subject_id": subject["id"]}, headers=auth_headers).json()
    created = client.post(
        "/api/v1/calendar-events/",
        json={"title": task["title"], "category": "estudo", "task_id": task["id"], "start_datetime": "2026-10-12T10:00:00"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    assert created.json()["events"][0]["subject_id"] == subject["id"]
    listed = client.get("/api/v1/calendar-events/", headers=auth_headers).json()
    assert listed[0]["subject_name"] == subject["name"]


def test_study_block_rejects_mismatched_task_subject_on_create_and_update(client, auth_headers, subject):
    other_subject = client.post("/api/v1/subjects/", json={"name": "Redes"}, headers=auth_headers).json()
    task = client.post("/api/v1/tasks/", json={"title": "Revisar grafos", "subject_id": subject["id"]}, headers=auth_headers).json()
    payload = {"title": task["title"], "category": "estudo", "task_id": task["id"], "start_datetime": "2026-10-12T10:00:00"}
    invalid = client.post("/api/v1/calendar-events/", json={**payload, "subject_id": other_subject["id"]}, headers=auth_headers)
    assert invalid.status_code == 422
    assert client.get("/api/v1/calendar-events/", headers=auth_headers).json() == []

    event = client.post("/api/v1/calendar-events/", json=payload, headers=auth_headers).json()["events"][0]
    invalid = client.put(f"/api/v1/calendar-events/{event['id']}", json={"subject_id": other_subject["id"]}, headers=auth_headers)
    assert invalid.status_code == 422
    saved = client.get("/api/v1/calendar-events/", headers=auth_headers).json()[0]
    assert saved["task_id"] == task["id"]
    assert saved["subject_id"] == subject["id"]

    # Remover o vínculo explicitamente permite transformar o bloco em outro contexto.
    detached = client.put(
        f"/api/v1/calendar-events/{event['id']}",
        json={"task_id": None, "subject_id": other_subject["id"]},
        headers=auth_headers,
    )
    assert detached.status_code == 200
    assert detached.json()["task_id"] is None
    assert detached.json()["subject_id"] == other_subject["id"]


def test_replacing_only_task_derives_new_subject(client, auth_headers, subject):
    other_subject = client.post("/api/v1/subjects/", json={"name": "Redes"}, headers=auth_headers).json()
    tasks = [
        client.post("/api/v1/tasks/", json={"title": "Revisar", "subject_id": subject_id}, headers=auth_headers).json()
        for subject_id in (subject["id"], other_subject["id"])
    ]
    event = client.post(
        "/api/v1/calendar-events/",
        json={"title": "Revisar", "category": "estudo", "task_id": tasks[0]["id"], "start_datetime": "2026-10-12T10:00:00"},
        headers=auth_headers,
    ).json()["events"][0]
    updated = client.put(f"/api/v1/calendar-events/{event['id']}", json={"task_id": tasks[1]["id"]}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["subject_id"] == other_subject["id"]


def test_event_partial_update_validates_merged_interval_and_required_fields(client, auth_headers):
    event = client.post(
        "/api/v1/calendar-events/",
        json={"title": "Estudar", "start_datetime": "2026-10-12T10:00:00", "end_datetime": "2026-10-12T11:00:00"},
        headers=auth_headers,
    ).json()["events"][0]
    for invalid in (
        {"start_datetime": "2026-10-12T12:00:00"},
        {"end_datetime": "2026-10-12T09:00:00"},
        {"start_datetime": None},
        {"title": None},
        {"title": "   "},
        {"category": None},
    ):
        assert client.put(f"/api/v1/calendar-events/{event['id']}", json=invalid, headers=auth_headers).status_code == 422
    saved = client.get("/api/v1/calendar-events/", headers=auth_headers).json()[0]
    assert saved["start_datetime"] == event["start_datetime"]
    assert saved["end_datetime"] == event["end_datetime"]
    moved = client.put(
        f"/api/v1/calendar-events/{event['id']}",
        json={"start_datetime": "2026-10-12T12:00:00", "end_datetime": "2026-10-12T13:00:00"},
        headers=auth_headers,
    )
    assert moved.status_code == 200


def test_invalid_calendar_filters_and_mixed_timezone_return_422(client, auth_headers):
    for params in (
        {"start": "invalid-date"},
        {"end": "invalid-date"},
        {"start": "2026-10-13T00:00:00", "end": "2026-10-12T00:00:00"},
    ):
        assert client.get("/api/v1/calendar-events/", params=params, headers=auth_headers).status_code == 422
    mixed = client.post(
        "/api/v1/calendar-events/",
        json={"title": "Estudar", "start_datetime": "2026-10-12T10:00:00", "end_datetime": "2026-10-12T11:00:00Z"},
        headers=auth_headers,
    )
    assert mixed.status_code == 422


def test_recurrence_without_occurrences_is_rejected(client, auth_headers):
    # Segunda-feira, com recorrência apenas na terça e fim na própria segunda.
    invalid = client.post(
        "/api/v1/calendar-events/",
        json={"title": "Estudar", "start_datetime": "2026-10-12T10:00:00", "recurrence": {"type": "weekly", "days_of_week": [1], "until": "2026-10-12"}},
        headers=auth_headers,
    )
    assert invalid.status_code == 422
    assert client.get("/api/v1/calendar-events/", headers=auth_headers).json() == []


def test_user_cannot_link_or_update_other_users_planning_context(client, auth_headers, subject):
    task = client.post("/api/v1/tasks/", json={"title": "Revisar", "subject_id": subject["id"]}, headers=auth_headers).json()
    other_headers = make_auth_headers(client, "planner-outsider@example.com")
    own_event = client.post(
        "/api/v1/calendar-events/", json={"title": "Meu evento", "start_datetime": "2026-10-12T10:00:00"}, headers=other_headers
    ).json()["events"][0]
    for context in ({"subject_id": subject["id"]}, {"task_id": task["id"]}):
        assert client.post(
            "/api/v1/calendar-events/", json={"title": "Inválido", "start_datetime": "2026-10-12T10:00:00", **context}, headers=other_headers
        ).status_code == 404
        assert client.put(f"/api/v1/calendar-events/{own_event['id']}", json=context, headers=other_headers).status_code == 404
    listed = client.get("/api/v1/calendar-events/", headers=other_headers).json()
    assert listed[0]["task_id"] is None
    assert listed[0]["subject_id"] is None


def test_calendar_range_includes_overnight_study_overlap(client, auth_headers):
    for title, start, end in (
        ("Atravessa meia-noite", "2026-10-11T23:30:00", "2026-10-12T01:00:00"),
        ("Já terminou", "2026-10-11T22:00:00", "2026-10-11T23:00:00"),
        ("Amanhã", "2026-10-13T01:00:00", "2026-10-13T02:00:00"),
        ("Instante hoje", "2026-10-12T12:00:00", None),
    ):
        assert client.post(
            "/api/v1/calendar-events/",
            json={"title": title, "category": "estudo", "start_datetime": start, "end_datetime": end},
            headers=auth_headers,
        ).status_code == 201
    listed = client.get(
        "/api/v1/calendar-events/",
        params={"start": "2026-10-12T00:00:00", "end": "2026-10-12T23:59:59"},
        headers=auth_headers,
    )
    assert listed.status_code == 200
    assert [event["title"] for event in listed.json()] == ["Atravessa meia-noite", "Instante hoje"]
