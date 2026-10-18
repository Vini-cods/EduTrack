"""Snapshot SQLite online e restauração para arquivo novo, com verificação.

Exemplo: python scripts/sqlite_backup.py backup edutrack.db .backups/edutrack-20261018.db
Não sobrescreve arquivos existentes e nunca restaura sobre um banco em uso.
"""

import argparse
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import sqlite3


def _connect_readonly(path: Path):
    if not path.is_file():
        raise ValueError("Banco de origem inexistente.")
    return sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=30)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _manifest_path(path: Path) -> Path:
    return path.with_name(path.name + ".manifest.json")


def inspect_snapshot(path: Path) -> dict:
    with closing(_connect_readonly(path)) as db:
        if db.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise ValueError("A verificação de integridade SQLite falhou.")
        tables = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()
        counts = {name: db.execute('SELECT COUNT(*) FROM "' + name.replace('"', '""') + '"').fetchone()[0]
                  for (name,) in tables}
        versions = [row[0] for row in db.execute("SELECT version_num FROM alembic_version")] if "alembic_version" in counts else []
    return {"format": 1, "sha256": _sha256(path), "tables": counts, "revisions": versions}


def verify_snapshot(path: Path) -> dict:
    path = path.resolve()
    expected = json.loads(_manifest_path(path).read_text(encoding="utf-8"))
    actual = inspect_snapshot(path)
    if expected != actual:
        raise ValueError("O snapshot difere do manifesto; restauração recusada.")
    return actual


def backup_database(source: Path, destination: Path) -> dict:
    source, destination = source.resolve(), destination.resolve()
    if source == destination:
        raise ValueError("Origem e destino devem ser diferentes.")
    manifest_path = _manifest_path(destination)
    if manifest_path.exists():
        raise FileExistsError("O manifesto de destino já existe.")
    # Reserva exclusiva: nem a cópia nem seu manifesto sobrescrevem outro backup.
    with destination.open("xb"):
        pass
    try:
        os.chmod(destination, 0o600)
        with closing(_connect_readonly(source)) as origin, closing(sqlite3.connect(destination, timeout=30)) as target:
            origin.backup(target, pages=256, sleep=0.05)
        manifest = inspect_snapshot(destination)
        with manifest_path.open("x", encoding="utf-8") as output:
            json.dump(manifest, output, ensure_ascii=False, indent=2)
            output.write("\n")
        os.chmod(manifest_path, 0o600)
        return verify_snapshot(destination)
    except Exception:
        # Remove apenas o destino novo que esta operação reservou.
        destination.unlink(missing_ok=True)
        raise


def restore_database(source: Path, destination: Path) -> dict:
    expected = verify_snapshot(source)
    restored = backup_database(source, destination)
    if restored["tables"] != expected["tables"] or restored["revisions"] != expected["revisions"]:
        raise ValueError("A restauração não preservou tabelas/revisões do snapshot.")
    return restored


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("backup", "verify", "restore"))
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path, nargs="?")
    args = parser.parse_args()
    try:
        if args.operation == "verify":
            verify_snapshot(args.source)
        else:
            if args.destination is None:
                parser.error("backup/restore exigem um destino novo explícito")
            operation = backup_database if args.operation == "backup" else restore_database
            operation(args.source, args.destination)
    except (OSError, ValueError, sqlite3.Error, json.JSONDecodeError):
        print("Falha na operação. Verifique caminhos, permissões, espaço e integridade; nenhum banco existente foi sobrescrito.")
        return 1
    print("Snapshot verificado com sucesso.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
