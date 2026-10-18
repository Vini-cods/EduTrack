from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User
from app.models.user_preferences import UserPreferences


def test_preferences_upgrade_and_downgrade_preserve_existing_owner(tmp_path, monkeypatch):
    # Somente banco temporário: o schema real e as preferências reais não são tocados.
    monkeypatch.setattr(settings, "DB_ENGINE", "sqlite")
    monkeypatch.setattr(settings, "SQLITE_PATH", str(tmp_path / "preferences-migration.db"))
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    engine = create_engine(settings.DATABASE_URL)
    try:
        command.upgrade(config, "a18e20c4d200")
        with Session(engine) as db:
            owner = User(name="Preservado", email="preference-migration@example.com", hashed_password="synthetic-test-hash")
            db.add(owner)
            db.commit()
            owner_id = owner.id
        command.upgrade(config, "b18e20c4d201")
        with Session(engine) as db:
            assert db.get(User, owner_id).name == "Preservado"
            assert db.query(UserPreferences).count() == 0
            db.add(UserPreferences(user_id=owner_id, theme="dark", daily_capacity_hours=4))
            db.commit()
            assert db.get(UserPreferences, owner_id).focus_minutes == 25
        command.downgrade(config, "a18e20c4d200")
        assert "user_preferences" not in inspect(engine).get_table_names()
        with engine.connect() as connection:
            assert connection.execute(text("SELECT name FROM users WHERE id = :id"), {"id": owner_id}).scalar_one() == "Preservado"
    finally:
        engine.dispose()
