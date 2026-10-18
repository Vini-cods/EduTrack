"""Recuperação isolada: SMTP sempre simulado e nenhum dado de banco real."""

import smtplib
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from urllib.parse import parse_qs, urlsplit

import pytest
from jose import jwt
from pydantic import ValidationError
from sqlalchemy import select, update

from app.core.config import Settings, settings
from app.core.security import (
    ALGORITHM, create_access_token, create_password_reset_token,
    get_password_hash, password_fingerprint,
)
from app.models.user import User
from app.models.recovery_delivery import RecoveryRateEvent
from app.services import email_service, password_reset_service, recovery_delivery_service, recovery_rate_limit
from tests.conftest import TestingSessionLocal


@pytest.fixture(autouse=True)
def reset_recovery_limits(monkeypatch):
    monkeypatch.setattr(password_reset_service, "_rate_limiter", password_reset_service.RecoveryRateLimiter())
    monkeypatch.setattr(settings, "SMTP_HOST", None)
    monkeypatch.setattr(settings, "EMAILS_FROM_EMAIL", None)


@pytest.fixture(scope="module")
def initial_hash():
    return get_password_hash("senha12345")


@pytest.fixture()
def reset_users(initial_hash):
    result = {}
    with TestingSessionLocal() as db:
        for label in ("owner", "other", "inactive"):
            user = User(name=label, email=f"{label}@example.com", hashed_password=initial_hash,
                        is_active=label != "inactive")
            db.add(user)
            db.flush()
            result[label] = {"id": user.id, "email": user.email, "hash": initial_hash}
        db.commit()
    return result


@pytest.fixture()
def configured_mail(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "EMAILS_FROM_EMAIL", "noreply@example.com")
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://estudos.example.com")
    calls = []
    monkeypatch.setattr(email_service, "send_password_reset_email", lambda recipient, url: calls.append((recipient, url)))
    return calls


def token_for(user):
    return create_password_reset_token(user["id"], user["hash"])


def test_missing_mail_configuration_fails_before_lookup_uniformly(client, reset_users, monkeypatch):
    def unexpected_lookup(*args, **kwargs):
        pytest.fail("SMTP indisponível deve falhar antes da busca de conta")
    monkeypatch.setattr(password_reset_service.auth_service, "get_user_by_email", unexpected_lookup)
    responses = [client.post("/api/v1/auth/forgot-password", json={"email": email})
                 for email in (reset_users["owner"]["email"], "unknown@example.com", reset_users["inactive"]["email"])]
    assert {response.status_code for response in responses} == {503}
    assert responses[0].json() == responses[1].json() == responses[2].json()


def test_forgot_has_same_response_for_existing_unknown_inactive_and_link_is_trusted_fragment(
    client, reset_users, configured_mail,
):
    responses = [client.post("/api/v1/auth/forgot-password", json={"email": email},
                             headers={"Host": "untrusted.example.com"})
                 for email in (reset_users["owner"]["email"], "unknown@example.com", reset_users["inactive"]["email"])]
    assert {response.status_code for response in responses} == {202}
    assert responses[0].json() == responses[1].json() == responses[2].json()
    assert "enviadas" not in responses[0].json()["msg"]
    assert configured_mail == []  # A API persistiu, mas não executou SMTP.
    assert recovery_delivery_service.deliver_one(TestingSessionLocal)
    assert len(configured_mail) == 1
    recipient, url = configured_mail[0]
    assert recipient == reset_users["owner"]["email"]
    parsed = urlsplit(url)
    assert parsed.netloc == "estudos.example.com" and parsed.path == "/reset-password" and parsed.query == ""
    token = parse_qs(parsed.fragment)["token"][0]
    assert token not in responses[0].text
    assert client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "outraSenha123"}).status_code == 200


def test_reset_changes_only_target_account_rejects_old_password_and_replay(client, reset_users):
    owner, other = reset_users["owner"], reset_users["other"]
    token = token_for(owner)
    another_link = token_for(owner)
    assert token != another_link
    payload = {"token": token, "new_password": "novaSenha123"}
    assert client.post("/api/v1/auth/reset-password", json=payload).status_code == 200
    assert client.post("/api/v1/auth/login", data={"username": owner["email"], "password": "senha12345"}).status_code == 401
    assert client.post("/api/v1/auth/login", data={"username": owner["email"], "password": "novaSenha123"}).status_code == 200
    assert client.post("/api/v1/auth/login", data={"username": other["email"], "password": "senha12345"}).status_code == 200
    for old_link in (token, another_link):
        assert client.post("/api/v1/auth/reset-password", json={"token": old_link, "new_password": "tentativa123"}).status_code == 400


