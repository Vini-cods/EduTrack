"""Recuperação de senha: limitação, autorização e troca atômica da credencial."""

import hashlib
import hmac
import math
import threading
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from time import monotonic
from urllib.parse import quote

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_password_reset_token, get_password_hash, password_fingerprint,
    verify_password_reset_token,
)
from app.models.user import User
from app.services import auth_service, email_service


class InvalidPasswordReset(Exception):
    """Token inválido, expirado, já utilizado ou referente a conta indisponível."""


class PasswordResetRateLimited(Exception):
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Limite de pedidos de recuperação de senha.")


class RecoveryRateLimiter:
    """Limite em memória por processo; produção multiworker requer cache comum."""

    MAX_BUCKETS = 10_000

    def __init__(self):
        self._buckets: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._next_cleanup = 0.0

    @staticmethod
    def _key(kind: str, value: str) -> str:
        return hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            f"reset-request:{kind}:{value}".encode("utf-8"), hashlib.sha256,
        ).hexdigest()

    def check(self, email: str, requester_ip: str) -> None:
        now = monotonic()
        cutoff = now - settings.RESET_REQUEST_WINDOW_SECONDS
        policies = (
            (self._key("email", email.casefold()), settings.RESET_REQUEST_EMAIL_LIMIT, True),
            (self._key("ip", requester_ip), settings.RESET_REQUEST_IP_LIMIT, False),
        )
        with self._lock:
            if now >= self._next_cleanup:
                self._buckets = {key: values for key, values in self._buckets.items()
                                 if values and values[-1] > cutoff}
                self._next_cleanup = now + 60
            buckets = []
            for key, limit, cooldown in policies:
                values = self._buckets.get(key, deque())
                while values and values[0] <= cutoff:
                    values.popleft()
                wait = 0.0
                if len(values) >= limit:
                    wait = values[0] + settings.RESET_REQUEST_WINDOW_SECONDS - now
                if cooldown and values:
                    wait = max(wait, values[-1] + settings.RESET_REQUEST_COOLDOWN_SECONDS - now)
                if wait > 0:
                    raise PasswordResetRateLimited(max(1, math.ceil(wait)))
                buckets.append((key, values))
            if len(self._buckets) + sum(key not in self._buckets for key, _ in buckets) > self.MAX_BUCKETS:
                raise PasswordResetRateLimited(60)
            # Consome ambos somente se todas as políticas permitirem o pedido.
            for key, values in buckets:
                values.append(now)
                self._buckets[key] = values


_rate_limiter = RecoveryRateLimiter()


@dataclass(frozen=True, repr=False)
class PasswordResetEmail:
    recipient: str
    reset_url: str


def prepare_password_reset(db: Session, email: str, requester_ip: str) -> PasswordResetEmail | None:
    # A mesma falha/limite vale para contas existentes, inexistentes e inativas.
    email_service.ensure_configured()
    _rate_limiter.check(email, requester_ip)
    user = auth_service.get_user_by_email(db, email=email)
    if not user or not user.is_active:
        return None
    token = create_password_reset_token(user.id, user.hashed_password)
    # Fragmentos não são enviados no GET e evitam tokens em access logs/referrers.
    reset_url = f"{settings.FRONTEND_URL}/reset-password#token={quote(token, safe='')}"
    return PasswordResetEmail(recipient=user.email, reset_url=reset_url)


def reset_password(db: Session, token: str, new_password: str) -> None:
    claims = verify_password_reset_token(token)
    if claims is None:
        raise InvalidPasswordReset()
    user = db.get(User, claims.user_id)
    if (not user or not user.is_active
            or not hmac.compare_digest(password_fingerprint(user.hashed_password), claims.password_version)):
        raise InvalidPasswordReset()
    current_hash = user.hashed_password
    result = db.execute(
        update(User)
        .where(User.id == user.id, User.is_active.is_(True), User.hashed_password == current_hash)
        .values(hashed_password=get_password_hash(new_password), updated_at=datetime.now(timezone.utc))
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        db.rollback()
        raise InvalidPasswordReset()
    db.commit()
    db.expire_all()
