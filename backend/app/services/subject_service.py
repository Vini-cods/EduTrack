from sqlalchemy.orm import Session
from app.models.subject import Subject
from app.models.task import Task
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectWithProgress
from typing import List, Optional

def get_subjects(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Subject]:
    """
    Recupera as disciplinas do usuário.
    """
    return db.query(Subject).filter(Subject.user_id == user_id).offset(skip).limit(limit).all()

def get_subjects_with_progress(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[SubjectWithProgress]:
    """
    Recupera as disciplinas do usuário já incluindo o progresso de cada uma.
    """
    subjects = get_subjects(db, user_id=user_id, skip=skip, limit=limit)
    result = []
    for subject in subjects:
        total_tasks = db.query(Task).filter(Task.subject_id == subject.id).count()
        completed_tasks = db.query(Task).filter(Task.subject_id == subject.id, Task.status == "concluida").count()
        progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
        result.append(
            SubjectWithProgress(
                id=subject.id,
                name=subject.name,
                description=subject.description,
                color=subject.color,
                user_id=subject.user_id,
                created_at=subject.created_at,
                updated_at=subject.updated_at,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                progress=progress,
            )
        )
    return result

def get_subject_by_id(db: Session, subject_id: int, user_id: int) -> Optional[Subject]:
    """
    Recupera uma disciplina específica do usuário pelo ID.
    """
    return db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user_id).first()

def create_subject(db: Session, subject: SubjectCreate, user_id: int) -> Subject:
    """
    Cria uma nova disciplina para o usuário.
    """
    db_subject = Subject(
        name=subject.name,
        description=subject.description,
        color=subject.color,
        user_id=user_id
    )
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

def update_subject(db: Session, subject_id: int, subject_update: SubjectUpdate, user_id: int) -> Optional[Subject]:
    """
    Atualiza os dados de uma disciplina existente.
    """
    db_subject = get_subject_by_id(db, subject_id, user_id)
    if not db_subject:
        return None

    update_data = subject_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_subject, key, value)

    db.commit()
    db.refresh(db_subject)
    return db_subject

def delete_subject(db: Session, subject_id: int, user_id: int) -> bool:
    """
    Exclui uma disciplina do usuário.
    """
    db_subject = get_subject_by_id(db, subject_id, user_id)
    if not db_subject:
        return False

    db.delete(db_subject)
    db.commit()
    return True

def get_subject_with_progress(db: Session, subject_id: int, user_id: int) -> Optional[SubjectWithProgress]:
    """
    Retorna uma disciplina específica incluindo o progresso das tarefas.
    """
    db_subject = get_subject_by_id(db, subject_id, user_id)
    if not db_subject:
        return None

    total_tasks = db.query(Task).filter(Task.subject_id == subject_id).count()
    completed_tasks = db.query(Task).filter(Task.subject_id == subject_id, Task.status == "concluida").count()
    progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    return SubjectWithProgress(
        id=db_subject.id,
        name=db_subject.name,
        description=db_subject.description,
        color=db_subject.color,
        user_id=db_subject.user_id,
        created_at=db_subject.created_at,
        updated_at=db_subject.updated_at,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        progress=progress
    )
