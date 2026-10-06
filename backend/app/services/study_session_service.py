"""Serviço de sessões de estudo (execução real, ver models/study_session.py)."""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.study_session import StudySession, StudySessionStatus
from app.models.subject import Subject
from app.models.task import Task
from app.schemas.study_session import StudySessionCreate, StudySessionWithContext

ACTIVE_STATUSES = (StudySessionStatus.EM_ANDAMENTO, StudySessionStatus.PAUSADA)


def _to_with_context(session: StudySession, subject_name: Optional[str], task_title: Optional[str]) -> StudySessionWithContext:
    return StudySessionWithContext(
        id=session.id,
        subject_id=session.subject_id,
        task_id=session.task_id,
        status=session.status,
        started_at=session.started_at,
        ended_at=session.ended_at,
        elapsed_seconds=session.elapsed_seconds,
        pomodoro_cycles_completed=session.pomodoro_cycles_completed,
        created_at=session.created_at,
        updated_at=session.updated_at,
        subject_name=subject_name,
        task_title=task_title,
    )


def _close_current_segment(session: StudySession) -> None:
    """Fecha o segmento ativo atual, somando o tempo decorrido a accumulated_seconds."""
    if session.segment_started_at is None:
        return
    now = datetime.now(timezone.utc)
    started = session.segment_started_at
    if started.tzinfo is None:
        now = now.replace(tzinfo=None)
    session.accumulated_seconds += max(0, int((now - started).total_seconds()))
    session.segment_started_at = None


def get_active_session(db: Session, user_id: int) -> Optional[StudySession]:
    """Sessão em_andamento OU pausada do usuário, se houver (só pode existir uma por vez)."""
    return (
        db.query(StudySession)
        .filter(StudySession.user_id == user_id, StudySession.status.in_(ACTIVE_STATUSES))
        .first()
    )


def get_session_by_id(db: Session, session_id: int, user_id: int) -> Optional[StudySession]:
    return db.query(StudySession).filter(StudySession.id == session_id, StudySession.user_id == user_id).first()


def start_session(db: Session, payload: StudySessionCreate, user_id: int) -> Optional[StudySession]:
    """
    Retorna None se subject_id/task_id foram informados mas não pertencem ao
    usuário. A checagem de "já existe uma sessão ativa" é feita no endpoint
    (chamando get_active_session antes), não aqui.
    """
    if payload.subject_id is not None:
        if not db.query(Subject).filter(Subject.id == payload.subject_id, Subject.user_id == user_id).first():
            return None
    if payload.task_id is not None:
        if not db.query(Task).filter(Task.id == payload.task_id, Task.user_id == user_id).first():
            return None

    now = datetime.now(timezone.utc)
    session = StudySession(
        user_id=user_id,
        subject_id=payload.subject_id,
        task_id=payload.task_id,
        status=StudySessionStatus.EM_ANDAMENTO,
        started_at=now,
        segment_started_at=now,
        accumulated_seconds=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def pause_session(db: Session, session_id: int, user_id: int) -> Optional[StudySession]:
    session = get_session_by_id(db, session_id, user_id)
    if not session or session.status != StudySessionStatus.EM_ANDAMENTO:
        return None
    _close_current_segment(session)
    session.status = StudySessionStatus.PAUSADA
    db.commit()
    db.refresh(session)
    return session


def resume_session(db: Session, session_id: int, user_id: int) -> Optional[StudySession]:
    session = get_session_by_id(db, session_id, user_id)
    if not session or session.status != StudySessionStatus.PAUSADA:
        return None
    session.segment_started_at = datetime.now(timezone.utc)
    session.status = StudySessionStatus.EM_ANDAMENTO
    db.commit()
    db.refresh(session)
    return session


def stop_session(db: Session, session_id: int, user_id: int, pomodoro_cycles_completed: int) -> Optional[StudySession]:
    session = get_session_by_id(db, session_id, user_id)
    if not session or session.status not in ACTIVE_STATUSES:
        return None
    _close_current_segment(session)
    session.status = StudySessionStatus.CONCLUIDA
    session.ended_at = datetime.now(timezone.utc)
    session.pomodoro_cycles_completed = pomodoro_cycles_completed
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, session_id: int, user_id: int) -> bool:
    session = get_session_by_id(db, session_id, user_id)
    if not session:
        return False
    db.delete(session)
    db.commit()
    return True


def get_sessions_for_user(db: Session, user_id: int) -> List[StudySessionWithContext]:
    """Histórico completo (todas as sessões, mais recente primeiro)."""
    rows = (
        db.query(StudySession, Subject.name, Task.title)
        .outerjoin(Subject, StudySession.subject_id == Subject.id)
        .outerjoin(Task, StudySession.task_id == Task.id)
        .filter(StudySession.user_id == user_id)
        .order_by(StudySession.started_at.desc())
        .all()
    )
    return [_to_with_context(session, subject_name, task_title) for session, subject_name, task_title in rows]


def get_active_session_with_context(db: Session, user_id: int) -> Optional[StudySessionWithContext]:
    session = get_active_session(db, user_id)
    if not session:
        return None
    subject_name = session.subject.name if session.subject else None
    task_title = session.task.title if session.task else None
    return _to_with_context(session, subject_name, task_title)
