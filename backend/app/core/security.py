import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash."""
    if len(plain_password.encode("utf-8")) > 72:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Retorna o hash bcrypt de uma senha."""
    if len(password.encode("utf-8")) > 72:
        raise ValueError("A senha não pode ultrapassar 72 bytes em UTF-8.")
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    """Cria um JWT para acesso."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def password_fingerprint(hashed_password: str) -> str:
    """Vincula a autorização ao hash atual sem expor esse hash no JWT."""
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        f"password-reset:{hashed_password}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


@dataclass(frozen=True)
class PasswordResetClaims:
    user_id: int
    password_version: str


def create_password_reset_token(user_id: int, hashed_password: str) -> str:
    """Emite autorização curta, invalidada quando a senha atual é alterada."""
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "exp": now + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES),
            "iat": now,
            "sub": str(user_id),
            "jti": secrets.token_urlsafe(16),
            "type": "reset",
            "purpose": "password_reset",
            "password_version": password_fingerprint(hashed_password),
        },
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )

def verify_password_reset_token(token: str) -> PasswordResetClaims | None:
    """Valida assinatura, prazo e finalidade; o serviço confere o estado atual."""
    try:
        claims = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM],
            options={"require_exp": True, "require_sub": True, "require_iat": True},
        )
        if claims.get("type") != "reset" or claims.get("purpose") != "password_reset":
            return None
        user_id = int(claims["sub"])
        version = claims.get("password_version")
        if user_id < 1 or not isinstance(version, str) or re.fullmatch(r"[a-f0-9]{64}", version) is None:
            return None
        return PasswordResetClaims(user_id=user_id, password_version=version)
    except (jwt.JWTError, ValueError, TypeError, KeyError):
        return None
