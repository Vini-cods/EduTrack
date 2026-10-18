"""Accent-insensitive, literal token search executed before SQL pagination.

No extension or stored search copy is required. SQLite folds Unicode through a
deterministic function on the session's own connection; SQL Server uses its
Unicode CI_AI collation. These bounded substring queries still scan matching
owners' rows; a dedicated full-text index can replace this for larger datasets.
"""

import json
import unicodedata

from sqlalchemy import String, case, cast, func, literal, or_
from sqlalchemy.orm import Session


def normalize_search(value: str | None) -> str:
    text = unicodedata.normalize("NFD", value or "")
    return " ".join("".join(char for char in text if not unicodedata.combining(char)).casefold().split())


def search_tokens(query: str | None) -> list[str]:
    return [token.lstrip("#") for token in normalize_search(query).split() if token.lstrip("#")]


def _sqlite_fold(value: str | None) -> str:
    # JSON is escaped by SQLAlchemy's SQLite serializer. Decode tags before
    # folding so searching "revisao" also finds the stored tag "revisão".
    if value and value.startswith("["):
        try:
            decoded = json.loads(value)
            if isinstance(decoded, list):
                value = " ".join(str(item) for item in decoded)
        except (ValueError, TypeError):
            pass
    return normalize_search(value)


def search_fields(db: Session, *fields, tags=None):
    dialect = db.bind.dialect.name
    columns = list(fields)
    if dialect == "sqlite":
        connection = db.connection().connection.driver_connection
        connection.create_function("edutrack_search_fold", 1, _sqlite_fold, deterministic=True)
        if tags is not None:
            columns.append(cast(tags, String))
        return [func.edutrack_search_fold(column) for column in columns]
    if tags is not None:
        # Note tags are explicitly capped at ten. JSON_VALUE decodes each tag.
        columns.extend(func.json_value(tags, f"$[{index}]") for index in range(10))
    return [func.coalesce(column, "").collate("Latin1_General_100_CI_AI") for column in columns]


def apply_text_search(query, fields, text: str | None):
    for token in search_tokens(text):
        query = query.filter(or_(*(field.contains(token, autoescape=True) for field in fields)))
    return query


def search_rank(fields, text: str | None):
    """Title matches precede matches spread across context/content."""
    tokens = search_tokens(text)
    if not tokens:
        return literal(0)
    return case((fields[0] == " ".join(tokens), 0),
                (fields[0].contains(" ".join(tokens), autoescape=True), 1), else_=2)
