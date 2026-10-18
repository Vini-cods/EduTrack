"""Snapshots reais de SQLite descartável, inclusive estado ainda no WAL."""

import sqlite3

import pytest

from scripts.sqlite_backup import backup_database, restore_database, verify_snapshot


def test_online_wal_backup_and_restore_preserve_values_without_touching_original(tmp_path):
    source, snapshot, restored = (tmp_path / name for name in ("source.db", "snapshot.db", "restored.db"))
    with sqlite3.connect(source) as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, note BLOB)")
        db.execute("CREATE TABLE alembic_version (version_num TEXT)")
        db.execute("INSERT INTO alembic_version VALUES ('isolated-test')")
        db.execute("INSERT INTO users VALUES (1, 'Estudante çã', X'0001FF')")
        db.commit()
        before = db.execute("SELECT * FROM users").fetchall()
        backup = backup_database(source, snapshot)
        assert backup["tables"] == {"alembic_version": 1, "users": 1}
        assert backup["revisions"] == ["isolated-test"]
        assert verify_snapshot(snapshot) == backup
        restore_database(snapshot, restored)
        assert db.execute("SELECT * FROM users").fetchall() == before
    with sqlite3.connect(restored) as db:
        assert db.execute("SELECT * FROM users").fetchall() == before
        assert db.execute("PRAGMA integrity_check").fetchall() == [("ok",)]


def test_backup_and_restore_refuse_overwrite_and_detect_tampering(tmp_path):
    source, snapshot = tmp_path / "source.db", tmp_path / "snapshot.db"
    with sqlite3.connect(source) as db:
        db.execute("CREATE TABLE data (value TEXT)")
        db.execute("INSERT INTO data VALUES ('preserve')")
        db.commit()
    backup_database(source, snapshot)
    with pytest.raises(FileExistsError):
        backup_database(source, snapshot)
    with pytest.raises(FileExistsError):
        restore_database(snapshot, source)
    with sqlite3.connect(snapshot) as db:
        db.execute("UPDATE data SET value = 'tampered'")
        db.commit()
    with pytest.raises(ValueError):
        verify_snapshot(snapshot)
    with pytest.raises(ValueError):
        restore_database(snapshot, tmp_path / "invalid.db")
    assert not (tmp_path / "invalid.db").exists()


def test_nonexistent_source_does_not_leave_empty_destination(tmp_path):
    destination = tmp_path / "destination.db"
    with pytest.raises(ValueError):
        backup_database(tmp_path / "missing.db", destination)
    assert not destination.exists()
