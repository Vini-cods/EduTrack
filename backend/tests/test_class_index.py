"""Unicidade de aulas na persistência e migração sem remoção de histórico."""

from datetime import datetime

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, text
from sqlalchemy.dialects import mssql, postgresql, sqlite
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateIndex

from app.db.base import Base
from app.models import CalendarEvent, Subject, User
from app.models.calendar_event import EventCategory
from app.services import calendar_event_service
from tests.conftest import TestingSessionLocal
from tests.test_study_session_migration import migration_database

INDEX_NAME = "uq_calendar_classes_subject_interval"
START = datetime(2026, 10, 12, 10)
END = datetime(2026, 10, 12, 12)


def test_database_rejects_duplicate_classes_without_service_but_preserves_other_events(academic_data):
    owner, other = academic_data["owner"], academic_data["other"]
    common = {"user_id": owner["user_id"], "subject_id": owner["subject_id"], "title": "Aula",
              "category": EventCategory.AULA, "start_datetime": START, "end_datetime": END}
    with TestingSessionLocal() as db:
        db.add(CalendarEvent(**common))
        db.commit()
        db.add(CalendarEvent(**common))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        assert db.query(CalendarEvent).count() == 1
        # Outro proprietário, outra disciplina, eventos livres e outras categorias
        # mantêm a semântica anterior; somente aulas completas entram no índice.
        allowed = [
            {"user_id": other["user_id"], "subject_id": other["subject_id"]},
            {"subject_id": owner["alternate_subject_id"]},
            {"subject_id": None}, {"subject_id": None},
            {"end_datetime": None}, {"end_datetime": None},
            *[{"category": category} for category in EventCategory if category != EventCategory.AULA for _ in range(2)],
        ]
        for changes in allowed:
            db.add(CalendarEvent(**{**common, **changes}))
        db.commit()
        assert db.query(CalendarEvent).count() == 1 + len(allowed)


def test_constraint_race_returns_409_and_rolls_back_entire_series(client, academic_data, monkeypatch):
    owner = academic_data["owner"]
    headers = owner["headers"]
    url = "/api/v1/calendar-events/"
    common = {"title": "Aula", "category": "aula", "subject_id": owner["subject_id"]}
    existing = client.post(url, headers=headers, json={**common, "start_datetime": "2026-10-19T10:00:00", "end_datetime": "2026-10-19T12:00:00"})
    assert existing.status_code == 201
    # Simula o interleaving em que duas requisições passam pela verificação
    # antecipada antes da outra transação confirmar a mesma chave.
    monkeypatch.setattr(calendar_event_service, "_validate_class_duplicates", lambda *args, **kwargs: None)
    failed = client.post(url, headers=headers, json={**common, "start_datetime": "2026-10-12T10:00:00", "end_datetime": "2026-10-12T12:00:00",
                                                    "recurrence": {"type": "weekly", "days_of_week": [0], "until": "2026-10-26"}})
    assert failed.status_code == 409
    assert "mesma data e horário" in failed.json()["detail"]
    listed = client.get(url, headers=headers).json()
    assert [item["id"] for item in listed] == [existing.json()["events"][0]["id"]]
    # A sessão permanece utilizável após rollback; gravação seguinte funciona.
    assert client.post(url, headers=headers, json={**common, "start_datetime": "2026-10-12T10:00:00", "end_datetime": "2026-10-12T12:00:00"}).status_code == 201


def test_constraint_race_on_update_preserves_occurrence(client, academic_data, monkeypatch):
    owner = academic_data["owner"]
    url = "/api/v1/calendar-events/"
    common = {"title": "Aula", "category": "aula", "subject_id": owner["subject_id"]}
    events = [client.post(url, headers=owner["headers"], json={**common, "start_datetime": f"2026-10-{day}T10:00:00", "end_datetime": f"2026-10-{day}T12:00:00"}).json()["events"][0]
              for day in (12, 19)]
    monkeypatch.setattr(calendar_event_service, "_validate_class_duplicates", lambda *args, **kwargs: None)
    failed = client.put(f"{url}{events[0]['id']}", headers=owner["headers"],
                        json={"start_datetime": events[1]["start_datetime"], "end_datetime": events[1]["end_datetime"]})
    assert failed.status_code == 409
    saved = client.get(url, headers=owner["headers"]).json()
    assert [item["start_datetime"] for item in saved] == [item["start_datetime"] for item in events]


def test_partial_index_compiles_for_sqlite_sql_server_and_postgresql():
    index = next(index for index in CalendarEvent.__table__.indexes if index.name == INDEX_NAME)
    for dialect in (sqlite.dialect(), mssql.dialect(), postgresql.dialect()):
        compiled = str(CreateIndex(index).compile(dialect=dialect))
        assert "CREATE UNIQUE INDEX" in compiled
        assert "WHERE category = 'AULA' AND subject_id IS NOT NULL AND end_datetime IS NOT NULL" in compiled


def test_class_index_upgrade_downgrade_matches_metadata_and_preserves_rows(migration_database):
    engine, config = migration_database
    command.upgrade(config, "d7a42be19c30")
    with Session(engine) as db:
        user = User(name="Aluno", email="class-index@example.com", hashed_password="not-used")
        db.add(user)
        db.flush()
        subject = Subject(user_id=user.id, name="Algoritmos")
        db.add(subject)
        db.flush()
        common = {"user_id": user.id, "subject_id": subject.id, "title": "Aula", "category": EventCategory.AULA,
                  "start_datetime": START, "end_datetime": END}
        db.add(CalendarEvent(**common))
        db.commit()
    command.upgrade(config, "head")
    assert INDEX_NAME in {index["name"] for index in inspect(engine).get_indexes("calendar_events")}
    with engine.connect() as connection:
        assert compare_metadata(MigrationContext.configure(connection, opts={"compare_type": True}), Base.metadata) == []
    with Session(engine) as db:
        assert db.query(CalendarEvent).one().title == "Aula"
        db.add(CalendarEvent(**common))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
    command.downgrade(config, "d7a42be19c30")
    assert INDEX_NAME not in {index["name"] for index in inspect(engine).get_indexes("calendar_events")}
    with Session(engine) as db:
        assert db.query(CalendarEvent).count() == 1
        db.add(CalendarEvent(**common))
        db.commit()
        assert db.query(CalendarEvent).count() == 2


def test_class_index_migration_reports_legacy_duplicates_without_changing_rows(migration_database):
    engine, config = migration_database
    command.upgrade(config, "d7a42be19c30")
    with Session(engine) as db:
        user = User(name="Aluno", email="class-duplicates@example.com", hashed_password="not-used")
        db.add(user)
        db.flush()
        subject = Subject(user_id=user.id, name="Algoritmos")
        db.add(subject)
        db.flush()
        common = {"user_id": user.id, "subject_id": subject.id, "title": "Histórico", "category": EventCategory.AULA,
                  "start_datetime": START, "end_datetime": END}
        db.add_all([CalendarEvent(**common), CalendarEvent(**common)])
        db.commit()
    with pytest.raises(RuntimeError, match="remova explicitamente as ocorrências extras"):
        command.upgrade(config, "head")
    assert INDEX_NAME not in {index["name"] for index in inspect(engine).get_indexes("calendar_events")}
    with engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == "d7a42be19c30"
        rows = connection.execute(text("SELECT title, category, start_datetime, end_datetime FROM calendar_events ORDER BY id")).all()
        assert len(rows) == 2
        assert rows[0] == rows[1]
