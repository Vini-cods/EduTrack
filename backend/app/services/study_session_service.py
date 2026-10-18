"""Serviço de sessões de estudo (execução real, ver models/study_session.py)."""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import update

from app.models.study_session import StudySession, StudySessionStatus
from app.models.subject import Subject
from app.models.task import Task
from app.models.activity_history import StudySegment
from app.schemas.study_session import StudySessionCreate, StudySessionWithContext
from app.services.academic_context import AcademicContextNotFoundError, resolve_subject_id

ACTIVE_STATUSES = (StudySessionStatus.EM_ANDAMENTO, StudySessionStatus.PAUSADA)


class ActiveStudySessionError(ValueError):
    """O usuário já possui uma sessão em andamento ou pausada."""


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


def _transition(db: Session, session: StudySession, target: StudySessionStatus,
                cycles: int | None = None) -> Optional[StudySession]:
    """Estado e segmento são gravados juntos; uma disputa não contabiliza tempo duas vezes."""
    now = datetime.now(timezone.utc)
    started = session.segment_started_at
    elapsed = 0
    if started is not None:
        started = started.replace(tzinfo=timezone.utc) if started.tzinfo is None else started.astimezone(timezone.utc)
        elapsed = max(0, int((now - started).total_seconds()))
    values = {"status": target, "updated_at": now,
              "segment_started_at": now if target == StudySessionStatus.EM_ANDAMENTO else None,
              "accumulated_seconds": session.accumulated_seconds + elapsed}
    if target == StudySessionStatus.CONCLUIDA:
        values.update(ended_at=now, pomodoro_cycles_completed=cycles or 0)
    changed = db.execute(update(StudySession).where(
        StudySession.id == session.id, StudySession.user_id == session.user_id,
        StudySession.status == session.status, StudySession.updated_at == session.updated_at,
    ).values(**values).execution_options(synchronize_session=False))
    if changed.rowcount != 1:
        db.rollback()
        return None
    if started is not None and elapsed > 0:
        db.add(StudySegment(user_id=session.user_id, session_id=session.id, started_at=started,
                            ended_at=now, active_seconds=elapsed))
    db.commit()
    db.refresh(session)
    return session


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
    usuário. O endpoint verifica a sessão ativa antecipadamente; o índice
    único cobre a disputa entre requisições que passaram por essa checagem.
    """
    try:
        subject_id = resolve_subject_id(db, user_id, payload.subject_id, payload.task_id)
    except AcademicContextNotFoundError:
        return None

    now = datetime.now(timezone.utc)
    session = StudySession(
        user_id=user_id,
        subject_id=subject_id,
        task_id=payload.task_id,
        status=StudySessionStatus.EM_ANDAMENTO,
        started_at=now,
        segment_started_at=now,
        accumulated_seconds=0,
    )
    db.add(session)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if get_active_session(db, user_id) is not None:
            raise ActiveStudySessionError(
                "Já existe uma sessão de estudo em andamento ou pausada. Finalize-a antes de iniciar outra."
            ) from exc
        raise
    db.refresh(session)
    return session


def pause_session(db: Session, session_id: int, user_id: int) -> Optional[StudySession]:
    session = get_session_by_id(db, session_id, user_id)
    if not session or session.status != StudySessionStatus.EM_ANDAMENTO:
        return None
    return _transition(db, session, StudySessionStatus.PAUSADA)


def resume_session(db: Session, session_id: int, user_id: int) -> Optional[StudySession]:
    session = get_session_by_id(db, session_id, user_id)
    if not session or session.status != StudySessionStatus.PAUSADA:
        return None
    return _transition(db, session, StudySessionStatus.EM_ANDAMENTO)


def stop_session(db: Session, session_id: int, user_id: int, pomodoro_cycles_completed: int) -> Optional[StudySession]:
    session = get_session_by_id(db, session_id, user_id)
    if not session or session.status not in ACTIVE_STATUSES:
        return None
    return _transition(db, session, StudySessionStatus.CONCLUIDA, pomodoro_cycles_completed)


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
