"""Base declarativa do SQLAlchemy com naming convention para SQL Server."""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


# Naming convention explícita para constraints
# Necessária para que o Alembic consiga gerenciar constraints no SQL Server
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Classe base para todos os modelos SQLAlchemy."""

    metadata = MetaData(naming_convention=convention)
