from sqlalchemy.orm import Session
from uuid import UUID
from app.models.task import Task
from app.models.subject import Subject
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate
from typing import List, Optional

def get_tasks_by_subject(db: Session, subject_id: UUID, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Task]:
    """
    Retorna todas as tarefas de uma disciplina específica do usuário.
    """
    return db.query(Task).join(Subject).filter(
        Task.subject_id == subject_id, 
        Subject.user_id == user_id
    ).offset(skip).limit(limit).all()

def get_task_by_id(db: Session, task_id: UUID, user_id: UUID) -> Optional[Task]:
    """
    Retorna uma tarefa específica do usuário.
    """
    return db.query(Task).join(Subject).filter(
        Task.id == task_id, 
        Subject.user_id == user_id
    ).first()

def create_task(db: Session, task: TaskCreate, user_id: UUID) -> Optional[Task]:
    """
    Cria uma nova tarefa garantindo que a disciplina pertence ao usuário.
    """
    subject = db.query(Subject).filter(Subject.id == task.subject_id, Subject.user_id == user_id).first()
    if not subject:
        return None
        
    db_task = Task(
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        status=task.status,
        subject_id=task.subject_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: UUID, task_update: TaskUpdate, user_id: UUID) -> Optional[Task]:
    """
    Atualiza uma tarefa existente do usuário.
    """
    db_task = get_task_by_id(db, task_id, user_id)
    if not db_task:
        return None
        
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task_status(db: Session, task_id: UUID, status_update: TaskStatusUpdate, user_id: UUID) -> Optional[Task]:
    """
    Atualiza apenas o status de uma tarefa.
    """
    db_task = get_task_by_id(db, task_id, user_id)
    if not db_task:
        return None
        
    db_task.status = status_update.status
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: UUID, user_id: UUID) -> bool:
    """
    Remove uma tarefa específica.
    """
    db_task = get_task_by_id(db, task_id, user_id)
    if not db_task:
        return False
        
    db.delete(db_task)
    db.commit()
    return True
