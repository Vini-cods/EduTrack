"""Grade semanal reutiliza ocorrências de CalendarEvent, sem duplicar disciplinas."""

from app.models import CalendarEvent, Material, Note, StudySession, Subject, Task
from tests.conftest import TestingSessionLocal


def test_subject_metadata_round_trips_and_partial_dates_are_validated(client, academic_data):
    headers = academic_data["owner"]["headers"]
    payload = {"name": "  Banco de Dados  ", "professor": "Ana Silva", "workload_hours": 80,
               "start_date": "2026-08-03", "end_date": "2026-12-18", "color": "#9A2B2F"}
    created = client.post("/api/v1/subjects/", headers=headers, json=payload)
    assert created.status_code == 201
    subject_id = created.json()["id"]
    fetched = client.get(f"/api/v1/subjects/{subject_id}", headers=headers).json()
    listed = next(item for item in client.get("/api/v1/subjects/", headers=headers).json() if item["id"] == subject_id)
    for response in (fetched, listed):
        assert response["name"] == "Banco de Dados"
        assert response["professor"] == "Ana Silva"
        assert response["workload_hours"] == 80
        assert response["start_date"] == "2026-08-03"
        assert response["end_date"] == "2026-12-18"
    invalid = client.put(f"/api/v1/subjects/{subject_id}", headers=headers, json={"end_date": "2026-07-01"})
    assert invalid.status_code == 422
    assert client.get(f"/api/v1/subjects/{subject_id}", headers=headers).json()["end_date"] == "2026-12-18"
    edited = client.put(f"/api/v1/subjects/{subject_id}", headers=headers,
                        json={"name": "Banco de Dados II", "professor": None, "workload_hours": 120, "start_date": None})
    assert edited.status_code == 200
    assert edited.json()["professor"] is None
    assert edited.json()["start_date"] is None
    assert edited.json()["end_date"] == "2026-12-18"


def test_subject_write_validation_and_ownership(client, academic_data):
    owner, other = academic_data["owner"], academic_data["other"]
    for invalid in ({"name": " "}, {"name": None}, {"color": "red"}, {"workload_hours": -1},
                    {"workload_hours": 1.5}, {"workload_hours": 2001},
                    {"start_date": "2026-12-20", "end_date": "2026-12-19"}):
        assert client.put(f"/api/v1/subjects/{owner['subject_id']}", headers=owner["headers"], json=invalid).status_code == 422
    assert client.put(f"/api/v1/subjects/{owner['subject_id']}", headers=other["headers"],
                      json={"name": "Indevida"}).status_code == 404
    assert client.delete(f"/api/v1/subjects/{owner['subject_id']}", headers=other["headers"]).status_code == 404
    assert client.get(f"/api/v1/subjects/{owner['subject_id']}", headers=owner["headers"]).status_code == 200


def test_delete_subject_preserves_history_and_notes_but_removes_owned_tasks_materials(client, academic_data):
    owner, other = academic_data["owner"], academic_data["other"]
    with TestingSessionLocal() as db:
        material = Material(user_id=owner["user_id"], subject_id=owner["subject_id"], title="Livro")
        note = Note(user_id=owner["user_id"], subject_id=owner["subject_id"], task_id=owner["task_id"],
                    study_session_id=owner["session_id"], title="Resumo", content="Conteúdo preservado")
        db.add_all([material, note])
        db.commit()
        material_id, note_id = material.id, note.id
    event = client.post("/api/v1/calendar-events/", headers=owner["headers"],
                        json={"title": "Aula histórica", "category": "aula", "subject_id": owner["subject_id"],
                              "task_id": owner["task_id"], "start_datetime": "2026-10-12T10:00:00"}).json()["events"][0]
    assert client.delete(f"/api/v1/subjects/{owner['subject_id']}", headers=owner["headers"]).status_code == 204
    with TestingSessionLocal() as db:
        assert db.get(Subject, owner["subject_id"]) is None
        assert db.get(Task, owner["task_id"]) is None
        assert db.get(Material, material_id) is None
        session = db.get(StudySession, owner["session_id"])
        assert session.subject_id is None and session.task_id is None
        assert session.accumulated_seconds == 1800
        saved_note = db.get(Note, note_id)
        assert saved_note.content == "Conteúdo preservado"
        assert saved_note.subject_id is None and saved_note.task_id is None
        assert saved_note.study_session_id == session.id
        saved_event = db.get(CalendarEvent, event["id"])
        assert saved_event.subject_id is None and saved_event.task_id is None
        assert db.get(Subject, other["subject_id"]) is not None
        assert db.get(Task, other["task_id"]) is not None


def _class(subject_id, **overrides):
    return {"title": "Aula", "category": "aula", "subject_id": subject_id,
            "start_datetime": "2026-10-12T10:00:00", "end_datetime": "2026-10-12T12:00:00", **overrides}


