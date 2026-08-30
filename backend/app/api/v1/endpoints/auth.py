from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
    get_password_hash
)
from app.schemas.user import UserResponse, UserCreate, ForgotPassword, ResetPassword
from app.schemas.token import Token
from app.services import auth_service
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

@router.post("/forgot-password")
def forgot_password(
    forgot_pwd: ForgotPassword,
    db: Session = Depends(deps.get_db)
) -> Any:
    """Inicia o processo de recuperação de senha."""
    user = auth_service.get_user_by_email(db, email=forgot_pwd.email)
    if user:
        token = create_password_reset_token(email=user.email)
        # TODO: Send email with reset instructions
    return {"msg": "Se o email estiver cadastrado, instruções foram enviadas."}

@router.post("/reset-password")
def reset_password(
    reset_pwd: ResetPassword,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Redefine a senha utilizando um token válido."""
    email = verify_password_reset_token(token=reset_pwd.token)
    if not email:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    user = auth_service.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado",
        )
    user.hashed_password = get_password_hash(reset_pwd.new_password)
    db.add(user)
    db.commit()
    return {"msg": "Senha redefinida com sucesso."}
