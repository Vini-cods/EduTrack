"""Projeção pequena e somente leitura dos registros do proprietário autenticado."""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import case, or_, select
from sqlalchemy.orm import Session

from app.models.calendar_event import CalendarEvent
from app.models.study_session import StudySession
from app.models.subject import Subject
from app.models.task import Task
from app.schemas.assistant import AssistantContext, AssistantSource

CONTEXT_LIMIT = 20
SESSION_LIMIT = 5
LABEL_LIMIT = 255


def _label(value: str) -> str:
    # Limita também registros legados de SQLite, que não impõe String(255).
    return value[:LABEL_LIMIT]


def _instant(value: datetime | None) -> str | None:
    if value is None:
        return None
    # StudySession armazena instantes UTC; SQLite remove o tzinfo na leitura.
    return (value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value).isoformat()


def build_academic_context(db: Session, user_id: int, timezone_name: str):
    now = datetime.now(timezone.utc)
    local_now = now.astimezone(ZoneInfo(timezone_name))
    # CalendarEvent preserva a hora civil dos formulários, como nos analytics.
    wall_now = local_now.replace(tzinfo=None)
    owned_subjects = select(Subject.id).where(Subject.user_id == user_id)
    owned_tasks = select(Task.id).where(Task.user_id == user_id, Task.subject_id.in_(owned_subjects))
    open_tasks = db.query(Task).filter(
        Task.user_id == user_id, Task.subject_id.in_(owned_subjects), Task.status != "concluida",
    )
    pending_tasks = open_tasks.count()
    # Prazos existentes primeiro, depois urgência/estado e ID estável.
    tasks = open_tasks.order_by(
        case((Task.due_date.is_(None), 1), else_=0), Task.due_date,
        case((Task.priority == "urgente", 0), (Task.priority == "alta", 1),
             (Task.priority == "media", 2), else_=3), Task.id,
    ).limit(CONTEXT_LIMIT + 1).all()
    subjects = db.query(Subject).filter(Subject.user_id == user_id).order_by(Subject.id).limit(CONTEXT_LIMIT + 1).all()
    events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user_id,
        or_(CalendarEvent.subject_id.is_(None), CalendarEvent.subject_id.in_(owned_subjects)),
        or_(CalendarEvent.task_id.is_(None), CalendarEvent.task_id.in_(owned_tasks)),
        CalendarEvent.start_datetime < wall_now + timedelta(days=14),
        or_(CalendarEvent.start_datetime >= wall_now, CalendarEvent.end_datetime >= wall_now),
    ).order_by(CalendarEvent.start_datetime, CalendarEvent.id).limit(CONTEXT_LIMIT + 1).all()
    sessions = db.query(StudySession).filter(
        StudySession.user_id == user_id,
        or_(StudySession.subject_id.is_(None), StudySession.subject_id.in_(owned_subjects)),
        or_(StudySession.task_id.is_(None), StudySession.task_id.in_(owned_tasks)),
        StudySession.started_at >= now - timedelta(days=7), StudySession.started_at <= now,
    ).order_by(StudySession.started_at.desc(), StudySession.id.desc()).limit(SESSION_LIMIT + 1).all()
    truncated = (len(tasks) > CONTEXT_LIMIT or len(subjects) > CONTEXT_LIMIT
                 or len(events) > CONTEXT_LIMIT or len(sessions) > SESSION_LIMIT)
    tasks, subjects, events, sessions = (tasks[:CONTEXT_LIMIT], subjects[:CONTEXT_LIMIT],
                                          events[:CONTEXT_LIMIT], sessions[:SESSION_LIMIT])
    # Resolve rótulos de disciplinas de tarefas/eventos fora do recorte inicial,
    # sem lazy loading nem nomes de disciplinas alheias.
    subject_ids = {item.subject_id for item in [*tasks, *events, *sessions] if item.subject_id is not None}
    names = dict(db.query(Subject.id, Subject.name).filter(
        Subject.user_id == user_id, Subject.id.in_(subject_ids),
    ).all()) if subject_ids else {}
    names = {subject_id: _label(name) for subject_id, name in names.items()}
    truncated = truncated or any(len(item.title) > LABEL_LIMIT for item in [*tasks, *events]) or any(
        len(subject.name) > LABEL_LIMIT for subject in subjects)
    summary = AssistantContext(
        as_of=now, timezone=timezone_name, pending_tasks=pending_tasks,
        tasks_included=len(tasks), events_included=len(events), subjects_included=len(subjects), truncated=truncated,
    )
    data = {
        "summary": summary.model_dump(mode="json"),
        "today": local_now.date().isoformat(),
        "tasks": [{"id": task.id, "title": _label(task.title), "subject": names.get(task.subject_id),
                   "due_date": task.due_date.isoformat() if task.due_date else None,
                   "priority": task.priority, "status": task.status,
                   "estimated_hours": task.estimated_hours} for task in tasks],
        "subjects": [{"id": subject.id, "name": _label(subject.name)} for subject in subjects],
        "events_next_14_days": [{"id": event.id, "title": _label(event.title), "category": event.category.value,
                                 "subject": names.get(event.subject_id), "start": event.start_datetime.isoformat(),
                                 "end": event.end_datetime.isoformat() if event.end_datetime else None}
                                for event in events],
        "recent_sessions_started_last_7_days": [
            {"id": session.id, "subject": names.get(session.subject_id), "status": session.status.value,
             "started_at": _instant(session.started_at), "ended_at": _instant(session.ended_at),
             "lifetime_active_seconds_at_snapshot": session.elapsed_seconds} for session in sessions
        ],
        "limits": ("Recorte de até 20 tarefas abertas, 20 disciplinas, 20 compromissos nos próximos 14 dias "
                   "e 5 sessões iniciadas nos últimos 7 dias. Rótulos limitados a 255 caracteres. "
                   "Duração de sessão é o total ativo da sessão, "
                   "não uma distribuição por dia. Agenda sem offset usa hora civil do fuso indicado. "
                   "Não há notas de prova, conteúdo de anotações ou métricas completas de analytics neste contexto."),
    }
    sources = ([AssistantSource(kind="task", id=task.id, label=_label(task.title)) for task in tasks]
               + [AssistantSource(kind="event", id=event.id, label=_label(event.title)) for event in events]
               + [AssistantSource(kind="subject", id=subject.id, label=_label(subject.name)) for subject in subjects]
               + [AssistantSource(kind="session", id=session.id, label=names.get(session.subject_id, "Estudo livre"))
                  for session in sessions])
    return data, summary, sources
