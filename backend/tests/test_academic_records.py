import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import text
from sqlalchemy.orm import Query

from app.db.base import Base
from app.models.academic_record import SubjectSyllabus
from tests.test_study_session_migration import migration_database


def scope(academic_data):
    owner = academic_data["owner"]
    return "/api/v1/subjects/" + str(owner["subject_id"]), owner["headers"]


def test_syllabus_roundtrip_and_user_isolation(client, academic_data):
    url, headers = scope(academic_data)
    assert client.get(url + "/syllabus", headers=headers).json()["topics"] == ""
    payload = {"objectives": "Analisar algoritmos", "topics": "Grafos\nÁrvores", "bibliography": "Biblioteca"}
    response = client.put(url + "/syllabus", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["updated_at"].endswith("Z")
    for key, value in payload.items():
        assert client.get(url + "/syllabus", headers=headers).json()[key] == value
    other = academic_data["other"]["headers"]
    assert client.get(url + "/syllabus", headers=other).status_code == 404
    assert client.put(url + "/syllabus", json=payload, headers=other).status_code == 404
    assert client.put(url + "/syllabus", json={"topics": "x" * 20001}, headers=headers).status_code == 422


def test_first_syllabus_save_race_returns_conflict_and_keeps_committed_copy(client, academic_data, monkeypatch):
    url, headers = scope(academic_data)
    client.put(url + "/syllabus", json={"topics": "Versão confirmada"}, headers=headers)
    original_first = Query.first
    intercepted = False

    def concurrent_first(query):
        nonlocal intercepted
        if not intercepted and query.column_descriptions[0].get("entity") is SubjectSyllabus:
            intercepted = True
            # Simula SELECT vazio anterior ao INSERT confirmado pelo concorrente.
            return None
        return original_first(query)

    monkeypatch.setattr(Query, "first", concurrent_first)
    response = client.put(url + "/syllabus", json={"topics": "Outra versão"}, headers=headers)
    assert response.status_code == 409
    assert client.get(url + "/syllabus", headers=headers).json()["topics"] == "Versão confirmada"


def test_partial_weighted_mean_normalizes_scales_and_never_treats_missing_as_zero(client, academic_data):
    url, headers = scope(academic_data)
    endpoint = url + "/assessments"
    assert client.get(endpoint, headers=headers).json()["summary"]["partial_average"] is None
    for payload in [{"name": "P1", "score": 8, "weight": 2}, {"name": "Trabalho", "score": 50, "max_score": 100, "weight": 1}, {"name": "P2", "weight": 3}]:
        assert client.post(endpoint, headers=headers, json=payload).status_code == 201
    result = client.get(endpoint, headers=headers).json()
    assert result["summary"] == {"total_count": 3, "graded_count": 2, "total_weight": 6, "graded_weight": 3, "coverage_percent": 50, "partial_average": 7}
    item = result["items"][2]
    assert client.put(endpoint + "/" + str(item["id"]), headers=headers, json={"name": "P2", "score": 0, "weight": 3}).status_code == 200
    summary = client.get(endpoint, headers=headers).json()["summary"]
    assert summary["graded_count"] == 3 and summary["partial_average"] == 3.5 and summary["coverage_percent"] == 100


@pytest.mark.parametrize("payload", [{"name": " "}, {"name": "P", "score": -1}, {"name": "P", "score": 11}, {"name": "P", "weight": 0}, {"name": "P", "max_score": 0}, {"name": "P", "weight": 1001}, {"name": "P", "max_score": 10001}, {"name": "P", "score": "NaN"}])
def test_assessment_validation(client, academic_data, payload):
    url, headers = scope(academic_data)
    assert client.post(url + "/assessments", headers=headers, json=payload).status_code == 422


def test_ownership_update_delete_and_task_context(client, academic_data):
    url, headers = scope(academic_data)
    owner, other = academic_data["owner"], academic_data["other"]
    endpoint = url + "/assessments"
    for task_id in [other["task_id"], owner["alternate_task_id"]]:
        assert client.post(endpoint, headers=headers, json={"name": "P1", "task_id": task_id}).status_code == 422
    created = client.post(endpoint, headers=headers, json={"name": "P1", "task_id": owner["task_id"], "score": 9}).json()
    item_url = endpoint + "/" + str(created["id"])
    assert created["task_title"] == "owner Tarefa 0"
    assert client.get(endpoint, headers=other["headers"]).status_code == 404
    assert client.put(item_url, headers=other["headers"], json={"name": "Changed"}).status_code == 404
    assert client.delete(item_url, headers=other["headers"]).status_code == 404
    assert client.delete("/api/v1/tasks/" + str(owner["task_id"]), headers=headers).status_code == 204
    saved = client.get(endpoint, headers=headers).json()["items"][0]
    assert saved["score"] == 9 and saved["name"] == "P1" and saved["task_id"] is None
    assert client.delete(item_url, headers=headers).status_code == 204
    assert client.get(endpoint, headers=headers).json()["items"] == []


def test_task_move_detaches_grade_but_keeps_subject_history(client, academic_data):
    url, headers = scope(academic_data)
    owner = academic_data["owner"]
    endpoint = url + "/assessments"
    client.post(endpoint, headers=headers, json={"name": "P1", "task_id": owner["task_id"], "score": 8})
    response = client.put("/api/v1/tasks/" + str(owner["task_id"]), headers=headers, json={"subject_id": owner["alternate_subject_id"]})
    assert response.status_code == 200
    saved = client.get(endpoint, headers=headers).json()["items"][0]
    assert saved["task_id"] is None and saved["subject_id"] == owner["subject_id"] and saved["score"] == 8


def test_subject_delete_removes_owned_records_without_affecting_other_user(client, academic_data):
    url, headers = scope(academic_data)
    other = academic_data["other"]
    other_url = "/api/v1/subjects/" + str(other["subject_id"])
    for base, auth in [(url, headers), (other_url, other["headers"])]:
        client.post(base + "/assessments", headers=auth, json={"name": "P1", "score": 7})
        client.put(base + "/syllabus", headers=auth, json={"topics": "Grafos"})
    assert client.delete(url, headers=headers).status_code == 204
    assert client.get(other_url + "/assessments", headers=other["headers"]).json()["summary"]["partial_average"] == 7


def test_academic_migration_preserves_old_rows_and_matches_metadata(migration_database):
    engine, config = migration_database
    command.upgrade(config, "e6f38a91d420")
    with engine.begin() as db:
        db.execute(text("INSERT INTO users (id,email,name,hashed_password,is_active,created_at,updated_at) VALUES (1,'legacy@example.com','Legacy','unchanged',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
        db.execute(text("INSERT INTO subjects (id,user_id,name,created_at,updated_at) VALUES (1,1,'Grafos',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
    command.upgrade(config, "head")
    with engine.connect() as db:
        assert db.execute(text("SELECT hashed_password FROM users WHERE id=1")).scalar() == "unchanged"
        assert db.execute(text("SELECT name FROM subjects WHERE id=1")).scalar() == "Grafos"
        assert not list(db.execute(text("PRAGMA foreign_key_check")))
        assert compare_metadata(MigrationContext.configure(db), Base.metadata) == []
    engine.dispose()
