from sqlalchemy.orm import Session
from sqlalchemy import case
from app.models.task import Task
from app.models.subject import Subject
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskWithSubject
from typing import List, Optional

def get_tasks_by_subject(db: Session, subject_id: int, user_id: int, skip: int = 0, limit: int = 100) -> List[Task]:
    """
    Retorna todas as tarefas de uma disciplina específica do usuário.
    """
    return db.query(Task).join(Subject).filter(
        Task.subject_id == subject_id,
        Subject.user_id == user_id
    ).offset(skip).limit(limit).all()

def get_tasks_for_user(db: Session, user_id: int) -> List[TaskWithSubject]:
    """
    Retorna TODAS as tarefas do usuário (de todas as disciplinas), já com o
    nome e a cor da disciplina anexados.

    Existe para servir telas que precisam da visão completa (página de Tarefas,
    Dashboard) sem que o frontend precise fazer uma chamada por disciplina.
    Ordena por data de entrega (tarefas sem prazo vão para o final) e, dentro
    do mesmo prazo, pelas mais recentes primeiro.
    """
    rows = (
        db.query(Task, Subject.name, Subject.color)
        .join(Subject, Task.subject_id == Subject.id)
        .filter(Subject.user_id == user_id)
        .order_by(
            case((Task.due_date.is_(None), 1), else_=0),
            Task.due_date.asc(),
            Task.created_at.desc(),
        )
        .all()
    )

    result: List[TaskWithSubject] = []
    for task, subject_name, subject_color in rows:
        result.append(
            TaskWithSubject(
                id=task.id,
                title=task.title,
                description=task.description,
                due_date=task.due_date,
                status=task.status,
                priority=task.priority,
                estimated_hours=task.estimated_hours,
                subject_id=task.subject_id,
                created_at=task.created_at,
                updated_at=task.updated_at,
                subject_name=subject_name,
                subject_color=subject_color,
            )
        )
    return result

def get_task_by_id(db: Session, task_id: int, user_id: int) -> Optional[Task]:
    """
    Retorna uma tarefa específica do usuário.
    """
    return db.query(Task).join(Subject).filter(
        Task.id == task_id,
        Subject.user_id == user_id
    ).first()

def create_task(db: Session, task: TaskCreate, user_id: int) -> Optional[Task]:
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
        priority=task.priority,
        estimated_hours=task.estimated_hours,
        subject_id=task.subject_id,
        user_id=user_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task_update: TaskUpdate, user_id: int) -> Optional[Task]:
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

def update_task_status(db: Session, task_id: int, status_update: TaskStatusUpdate, user_id: int) -> Optional[Task]:
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

def delete_task(db: Session, task_id: int, user_id: int) -> bool:
    """
    Remove uma tarefa específica.
    """
    db_task = get_task_by_id(db, task_id, user_id)
    if not db_task:
        return False

    db.delete(db_task)
    db.commit()
    return True
