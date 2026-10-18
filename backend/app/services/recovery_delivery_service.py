"""Outbox persistente com reserva atômica, expiração e retry limitado."""

import hmac
import logging
import secrets
import smtplib
from datetime import timedelta
from urllib.parse import quote

from sqlalchemy import and_, delete, func, or_, select, update

from app.core.config import settings
from app.core.security import create_password_reset_token, password_fingerprint
from app.db.session import SessionLocal
from app.models.recovery_delivery import RecoveryDelivery
from app.models.user import User
from app.services import email_service
from app.services.recovery_rate_limit import as_utc, utcnow

logger = logging.getLogger(__name__)


def _eligible(now):
    return or_(
        and_(RecoveryDelivery.status == "pending", RecoveryDelivery.available_at <= now),
        and_(RecoveryDelivery.status == "sending", RecoveryDelivery.lease_until <= now),
    )


def deliver_one(session_factory=SessionLocal) -> bool:
    """Processa no máximo uma mensagem. Não mantém transação aberta no SMTP."""
    now = utcnow()
    lease = secrets.token_hex(24)
    with session_factory() as db:
        delivery_id = db.scalar(select(RecoveryDelivery.id).where(_eligible(now))
                                .order_by(RecoveryDelivery.available_at, RecoveryDelivery.id).limit(1))
        # Fecha a leitura antes da disputa pelo UPDATE, importante no SQLite.
        db.commit()
        if delivery_id is None:
            return False
        claimed = db.execute(update(RecoveryDelivery)
                             .where(RecoveryDelivery.id == delivery_id, _eligible(now))
                             .values(status="sending", lease_token=lease,
                                     lease_until=now + timedelta(seconds=settings.MAIL_LEASE_SECONDS),
                                     attempts=RecoveryDelivery.attempts + 1))
        db.commit()
        if claimed.rowcount != 1:
            return False
        delivery = db.get(RecoveryDelivery, delivery_id)
        user = db.get(User, delivery.user_id)
        attempts = delivery.attempts
        expired = as_utc(delivery.expires_at) <= now
        invalid = not user or not user.is_active or not hmac.compare_digest(
            password_fingerprint(user.hashed_password), delivery.password_version,
        )
        if expired or invalid or attempts > settings.MAIL_MAX_ATTEMPTS:
            outcome = "failed" if attempts > settings.MAIL_MAX_ATTEMPTS else "discarded"
            recipient = reset_url = None
        else:
            recipient = user.email
            token = create_password_reset_token(user.id, user.hashed_password)
            reset_url = f"{settings.FRONTEND_URL}/reset-password#token={quote(token, safe='')}"
            outcome = "sent"
    if recipient is not None:
        try:
            email_service.send_password_reset_email(recipient, reset_url)
        except (smtplib.SMTPException, OSError, ValueError, email_service.EmailServiceUnavailable):
            # Servidores SMTP podem incluir destinatário ou conteúdo no erro.
            # Só o resultado operacional é registrado, nunca str(exc)/traceback.
            outcome = "failed" if attempts >= settings.MAIL_MAX_ATTEMPTS else "pending"
    finished = utcnow()
    delay = min(3600, settings.MAIL_RETRY_BASE_SECONDS * 2 ** (attempts - 1))
    with session_factory() as db:
        db.execute(update(RecoveryDelivery)
                   .where(RecoveryDelivery.id == delivery_id, RecoveryDelivery.lease_token == lease)
                   .values(status=outcome, lease_token=None, lease_until=None,
                           available_at=finished + timedelta(seconds=delay),
                           finished_at=None if outcome == "pending" else finished))
        db.commit()
    log = logger.warning if outcome in {"pending", "failed"} else logger.info
    log("recovery_delivery id=%s outcome=%s attempt=%s", delivery_id, outcome, attempts)
    return True


def queue_status(session_factory=SessionLocal) -> dict[str, int]:
    with session_factory() as db:
        return dict(db.execute(select(RecoveryDelivery.status, func.count())
                               .group_by(RecoveryDelivery.status)).all())


def prune_finished(session_factory=SessionLocal) -> None:
    cutoff = utcnow() - timedelta(days=settings.MAIL_RETENTION_DAYS)
    with session_factory() as db:
        db.execute(delete(RecoveryDelivery).where(RecoveryDelivery.finished_at < cutoff,
                   RecoveryDelivery.status.in_(("sent", "failed", "discarded"))))
        db.commit()
