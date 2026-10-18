from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.core.security import create_access_token
from app.schemas.user import UserResponse, UserCreate, ForgotPassword, ResetPassword
from app.schemas.token import Token
from app.services import auth_service, email_service, password_reset_service
from app.models.user import User

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """Registra um novo usuário no sistema."""
    user = auth_service.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="Este email já está cadastrado no sistema.",
        )
    user = auth_service.create_user(db, user_in=user_in)
    return user

@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """Realiza login para obter o token de acesso (OAuth2)."""
    user = auth_service.authenticate_user(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Usuário inativo"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retorna os dados do usuário atual logado."""
    return current_user

@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    forgot_pwd: ForgotPassword,
    request: Request,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Recebe um pedido sem revelar a existência ou o estado de uma conta."""
    try:
        password_reset_service.prepare_password_reset(
            db, forgot_pwd.email, request.client.host if request.client else "unknown",
        )
    except email_service.EmailServiceUnavailable:
        raise HTTPException(status_code=503, detail="A recuperação de senha está indisponível no momento. Tente novamente mais tarde.")
    except password_reset_service.PasswordResetRateLimited as exc:
        raise HTTPException(
            status_code=429, detail="Muitos pedidos de recuperação. Aguarde antes de tentar novamente.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        )
    return {"msg": "Pedido recebido. Se houver uma conta ativa para este e-mail, você receberá um link para redefinir a senha. Caso não receba, tente novamente em alguns minutos."}

@router.post("/reset-password")
def reset_password(
    reset_pwd: ResetPassword,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Redefine a senha utilizando um token válido."""
    try:
        password_reset_service.reset_password(db, reset_pwd.token, reset_pwd.new_password)
    except password_reset_service.InvalidPasswordReset:
        raise HTTPException(status_code=400, detail="Link inválido, expirado ou já utilizado. Solicite um novo link.")
    return {"msg": "Senha redefinida com sucesso."}
