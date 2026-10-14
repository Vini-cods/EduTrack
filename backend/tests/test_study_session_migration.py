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
from app.models.note import Note


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


def test_notes_upgrade_and_downgrade_preserve_existing_academic_data(migration_database):
    engine, config = migration_database
    command.upgrade(config, "c218e785d190")
    with Session(engine) as db:
        user = User(name="Aluno", email="notes-migration@example.com", hashed_password="test-hash")
        db.add(user)
        db.flush()
        subject = Subject(user_id=user.id, name="Preservar disciplina")
        db.add(subject)
        db.flush()
        task = Task(user_id=user.id, subject_id=subject.id, title="Preservar tarefa")
        db.add(task)
        db.commit()
        user_id, subject_id, task_id = user.id, subject.id, task.id
    command.upgrade(config, "head")
    with Session(engine) as db:
        db.add(Note(user_id=user_id, subject_id=subject_id, task_id=task_id, title="Nova nota", content="Persistido", tags=["teste"]))
        db.commit()
    with Session(engine) as db:
        assert db.query(Note).one().tags == ["teste"]
        assert db.query(Task).one().title == "Preservar tarefa"
    command.downgrade(config, "c218e785d190")
    assert "notes" not in inspect(engine).get_table_names()
    with engine.connect() as connection:
        assert connection.execute(text("SELECT title FROM tasks")).scalar_one() == "Preservar tarefa"


def test_legacy_079_core_upgrades_without_stamp_or_recreating_existing_rows(migration_database):
    engine, config = migration_database
    # Banco sintético independente da execução do baseline: representa o
    # schema legado já instalado e sua revisão histórica, sem dados reais.
    statements = (
        "CREATE TABLE users (id INTEGER NOT NULL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, hashed_password VARCHAR(255) NOT NULL, is_active BOOLEAN NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)",
        "CREATE UNIQUE INDEX ix_users_email ON users (email)",
        "CREATE TABLE subjects (id INTEGER NOT NULL PRIMARY KEY, user_id INTEGER NOT NULL, name VARCHAR(255) NOT NULL, color VARCHAR(20), professor VARCHAR(255), workload_hours INTEGER, description VARCHAR(1000), start_date DATE, end_date DATE, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, CONSTRAINT fk_subjects_user_id_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)",
        "CREATE INDEX ix_subjects_user_id ON subjects (user_id)",
        "CREATE TABLE tasks (id INTEGER NOT NULL PRIMARY KEY, user_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, title VARCHAR(255) NOT NULL, description VARCHAR(1000), due_date DATE, status VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, CONSTRAINT fk_tasks_user_id_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE NO ACTION, CONSTRAINT fk_tasks_subject_id_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE)",
        "CREATE INDEX ix_tasks_user_id ON tasks (user_id)",
        "CREATE INDEX ix_tasks_subject_id ON tasks (subject_id)",
        "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)",
        "INSERT INTO alembic_version VALUES ('079be52cae26')",
        "INSERT INTO users VALUES (7, 'Aluno legado', 'legacy@example.com', 'synthetic-test-hash', 1, '2026-09-01 12:00:00', '2026-09-01 12:00:00')",
        "INSERT INTO subjects (id, user_id, name, created_at, updated_at) VALUES (11, 7, 'Disciplina legada', '2026-09-01 12:00:00', '2026-09-01 12:00:00')",
        "INSERT INTO tasks (id, user_id, subject_id, title, due_date, status, created_at, updated_at) VALUES (23, 7, 11, 'Tarefa legada', '2026-10-20', 'pendente', '2026-09-01 12:00:00', '2026-09-01 12:00:00')",
    )
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
    command.upgrade(config, "head")
    with Session(engine) as db:
        assert db.query(User).one().id == 7
        assert db.query(Subject).one().user_id == 7
        task = db.query(Task).one()
        assert (task.id, task.user_id, task.subject_id, task.title, task.due_date.isoformat(), task.status) == (23, 7, 11, "Tarefa legada", "2026-10-20", "pendente")
        assert task.priority == "media"
        assert task.estimated_hours is None
        assert db.query(CalendarEvent).count() == 0
        assert db.query(StudySession).count() == 0
        assert db.query(Material).count() == 0
        assert db.query(Note).count() == 0
    with engine.connect() as connection:
        context = MigrationContext.configure(connection, opts={"compare_type": True})
        assert compare_metadata(context, Base.metadata) == []
