"""Migration operacional isolada, preservando dados anteriores em ida/volta."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text


def test_recovery_migration_upgrade_downgrade_preserves_users_and_academic_data(tmp_path):
    path = Path(__file__).resolve().parents[1] / "alembic/versions/c18e20c4d202_recovery_outbox_and_limits.py"
    spec = spec_from_file_location("recovery_migration", path)
    migration = module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_engine(f"sqlite:///{tmp_path / 'migration.db'}")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"))
            connection.execute(text("CREATE TABLE academic_fixture (id INTEGER PRIMARY KEY, value TEXT)"))
            connection.execute(text("INSERT INTO users VALUES (7, 'Estudante çã')"))
            connection.execute(text("INSERT INTO academic_fixture VALUES (2, 'não alterar')"))
            before = [tuple(row) for row in connection.execute(text("SELECT * FROM academic_fixture"))]
            with Operations.context(MigrationContext.configure(connection)):
                migration.upgrade()
                assert connection.execute(text("SELECT generation FROM recovery_rate_lock WHERE id=1")).scalar() == 0
                assert set(("recovery_deliveries", "recovery_rate_events", "recovery_rate_lock")) <= set(inspect(connection).get_table_names())
                assert [tuple(row) for row in connection.execute(text("SELECT * FROM academic_fixture"))] == before
                migration.downgrade()
            assert set(inspect(connection).get_table_names()) == {"users", "academic_fixture"}
            assert connection.execute(text("SELECT name FROM users WHERE id=7")).scalar() == "Estudante çã"
            assert [tuple(row) for row in connection.execute(text("SELECT * FROM academic_fixture"))] == before
    finally:
        engine.dispose()
