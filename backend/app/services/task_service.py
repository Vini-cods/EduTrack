from sqlalchemy.orm import Session
from sqlalchemy import case, update
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from app.models.activity_history import TaskStatusEvent
from app.models.task import Task
from app.models.subject import Subject
from app.models.calendar_event import CalendarEvent
from app.models.note import Note
from app.models.academic_record import Assessment
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskWithSubject
from app.services.calendar_event_service import is_duplicate_class_error
from typing import List, Optional


class TaskStateConflict(ValueError):
    pass


def _change_status(db: Session, task: Task, new_status: str) -> None:
    old_status = task.status
    if old_status == new_status:
        return
    now = datetime.now(timezone.utc)
    changed = db.execute(update(Task).where(
        Task.id == task.id, Task.user_id == task.user_id, Task.status == old_status,
        Task.updated_at == task.updated_at,
    ).values(status=new_status, completed_at=now if new_status == "concluida" else None,
             updated_at=now).execution_options(synchronize_session=False))
    if changed.rowcount != 1:
        db.rollback()
        raise TaskStateConflict("A tarefa mudou em outra requisição. Atualize a lista e tente novamente.")
    db.add(TaskStatusEvent(user_id=task.user_id, task_id=task.id, from_status=old_status,
                           to_status=new_status, occurred_at=now))
    db.expire(task, ["status", "completed_at", "updated_at"])

def get_tasks_by_subject(db: Session, subject_id: int, user_id: int, skip: int = 0, limit: int = 100) -> List[Task]:
    """
    Retorna todas as tarefas de uma disciplina específica do usuário.
    """
    return db.query(Task).join(Subject).filter(
        Task.subject_id == subject_id,
        Task.user_id == user_id,
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
        .filter(Task.user_id == user_id, Subject.user_id == user_id)
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
                completed_at=task.completed_at,
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
        Task.user_id == user_id,
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
        user_id=user_id,
        completed_at=datetime.now(timezone.utc) if task.status == "concluida" else None,
    )
    db.add(db_task)
    db.flush()
    db.add(TaskStatusEvent(user_id=user_id, task_id=db_task.id, from_status=None,
                           to_status=task.status, occurred_at=db_task.completed_at or db_task.created_at))
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
    new_subject_id = update_data.get("subject_id", db_task.subject_id)
    if new_subject_id != db_task.subject_id:
        subject = db.query(Subject).filter(Subject.id == new_subject_id, Subject.user_id == user_id).first()
        if subject is None:
            return None
        # A agenda acompanha a intenção atual. Execuções mantêm a disciplina
        # registrada ao iniciar, preservando a atribuição histórica das horas.
        try:
            db.query(CalendarEvent).filter(
                CalendarEvent.task_id == task_id, CalendarEvent.user_id == user_id
            ).update({CalendarEvent.subject_id: new_subject_id}, synchronize_session="fetch")
        except IntegrityError as exc:
            db.rollback()
            if is_duplicate_class_error(exc):
                raise TaskStateConflict(
                    "Já existe uma aula na disciplina de destino com a mesma data e horário. "
                    "Revise a agenda antes de mover a tarefa."
                ) from exc
            raise
        # Notas da tarefa acompanham sua disciplina atual; as de execução
        # mantêm o contexto histórico da sessão, assim como StudySession.
        db.query(Note).filter(
            Note.task_id == task_id, Note.user_id == user_id, Note.study_session_id.is_(None)
        ).update({Note.subject_id: new_subject_id}, synchronize_session="fetch")
        # Resultados pertencem à disciplina da avaliação, não à intenção movida.
        db.query(Assessment).filter(Assessment.task_id == task_id, Assessment.user_id == user_id).update(
            {Assessment.task_id: None}, synchronize_session="fetch")
    if "status" in update_data:
        _change_status(db, db_task, update_data.pop("status"))
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

    _change_status(db, db_task, status_update.status)
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
