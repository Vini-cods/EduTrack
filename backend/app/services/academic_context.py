"""Resolve o contexto acadêmico sem duplicar a disciplina de uma tarefa."""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.subject import Subject
from app.models.task import Task


class AcademicContextNotFoundError(ValueError):
    """A referência não existe ou não pertence ao usuário."""


class AcademicContextMismatchError(ValueError):
    """A tarefa e a disciplina informadas não correspondem."""


def resolve_subject_id(
    db: Session, user_id: int, subject_id: Optional[int], task_id: Optional[int]
) -> Optional[int]:
    """A tarefa é a fonte da disciplina; uma seleção explícita deve concordar."""
    if subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user_id).first()
        if subject is None:
            raise AcademicContextNotFoundError("Disciplina ou tarefa não encontrada")

    if task_id is None:
        return subject_id

    task = (
        db.query(Task)
        .join(Subject, Task.subject_id == Subject.id)
        .filter(Task.id == task_id, Task.user_id == user_id, Subject.user_id == user_id)
        .first()
    )
    if task is None:
        raise AcademicContextNotFoundError("Disciplina ou tarefa não encontrada")
    if subject_id is not None and task.subject_id != subject_id:
        raise AcademicContextMismatchError("A tarefa não pertence à disciplina selecionada")
    return task.subject_id
