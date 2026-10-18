"""Entrega SMTP real apenas em loopback e persistência/concorrência em bancos descartáveis."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email import policy
from email.parser import BytesParser
import socketserver
import threading
from urllib.parse import parse_qs, urlsplit

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings, settings
from app.core.security import get_password_hash, password_fingerprint
from app.db.base import Base
from app.models import User
from app.models.recovery_delivery import RecoveryDelivery, RecoveryRateEvent, RecoveryRateLock
from app.services import email_service, recovery_delivery_service
from app.services.recovery_rate_limit import PasswordResetRateLimited, RecoveryRateLimiter
from tests.conftest import TestingSessionLocal, engine


@pytest.fixture()
def local_smtp(monkeypatch):
    class Handler(socketserver.StreamRequestHandler):
        def handle(self):
            self.wfile.write(b"220 localhost EduTrack isolated test\r\n")
            while line := self.rfile.readline():
                command = line.split(b" ", 1)[0].strip().upper()
                if command in (b"EHLO", b"HELO"):
                    self.wfile.write(b"250 localhost\r\n")
                elif command in (b"MAIL", b"RCPT", b"RSET", b"NOOP"):
                    self.wfile.write(b"250 OK\r\n")
                elif command == b"DATA":
                    self.wfile.write(b"354 End with dot\r\n")
                    data = []
                    while (part := self.rfile.readline()) != b".\r\n":
                        if not part:
                            return
                        data.append(part[1:] if part.startswith(b"..") else part)
                    if self.server.reject_next:
                        self.server.reject_next = False
                        self.wfile.write(b"451 Temporary isolated test failure\r\n")
                    else:
                        self.server.messages.append(b"".join(data))
                        self.wfile.write(b"250 Queued locally\r\n")
                elif command == b"QUIT":
                    self.wfile.write(b"221 Bye\r\n")
                    return
                else:
                    self.wfile.write(b"502 Unsupported\r\n")

    server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    server.messages = []
    server.reject_next = False
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    for name, value in {"SMTP_HOST": "127.0.0.1", "SMTP_PORT": server.server_address[1],
                        "SMTP_TLS": False, "SMTP_SSL": False, "SMTP_USERNAME": None,
                        "SMTP_PASSWORD": None, "EMAILS_FROM_EMAIL": "noreply@example.com",
                        "FRONTEND_URL": "https://estudos.example.com"}.items():
        monkeypatch.setattr(settings, name, value)
    yield server
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)


def _user_and_delivery(factory, *, expires=None):
    now = datetime.now(timezone.utc)
    with factory() as db:
        user = User(name="Isolated", email="isolated@example.com", hashed_password=get_password_hash("initial-password"))
        db.add(user)
        db.flush()
        delivery = RecoveryDelivery(user_id=user.id, password_version=password_fingerprint(user.hashed_password),
                                    status="pending", attempts=0, created_at=now, available_at=now,
                                    expires_at=expires or now + timedelta(minutes=30))
        db.add(delivery)
        db.commit()
        return user.id, delivery.id


def test_real_loopback_smtp_retry_persists_and_reset_targets_only_owner(client, local_smtp):
    user_id, delivery_id = _user_and_delivery(TestingSessionLocal)
    local_smtp.reject_next = True
    assert recovery_delivery_service.deliver_one(TestingSessionLocal)
    with TestingSessionLocal() as db:
        delivery = db.get(RecoveryDelivery, delivery_id)
        assert delivery.status == "pending" and delivery.attempts == 1
        assert delivery.lease_token is None
    assert local_smtp.messages == []
    assert recovery_delivery_service.deliver_one(TestingSessionLocal) is False
    # O processo pode reiniciar: a próxima tentativa depende apenas do banco.
    with TestingSessionLocal() as db:
        db.get(RecoveryDelivery, delivery_id).available_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert recovery_delivery_service.deliver_one(TestingSessionLocal)
    message = BytesParser(policy=policy.default).parsebytes(local_smtp.messages[0])
    assert message["To"] == "isolated@example.com"
    url = next(line.removeprefix("Abra este link: ") for line in message.get_content().splitlines() if line.startswith("Abra este link: "))
    token = parse_qs(urlsplit(url).fragment)["token"][0]
    assert client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "new-password"}).status_code == 200
    with TestingSessionLocal() as db:
        delivery = db.get(RecoveryDelivery, delivery_id)
        assert delivery.status == "sent" and delivery.attempts == 2
        # Nenhum token/recipient/body é persistido na outbox.
        assert not {"email", "recipient", "token", "reset_url", "body"} & set(delivery.__table__.columns.keys())


@pytest.mark.parametrize("kind", ["expired", "inactive", "changed", "deleted"])
def test_invalid_queued_delivery_is_discarded_without_smtp(kind, monkeypatch):
    user_id, delivery_id = _user_and_delivery(TestingSessionLocal)
    with TestingSessionLocal() as db:
        user = db.get(User, user_id)
        if kind == "expired":
            db.get(RecoveryDelivery, delivery_id).expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        elif kind == "inactive":
            user.is_active = False
        elif kind == "changed":
            user.hashed_password = get_password_hash("changed-password")
        else:
            db.delete(user)
        db.commit()
    monkeypatch.setattr(email_service, "send_password_reset_email", lambda *args: pytest.fail("Não deve enviar"))
    assert recovery_delivery_service.deliver_one(TestingSessionLocal)
    with TestingSessionLocal() as db:
        assert db.get(RecoveryDelivery, delivery_id).status == "discarded"


def test_attempt_limit_and_abandoned_lease_are_recovered(monkeypatch):
    _, delivery_id = _user_and_delivery(TestingSessionLocal)
    monkeypatch.setattr(settings, "MAIL_MAX_ATTEMPTS", 2)
    monkeypatch.setattr(email_service, "send_password_reset_email", lambda *args: (_ for _ in ()).throw(OSError("private detail")))
    assert recovery_delivery_service.deliver_one(TestingSessionLocal)
    with TestingSessionLocal() as db:
        delivery = db.get(RecoveryDelivery, delivery_id)
        delivery.status = "sending"
        delivery.lease_token = "abandoned-process"
        delivery.lease_until = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert recovery_delivery_service.deliver_one(TestingSessionLocal)
    with TestingSessionLocal() as db:
        assert db.get(RecoveryDelivery, delivery_id).status == "failed"
    assert recovery_delivery_service.deliver_one(TestingSessionLocal) is False


@pytest.fixture()
def file_sessions(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'concurrency.db'}", connect_args={"check_same_thread": False, "timeout": 10})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        db.add(RecoveryRateLock(id=1, generation=0))
        db.commit()
    yield factory
    engine.dispose()


def test_workers_cannot_claim_same_delivery_concurrently(file_sessions, monkeypatch):
    _user_and_delivery(file_sessions)
    sending, release = threading.Event(), threading.Event()
    calls = []
    def send(*args):
        calls.append("sent")
        sending.set()
        assert release.wait(timeout=5)
    monkeypatch.setattr(email_service, "send_password_reset_email", send)
    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(recovery_delivery_service.deliver_one, file_sessions)
        assert sending.wait(timeout=5)
        second = pool.submit(recovery_delivery_service.deliver_one, file_sessions)
        try:
            assert second.result(timeout=5) is False
        finally:
            release.set()
        assert first.result(timeout=5)
    assert calls == ["sent"]


def test_shared_rate_limit_is_atomic_across_sessions_and_does_not_consume_rejected_email(file_sessions, monkeypatch):
    monkeypatch.setattr(settings, "RESET_REQUEST_IP_LIMIT", 1)
    barrier = threading.Barrier(2)
    def request(index):
        with file_sessions() as db:
            barrier.wait(timeout=5)
            try:
                RecoveryRateLimiter().check(db, f"test{index}@example.com", "shared-ip")
                return "accepted"
            except PasswordResetRateLimited:
                return "limited"
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(request, (1, 2))) == ["accepted", "limited"]
    with file_sessions() as db:
        assert len(db.scalars(select(RecoveryRateEvent)).all()) == 2
        RecoveryRateLimiter().check(db, "independent@example.com", "another-ip")


def test_health_and_headers_expose_no_configuration(client):
    assert client.get("/health/live").json() == {"status": "alive"}
    response = client.get("/health/ready")
    assert response.status_code == 200 and response.json() == {"status": "ready"}
    assert len(response.headers["X-Request-ID"]) == 32
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert settings.SECRET_KEY not in response.text


def test_readiness_rejects_missing_operational_migration_generically(client):
    # Apenas o banco em memória dos testes, nunca engine da aplicação real.
    RecoveryDelivery.__table__.drop(engine)
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
    assert "recovery_deliveries" not in response.text
    assert client.get("/health/live").status_code == 200


def _production_config():
    return {"ENVIRONMENT": "production", "SECRET_KEY": "A7b9cD3eF6gH2iJ8kL0mN4oP5qR1sT9u",
            "FRONTEND_URL": "https://edutrack.example.com", "BACKEND_CORS_ORIGINS": ["https://edutrack.example.com"],
            "TRUSTED_HOSTS": ["api.edutrack.example.com"], "SMTP_HOST": "smtp.example.com",
            "EMAILS_FROM_EMAIL": "noreply@example.com", "SMTP_TLS": True}


@pytest.mark.parametrize("invalid", [{"SECRET_KEY": "short"}, {"FRONTEND_URL": "http://example.com"},
    {"BACKEND_CORS_ORIGINS": ["*"]}, {"TRUSTED_HOSTS": ["*"]}, {"SMTP_HOST": None},
    {"SMTP_TLS": False}, {"DB_ENGINE": "mssql", "DB_TRUST_SERVER_CERTIFICATE": True}])
def test_production_rejects_insecure_configuration(invalid):
    config = _production_config() | invalid
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **config)


def test_production_accepts_explicit_secure_configuration():
    assert Settings(_env_file=None, **_production_config()).ENVIRONMENT == "production"


def test_invalid_configuration_traceback_does_not_include_secrets():
    secret = "private-production-secret-that-must-not-appear"
    with pytest.raises(ValidationError) as error:
        Settings(_env_file=None, **(_production_config() | {"SECRET_KEY": secret, "FRONTEND_URL": "http://example.com"}))
    assert secret not in str(error.value)
