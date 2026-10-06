"""Configuração da sessão do banco de dados."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

if settings.DB_ENGINE == "sqlite":
    # SQLite não suporta pool_size/max_overflow e precisa de check_same_thread=False
    # para funcionar com o modelo de concorrência do FastAPI.
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=1800,
        echo=False,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# A dependency `get_db` usada pelas rotas mora em app.api.deps (não aqui) —
# era duplicada nos dois arquivos; removida daqui para ter uma única fonte
# de verdade. `SessionLocal`/`engine` continuam aqui porque deps.py e o
# Alembic (via app.db.base/session) dependem deles.
