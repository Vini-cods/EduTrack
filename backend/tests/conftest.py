"""
Configuração compartilhada da suíte de testes.

Todo teste roda contra um banco SQLite em memória, isolado do
`edutrack.db` real — nada aqui toca dados de verdade. Cada função de teste
recebe um banco limpo (tabelas recriadas antes, dropadas depois), então
testes não interferem uns nos outros.
"""

import os
import sys
from pathlib import Path

# SECRET_KEY precisa existir antes de qualquer import de app.* (Settings lê
# no import). Só vale para os testes — nunca usar este valor em produção.
os.environ.setdefault("SECRET_KEY", "test-secret-key-only-for-pytest-do-not-use-in-production")

# Garante que `app` seja importável independente de onde o pytest for chamado.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.api.deps import get_db

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _fresh_database():
    """Recria o schema antes de cada teste e derruba depois — isolamento total entre testes."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def auth_headers(client: TestClient) -> dict:
    """Registra e loga um usuário de teste; devolve os headers de autorização prontos para uso."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": "test@example.com", "password": "senha12345"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "senha12345"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def make_auth_headers(client: TestClient, email: str, name: str = "Outro Usuário") -> dict:
    """Igual a `auth_headers`, mas para criar um SEGUNDO usuário nos testes de isolamento."""
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": "senha12345"})
    resp = client.post("/api/v1/auth/login", data={"username": email, "password": "senha12345"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def subject(client: TestClient, auth_headers: dict) -> dict:
    """Uma disciplina pronta, do usuário de `auth_headers`."""
    resp = client.post("/api/v1/subjects/", json={"name": "Estruturas de Dados"}, headers=auth_headers)
    return resp.json()
