"""Testes de autenticação (registro, login, acesso a rota protegida)."""


def test_register_creates_user(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Ana Silva", "email": "ana@example.com", "password": "senha12345"},
    )
    assert resp.status_code in (200, 201)
    body = resp.json()
    assert body["email"] == "ana@example.com"
    assert "password" not in body and "hashed_password" not in body


def test_register_duplicate_email_fails(client):
    payload = {"name": "Ana", "email": "dup@example.com", "password": "senha12345"}
    client.post("/api/v1/auth/register", json=payload)
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code in (400, 409)


def test_login_success_returns_token(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Bruno", "email": "bruno@example.com", "password": "senha12345"},
    )
    resp = client.post("/api/v1/auth/login", data={"username": "bruno@example.com", "password": "senha12345"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_returns_401(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Carla", "email": "carla@example.com", "password": "senha12345"},
    )
    resp = client.post("/api/v1/auth/login", data={"username": "carla@example.com", "password": "errada"})
    assert resp.status_code == 401


def test_login_nonexistent_user_returns_401_not_500(client):
    """Regressão: usuário inexistente deve dar 401, nunca 500."""
    resp = client.post("/api/v1/auth/login", data={"username": "ninguem@example.com", "password": "x"})
    assert resp.status_code == 401


def test_protected_route_requires_token(client):
    resp = client.get("/api/v1/tasks/")
    assert resp.status_code in (401, 403)


def test_protected_route_rejects_invalid_token(client):
    resp = client.get("/api/v1/tasks/", headers={"Authorization": "Bearer token-invalido"})
    assert resp.status_code == 401



