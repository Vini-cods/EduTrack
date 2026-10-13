"""Instalação limpa e migração incremental sem reescrever histórico."""

from datetime import datetime, timezone
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import Base
from app.models import CalendarEvent, Material, StudySession, Subject, Task, User
from app.models.study_session import StudySessionStatus


@pytest.fixture()
def migration_database(tmp_path, monkeypatch):
    database_path = tmp_path / "migration.db"
    monkeypatch.setattr(settings, "DB_ENGINE", "sqlite")
    monkeypatch.setattr(settings, "SQLITE_PATH", str(database_path))
    engine = create_engine(settings.DATABASE_URL)
    backend_path = Path(__file__).resolve().parents[1]
    config = Config(str(backend_path / "alembic.ini"))
    config.set_main_option("script_location", str(backend_path / "alembic"))
    yield engine, config
    engine.dispose()


def test_active_session_index_upgrade_and_downgrade(migration_database):
    engine, config = migration_database
    with engine.begin() as connection:
        # As colunas que a nova migração usa, no formato da versão anterior.
        connection.execute(text("CREATE TABLE study_sessions (user_id INTEGER NOT NULL, status VARCHAR(20) NOT NULL)"))
        connection.execute(text("INSERT INTO study_sessions VALUES (1, 'CONCLUIDA'), (1, 'CONCLUIDA'), (1, 'PAUSADA')"))

    command.stamp(config, "ebf926553436")
    command.upgrade(config, "head")
    assert "uq_study_sessions_active_user" in {index["name"] for index in inspect(engine).get_indexes("study_sessions")}
    with pytest.raises(IntegrityError):
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO study_sessions VALUES (1, 'EM_ANDAMENTO')"))
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO study_sessions VALUES (2, 'EM_ANDAMENTO'), (1, 'CONCLUIDA')"))

    command.downgrade(config, "ebf926553436")
    assert "uq_study_sessions_active_user" not in {index["name"] for index in inspect(engine).get_indexes("study_sessions")}
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO study_sessions VALUES (1, 'EM_ANDAMENTO')"))


def test_active_session_migration_reports_duplicates_without_changing_history(migration_database):
    engine, config = migration_database
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE study_sessions (user_id INTEGER NOT NULL, status VARCHAR(20) NOT NULL)"))
        connection.execute(text("INSERT INTO study_sessions VALUES (1, 'EM_ANDAMENTO'), (1, 'PAUSADA')"))
    command.stamp(config, "ebf926553436")
    with pytest.raises(RuntimeError, match="Finalize as sessões extras"):
        command.upgrade(config, "head")
    assert inspect(engine).get_indexes("study_sessions") == []
    with engine.connect() as connection:
        assert connection.execute(text("SELECT COUNT(*) FROM study_sessions")).scalar_one() == 2
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == "ebf926553436"


def test_clean_install_and_incremental_upgrade_match_models_and_preserve_data(migration_database):
    engine, config = migration_database
    assert inspect(engine).get_table_names() == []
    command.upgrade(config, "ebf926553436")
    now = datetime(2026, 10, 12, 12, tzinfo=timezone.utc)
    with Session(engine) as db:
        user = User(name="Aluno", email="migration@example.com", hashed_password="test-hash")
        db.add(user)
        db.flush()
        subject = Subject(user_id=user.id, name="Algoritmos")
        db.add(subject)
        db.flush()
        task = Task(user_id=user.id, subject_id=subject.id, title="Revisar grafos", priority="alta", estimated_hours=2)
        db.add(task)
        db.flush()
        db.add_all([
            CalendarEvent(user_id=user.id, subject_id=subject.id, task_id=task.id, title="Bloco de estudo", start_datetime=now),
            StudySession(user_id=user.id, subject_id=subject.id, task_id=task.id, status=StudySessionStatus.CONCLUIDA,
                         started_at=now, ended_at=now, accumulated_seconds=1200),
            Material(user_id=user.id, subject_id=subject.id, title="Notas de aula"),
        ])
        db.commit()
    command.upgrade(config, "head")
    with Session(engine) as db:
        task = db.query(Task).one()
        assert (task.title, task.priority, task.estimated_hours) == ("Revisar grafos", "alta", 2)
        assert db.query(CalendarEvent).one().task_id == task.id
        assert db.query(StudySession).one().elapsed_seconds == 1200
        assert db.query(Material).one().title == "Notas de aula"
    with engine.connect() as connection:
        context = MigrationContext.configure(connection, opts={"compare_type": True})
        assert compare_metadata(context, Base.metadata) == []
    command.downgrade(config, "base")
    assert inspect(engine).get_table_names() == ["alembic_version"]