@pytest.mark.parametrize("kind", ["invalid", "access", "expired", "wrong-purpose", "missing-exp", "malformed-version", "inactive", "deleted"])
def test_invalid_reset_variants_fail_generically_and_preserve_password(client, reset_users, kind):
    user = reset_users["inactive"] if kind == "inactive" else reset_users["owner"]
    token = token_for(user)
    if kind == "invalid":
        token = "invalid.token.value"
    elif kind == "access":
        token = create_access_token(user["id"])
    elif kind in {"expired", "wrong-purpose", "missing-exp", "malformed-version"}:
        payload = jwt.get_unverified_claims(token)
        if kind == "expired":
            payload["exp"] = int((datetime.now(timezone.utc) - timedelta(seconds=1)).timestamp())
        elif kind == "wrong-purpose":
            payload["purpose"] = "access"
        elif kind == "missing-exp":
            del payload["exp"]
        else:
            payload["password_version"] = "é" * 64
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    elif kind == "deleted":
        with TestingSessionLocal() as db:
            db.delete(db.get(User, user["id"]))
            db.commit()
    response = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "novaSenha123"})
    assert response.status_code == 400
    assert response.json() == {"detail": "Link inválido, expirado ou já utilizado. Solicite um novo link."}
    with TestingSessionLocal() as db:
        remaining = db.get(User, user["id"])
        assert remaining is None or remaining.hashed_password == user["hash"]


def test_reset_token_cannot_access_authenticated_routes(client, reset_users):
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_for(reset_users['owner'])}"})
    assert response.status_code == 401


def test_expiry_uses_configured_window_and_hash_not_exposed(reset_users, monkeypatch):
    monkeypatch.setattr(settings, "RESET_TOKEN_EXPIRE_MINUTES", 7)
    owner = reset_users["owner"]
    claims = jwt.decode(token_for(owner), settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert claims["exp"] - claims["iat"] == 7 * 60
    assert claims["password_version"] == password_fingerprint(owner["hash"])
    assert owner["hash"] not in str(claims) and owner["email"] not in str(claims)


@pytest.mark.parametrize("password", ["12345", "a" * 73, "é" * 37, "😀" * 19])
def test_password_bounds_apply_to_register_and_reset(client, reset_users, password):
    owner = reset_users["owner"]
    assert client.post("/api/v1/auth/register", json={"name": "Inválida", "email": "new@example.com", "password": password}).status_code == 422
    assert client.post("/api/v1/auth/reset-password", json={"token": token_for(owner), "new_password": password}).status_code == 422
    with TestingSessionLocal() as db:
        assert db.get(User, owner["id"]).hashed_password == owner["hash"]


def test_unicode_72_byte_password_works_without_bcrypt_truncation(client, reset_users):
    owner = reset_users["owner"]
    password = "é" * 36
    assert client.post("/api/v1/auth/reset-password", json={"token": token_for(owner), "new_password": password}).status_code == 200
    assert client.post("/api/v1/auth/login", data={"username": owner["email"], "password": password}).status_code == 200
    assert client.post("/api/v1/auth/login", data={"username": owner["email"], "password": password + "x"}).status_code == 401


def test_atomic_update_rejects_token_if_credential_changes_after_read(reset_users, monkeypatch):
    owner = reset_users["owner"]
    replacement_hash = get_password_hash("senhaExterna123")
    # Simula outro pedido vencedor entre a leitura do estado e o UPDATE condicional.
    with TestingSessionLocal() as db:
        real_hash = password_reset_service.get_password_hash
        def competing_hash(password):
            with TestingSessionLocal() as winner:
                winner.execute(update(User).where(User.id == owner["id"]).values(hashed_password=replacement_hash))
                winner.commit()
            return real_hash(password)
        monkeypatch.setattr(password_reset_service, "get_password_hash", competing_hash)
        with pytest.raises(password_reset_service.InvalidPasswordReset):
            password_reset_service.reset_password(db, token_for(owner), "senhaPerdedora123")
    with TestingSessionLocal() as db:
        assert db.get(User, owner["id"]).hashed_password == replacement_hash


def test_recovery_cooldown_uniform_for_unknown_and_known_and_expires(client, reset_users, configured_mail, monkeypatch):
    clock = [datetime.now(timezone.utc)]
    monkeypatch.setattr(recovery_rate_limit, "utcnow", lambda: clock[0])
    for email in (reset_users["owner"]["email"], "unknown@example.com"):
        assert client.post("/api/v1/auth/forgot-password", json={"email": email}).status_code == 202
        response = client.post("/api/v1/auth/forgot-password", json={"email": email})
        assert response.status_code == 429 and response.headers["Retry-After"] == "60"
    clock[0] += timedelta(seconds=60)
    assert client.post("/api/v1/auth/forgot-password", json={"email": reset_users["owner"]["email"]}).status_code == 202
    with TestingSessionLocal() as db:
        keys = db.scalars(select(RecoveryRateEvent.bucket)).all()
    assert keys and all("example.com" not in key and "testclient" not in key for key in keys)


def test_recovery_email_window_and_ip_limit_survive_limiter_instances(monkeypatch):
    clock = [datetime.now(timezone.utc)]
    monkeypatch.setattr(recovery_rate_limit, "utcnow", lambda: clock[0])
    monkeypatch.setattr(settings, "RESET_REQUEST_EMAIL_LIMIT", 2)
    monkeypatch.setattr(settings, "RESET_REQUEST_IP_LIMIT", 3)
    limiter = password_reset_service.RecoveryRateLimiter()
    with TestingSessionLocal() as db:
        limiter.check(db, "a@example.com", "127.0.0.1")
        clock[0] += timedelta(seconds=60)
        limiter.check(db, "a@example.com", "127.0.0.1")
        clock[0] += timedelta(seconds=60)
        limiter = password_reset_service.RecoveryRateLimiter()  # outro processo/instância
        with pytest.raises(password_reset_service.PasswordResetRateLimited):
            limiter.check(db, "a@example.com", "127.0.0.1")
        limiter.check(db, "b@example.com", "127.0.0.1")
        with pytest.raises(password_reset_service.PasswordResetRateLimited):
            limiter.check(db, "c@example.com", "127.0.0.1")
        clock[0] += timedelta(seconds=settings.RESET_REQUEST_WINDOW_SECONDS)
        limiter.check(db, "a@example.com", "127.0.0.1")
        assert len(db.scalars(select(RecoveryRateEvent)).all()) == 2


@pytest.mark.parametrize("implicit_ssl", [False, True])
def test_smtp_transport_uses_tls_timeout_auth_and_sends_only_expected_message(monkeypatch, implicit_ssl):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "EMAILS_FROM_EMAIL", "noreply@example.com")
    monkeypatch.setattr(settings, "SMTP_USERNAME", "mock-user")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "mock-password")
    monkeypatch.setattr(settings, "SMTP_TLS", not implicit_ssl)
    monkeypatch.setattr(settings, "SMTP_SSL", implicit_ssl)
    smtp = MagicMock()
    constructor = MagicMock()
    constructor.return_value.__enter__.return_value = smtp
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL" if implicit_ssl else "SMTP", constructor)
    email_service.send_password_reset_email("owner@example.com", "https://estudos.example.com/reset-password#token=synthetic")
    assert constructor.call_args.kwargs["timeout"] == settings.SMTP_TIMEOUT_SECONDS
    assert smtp.starttls.called is (not implicit_ssl)
    smtp.login.assert_called_once_with("mock-user", "mock-password")
    message = smtp.send_message.call_args.args[0]
    assert message["To"] == "owner@example.com" and message["From"] == "EduTrack <noreply@example.com>"
    assert "#token=synthetic" in message.get_content()


