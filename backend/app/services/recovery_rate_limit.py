"""Janela deslizante compartilhada pelo banco; decisões email/IP são atômicas."""

import hashlib
import hmac
import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.recovery_delivery import RecoveryRateEvent, RecoveryRateLock


class PasswordResetRateLimited(Exception):
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Limite de pedidos de recuperação de senha.")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


class RecoveryRateLimiter:
    @staticmethod
    def _key(kind: str, value: str) -> str:
        return hmac.new(settings.SECRET_KEY.encode(), f"reset-request:{kind}:{value}".encode(), hashlib.sha256).hexdigest()

    @staticmethod
    def _lock(db: Session) -> None:
        result = db.execute(update(RecoveryRateLock).where(RecoveryRateLock.id == 1)
                            .values(generation=RecoveryRateLock.generation + 1))
        if result.rowcount == 0:
            # A migration já semeia esta linha. Também suporta bancos de teste
            # criados via metadata, sem depender de estado global do processo.
            try:
                with db.begin_nested():
                    db.add(RecoveryRateLock(id=1, generation=0))
                    db.flush()
            except IntegrityError:
                pass
            db.execute(update(RecoveryRateLock).where(RecoveryRateLock.id == 1)
                       .values(generation=RecoveryRateLock.generation + 1))

    def check(self, db: Session, email: str, requester_ip: str) -> None:
        # A transação é curta, sem consulta de usuário nem transporte de rede.
        # O UPDATE da linha comum serializa escritores SQLite e SQL Server.
        self._lock(db)
        now = utcnow()  # calcula depois de obter o lock, inclusive sob contenção
        cutoff = now - timedelta(seconds=settings.RESET_REQUEST_WINDOW_SECONDS)
        db.execute(delete(RecoveryRateEvent).where(RecoveryRateEvent.requested_at <= cutoff))
        policies = (
            (self._key("email", email.casefold()), settings.RESET_REQUEST_EMAIL_LIMIT, True),
            (self._key("ip", requester_ip), settings.RESET_REQUEST_IP_LIMIT, False),
        )
        for key, limit, cooldown in policies:
            times = db.scalars(select(RecoveryRateEvent.requested_at)
                               .where(RecoveryRateEvent.bucket == key)
                               .order_by(RecoveryRateEvent.requested_at)).all()
            wait = 0.0
            if len(times) >= limit:
                wait = (as_utc(times[0]) + timedelta(seconds=settings.RESET_REQUEST_WINDOW_SECONDS) - now).total_seconds()
            if cooldown and times:
                wait = max(wait, (as_utc(times[-1]) + timedelta(seconds=settings.RESET_REQUEST_COOLDOWN_SECONDS) - now).total_seconds())
            if wait > 0:
                db.rollback()
                raise PasswordResetRateLimited(max(1, math.ceil(wait)))
        db.add_all(RecoveryRateEvent(bucket=key, requested_at=now) for key, _, _ in policies)
        db.commit()
