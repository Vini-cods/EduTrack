"""Recuperação de senha: limitação, autorização e troca atômica da credencial."""

import hmac
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    get_password_hash, password_fingerprint,
    verify_password_reset_token,
)
from app.models.user import User
from app.models.recovery_delivery import RecoveryDelivery
from app.services import auth_service, email_service
from app.services.recovery_rate_limit import PasswordResetRateLimited, RecoveryRateLimiter


class InvalidPasswordReset(Exception):
    """Token inválido, expirado, já utilizado ou referente a conta indisponível."""


_rate_limiter = RecoveryRateLimiter()


def prepare_password_reset(db: Session, email: str, requester_ip: str) -> None:
    # A mesma falha/limite vale para contas existentes, inexistentes e inativas.
    email_service.ensure_configured()
    _rate_limiter.check(db, email, requester_ip)
    user = auth_service.get_user_by_email(db, email=email)
    if not user or not user.is_active:
        return
    now = datetime.now(timezone.utc)
    db.add(RecoveryDelivery(
        user_id=user.id, password_version=password_fingerprint(user.hashed_password),
        status="pending", attempts=0, created_at=now, available_at=now,
        expires_at=now + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES),
    ))
    db.commit()  # 202 só é devolvido depois de persistir a intenção de entrega.


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