def test_smtp_failure_never_changes_public_acceptance_or_logs_personal_data(client, reset_users, monkeypatch, caplog):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "EMAILS_FROM_EMAIL", "noreply@example.com")
    transport = MagicMock(side_effect=smtplib.SMTPException("sensitive-server-detail owner@example.com token-value"))
    monkeypatch.setattr(email_service.smtplib, "SMTP", transport)
    known = client.post("/api/v1/auth/forgot-password", json={"email": reset_users["owner"]["email"]})
    unknown = client.post("/api/v1/auth/forgot-password", json={"email": "unknown@example.com"})
    assert known.status_code == unknown.status_code == 202 and known.json() == unknown.json()
    assert recovery_delivery_service.deliver_one(TestingSessionLocal)
    assert "outcome=pending" in caplog.text
    assert "sensitive-server-detail" not in caplog.text and "owner@example.com" not in caplog.text and "token-value" not in caplog.text


@pytest.mark.parametrize("origin", ["javascript:alert(1)", "https://user:password@example.com", "https://example.com/path", "https://example.com?token=x", "https://example.com#token=x", "https://example.com:invalid"])
def test_frontend_origin_rejects_untrusted_shapes(origin):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, SECRET_KEY="test-only", FRONTEND_URL=origin)


def test_email_configuration_rejects_conflicting_tls_and_partial_credentials():
    for invalid in ({"SMTP_TLS": True, "SMTP_SSL": True}, {"SMTP_USERNAME": "user"}, {"EMAILS_FROM_NAME": "Header\nInjection"}):
        with pytest.raises(ValidationError):
            Settings(_env_file=None, SECRET_KEY="test-only", **invalid)