def test_weekly_grade_uses_unique_weekdays_and_filters_by_subject_category(client, academic_data):
    owner = academic_data["owner"]
    headers = owner["headers"]
    created = client.post("/api/v1/calendar-events/", headers=headers,
                          json=_class(owner["subject_id"], recurrence={"type": "weekly", "days_of_week": [2, 0, 0], "until": "2026-10-21"}))
    assert created.status_code == 201
    assert [item["start_datetime"][:10] for item in created.json()["events"]] == ["2026-10-12", "2026-10-14", "2026-10-19", "2026-10-21"]
    assert len({item["recurrence_group_id"] for item in created.json()["events"]}) == 1
    assert client.post("/api/v1/calendar-events/", headers=headers,
                       json=_class(owner["alternate_subject_id"])).status_code == 201
    assert client.post("/api/v1/calendar-events/", headers=headers,
                       json=_class(owner["subject_id"], category="estudo")).status_code == 201
    listed = client.get("/api/v1/calendar-events/", headers=headers,
                        params={"subject_id": owner["subject_id"], "category": "aula"}).json()
    assert len(listed) == 4
    assert all(item["category"] == "aula" and item["subject_id"] == owner["subject_id"] for item in listed)
    assert client.get("/api/v1/calendar-events/", headers=academic_data["other"]["headers"],
                      params={"subject_id": owner["subject_id"], "category": "aula"}).json() == []


def test_grade_duplicate_is_rejected_before_inserting_any_occurrence(client, academic_data):
    owner = academic_data["owner"]
    headers = owner["headers"]
    duplicate = _class(owner["subject_id"], start_datetime="2026-10-19T10:00:00", end_datetime="2026-10-19T12:00:00")
    existing = client.post("/api/v1/calendar-events/", headers=headers, json=duplicate)
    assert existing.status_code == 201
    requested = _class(owner["subject_id"], recurrence={"type": "weekly", "days_of_week": [0], "until": "2026-10-26"})
    failed = client.post("/api/v1/calendar-events/", headers=headers, json=requested)
    assert failed.status_code == 409
    assert "mesma data e horário" in failed.json()["detail"]
    listed = client.get("/api/v1/calendar-events/", headers=headers).json()
    assert [item["id"] for item in listed] == [existing.json()["events"][0]["id"]]
    assert client.post("/api/v1/calendar-events/", headers=headers, json=duplicate).status_code == 409


def test_grade_limits_and_invalid_weekdays_leave_database_unchanged(client, academic_data):
    owner = academic_data["owner"]
    for recurrence in (
        {"type": "daily", "until": "2027-10-14"},
        {"type": "daily", "until": "2027-08-01"},  # >260 ocorrências, sem truncamento silencioso.
        {"type": "weekly", "days_of_week": [7], "until": "2026-11-01"},
        {"type": "weekly", "days_of_week": [], "until": "2026-11-01"},
    ):
        response = client.post("/api/v1/calendar-events/", headers=owner["headers"], json=_class(owner["subject_id"], recurrence=recurrence))
        assert response.status_code == 422
    assert client.get("/api/v1/calendar-events/", headers=owner["headers"]).json() == []


def test_edit_class_occurrence_checks_duplicates_and_series_delete_is_isolated(client, academic_data):
    owner, other = academic_data["owner"], academic_data["other"]
    created = client.post("/api/v1/calendar-events/", headers=owner["headers"],
                          json=_class(owner["subject_id"], recurrence={"type": "weekly", "days_of_week": [0], "until": "2026-10-19"})).json()
    first, second = created["events"]
    assert client.put(f"/api/v1/calendar-events/{first['id']}", headers=owner["headers"],
                      json={"location": "Sala 10"}).status_code == 200
    response = client.put(f"/api/v1/calendar-events/{first['id']}", headers=owner["headers"],
                          json={"start_datetime": second["start_datetime"], "end_datetime": second["end_datetime"]})
    assert response.status_code == 409
    saved = client.get("/api/v1/calendar-events/", headers=owner["headers"]).json()
    assert saved[0]["start_datetime"] == first["start_datetime"]
    assert saved[0]["location"] == "Sala 10"
    assert client.delete(f"/api/v1/calendar-events/series/{created['recurrence_group_id']}", headers=other["headers"]).status_code == 404
    assert client.post("/api/v1/calendar-events/", headers=other["headers"], json=_class(owner["subject_id"])).status_code == 404
    assert client.delete(f"/api/v1/calendar-events/series/{created['recurrence_group_id']}", headers=owner["headers"]).status_code == 204
    assert client.get("/api/v1/calendar-events/", headers=owner["headers"]).json() == []
