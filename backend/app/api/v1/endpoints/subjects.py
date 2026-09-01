from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse, SubjectWithProgress
from app.services import subject_service

router = APIRouter()

@router.get("/", response_model=List[SubjectWithProgress])
def read_subjects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna as disciplinas do usuário atual, já com o progresso calculado.
    """
    return subject_service.get_subjects_with_progress(db=db, user_id=current_user.id, skip=skip, limit=limit)

@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova disciplina para o usuário atual.
    """
    return subject_service.create_subject(db=db, subject=subject, user_id=current_user.id)

@router.get("/{subject_id}", response_model=SubjectWithProgress)
def read_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna uma disciplina específica e seu progresso.
    """
    subject = subject_service.get_subject_with_progress(db=db, subject_id=subject_id, user_id=current_user.id)
    if not subject:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    return subject

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    subject_in: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza uma disciplina do usuário.
    """
    subject = subject_service.update_subject(db=db, subject_id=subject_id, subject_update=subject_in, user_id=current_user.id)
    if not subject:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    return subject

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove uma disciplina do usuário.
    """
    success = subject_service.delete_subject(db=db, subject_id=subject_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
