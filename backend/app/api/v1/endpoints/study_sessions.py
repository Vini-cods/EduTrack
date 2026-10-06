from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.study_session import (
    StudySessionCreate,
    StudySessionStopInput,
    StudySessionResponse,
    StudySessionWithContext,
)
from app.services import study_session_service

router = APIRouter()


@router.get("/active", response_model=Optional[StudySessionWithContext])
def read_active_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Sessão em andamento ou pausada do usuário, se houver (null caso contrário)."""
    return study_session_service.get_active_session_with_context(db=db, user_id=current_user.id)


@router.get("/", response_model=List[StudySessionWithContext])
def read_session_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Histórico completo de sessões, mais recente primeiro."""
    return study_session_service.get_sessions_for_user(db=db, user_id=current_user.id)


@router.post("/", response_model=StudySessionResponse, status_code=201)
def start_session(
    payload: StudySessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Inicia uma nova sessão. Falha com 409 se já existir uma em andamento/pausada."""
    if study_session_service.get_active_session(db=db, user_id=current_user.id) is not None:
        raise HTTPException(
            status_code=409,
            detail="Já existe uma sessão de estudo em andamento ou pausada. Finalize-a antes de iniciar outra.",
        )
    session = study_session_service.start_session(db=db, payload=payload, user_id=current_user.id)
    if session is None:
        raise HTTPException(status_code=404, detail="Disciplina ou tarefa não encontrada")
    return session


@router.patch("/{session_id}/pause", response_model=StudySessionResponse)
def pause_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = study_session_service.pause_session(db=db, session_id=session_id, user_id=current_user.id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou não está em andamento")
    return session


@router.patch("/{session_id}/resume", response_model=StudySessionResponse)
def resume_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = study_session_service.resume_session(db=db, session_id=session_id, user_id=current_user.id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou não está pausada")
    return session


@router.patch("/{session_id}/stop", response_model=StudySessionResponse)
def stop_session(
    session_id: int,
    payload: StudySessionStopInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = study_session_service.stop_session(
        db=db, session_id=session_id, user_id=current_user.id, pomodoro_cycles_completed=payload.pomodoro_cycles_completed
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou já finalizada")
    return session


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = study_session_service.delete_session(db=db, session_id=session_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return None
