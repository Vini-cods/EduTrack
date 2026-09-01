from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse
from app.services import task_service

router = APIRouter()

@router.get("/subject/{subject_id}", response_model=List[TaskResponse])
def read_tasks_by_subject(
    subject_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna as tarefas de uma disciplina específica.
    """
    return task_service.get_tasks_by_subject(db=db, subject_id=subject_id, user_id=current_user.id, skip=skip, limit=limit)

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova tarefa para uma disciplina do usuário.
    """
    new_task = task_service.create_task(db=db, task=task, user_id=current_user.id)
    if not new_task:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada ou não pertence ao usuário")
    return new_task

@router.get("/{task_id}", response_model=TaskResponse)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna uma tarefa específica.
    """
    task = task_service.get_task_by_id(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza uma tarefa do usuário.
    """
    task = task_service.update_task(db=db, task_id=task_id, task_update=task_in, user_id=current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return task

@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    status_in: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza apenas o status de uma tarefa.
    """
    task = task_service.update_task_status(db=db, task_id=task_id, status_update=status_in, user_id=current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove uma tarefa do usuário.
    """
    success = task_service.delete_task(db=db, task_id=task_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
