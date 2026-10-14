"""Serviço de eventos de calendário."""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.calendar_event import CalendarEvent
from app.models.subject import Subject
from app.models.task import Task
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventWithSubject,
    CalendarEventValidationError,
    RecurrenceInput,
    validate_interval,
)
from app.services.academic_context import AcademicContextNotFoundError, resolve_subject_id

# Limite de ocorrências geradas por série recorrente. Evita que um `until`
# muito distante (ex.: daqui a 10 anos) crie milhares de linhas de uma vez.
# 260 cobre ~1 ano de aulas duas vezes por semana, bem acima do que um
# semestre real precisa.
MAX_OCCURRENCES = 260


def expand_recurrence(
    start_datetime: datetime, end_datetime: Optional[datetime], recurrence: RecurrenceInput
) -> List[Tuple[datetime, Optional[datetime]]]:
    """
    Gera as datas concretas de uma série recorrente.

    Ver a decisão de arquitetura no topo de models/calendar_event.py: em vez
    de guardar uma regra RRULE e expandi-la a cada consulta, cada ocorrência
    vira uma linha própria já na criação. Esta função só é chamada uma vez,
    no momento de criar a série.
    """
    duration = (end_datetime - start_datetime) if end_datetime else None
    days_of_week = set(recurrence.days_of_week) if recurrence.days_of_week else {start_datetime.weekday()}

    occurrences: List[Tuple[datetime, Optional[datetime]]] = []
    current = start_datetime
    while current.date() <= recurrence.until and len(occurrences) < MAX_OCCURRENCES:
        matches = recurrence.type == "daily" or current.weekday() in days_of_week
        if matches:
            occurrences.append((current, current + duration if duration else None))
        current += timedelta(days=1)

    return occurrences


def _to_with_subject(
    event: CalendarEvent, subject_name: Optional[str], task_title: Optional[str] = None
) -> CalendarEventWithSubject:
    return CalendarEventWithSubject(
        id=event.id,
        title=event.title,
        description=event.description,
        category=event.category,
        subject_id=event.subject_id,
        task_id=event.task_id,
        location=event.location,
        color=event.color,
        start_datetime=event.start_datetime,
        end_datetime=event.end_datetime,
        recurrence_group_id=event.recurrence_group_id,
        created_at=event.created_at,
        updated_at=event.updated_at,
        subject_name=subject_name,
        task_title=task_title,
    )


def get_events_for_user(
    db: Session, user_id: int, start: Optional[datetime] = None, end: Optional[datetime] = None
) -> List[CalendarEventWithSubject]:
    """
    Lista eventos do usuário, opcionalmente restritos a um intervalo — usado
    pelas visões de mês/semana/dia, que só precisam carregar o período
    visível em vez de todos os eventos do usuário.

    O intervalo de consulta é [start, end): inclui o início, exclui o fim.
    Inclui qualquer sobreposição com esse intervalo, inclusive blocos que
    começam no dia anterior e atravessam a meia-noite. Eventos sem fim
    ou com duração zero são tratados como um instante no horário de início.
    """
    if start is not None and end is not None and start == end:
        return []
    query = (
        db.query(CalendarEvent, Subject.name, Task.title)
        .outerjoin(Subject, CalendarEvent.subject_id == Subject.id)
        .outerjoin(Task, CalendarEvent.task_id == Task.id)
        .filter(CalendarEvent.user_id == user_id)
    )
    if start is not None:
        query = query.filter(or_(CalendarEvent.end_datetime > start, CalendarEvent.start_datetime >= start))
    if end is not None:
        query = query.filter(CalendarEvent.start_datetime < end)

    rows = query.order_by(CalendarEvent.start_datetime.asc()).all()
    return [_to_with_subject(event, subject_name, task_title) for event, subject_name, task_title in rows]


def get_event_by_id(db: Session, event_id: int, user_id: int) -> Optional[CalendarEvent]:
    return db.query(CalendarEvent).filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user_id).first()


def create_events(db: Session, payload: CalendarEventCreate, user_id: int) -> Optional[List[CalendarEvent]]:
    """
    Cria um evento único ou, se `recurrence` vier preenchido, a série inteira
    de ocorrências de uma vez. Retorna None se `subject_id`/`task_id` foram
    informados mas não pertencem ao usuário (mesma validação de ownership
    usada em tasks).
    """
    try:
        subject_id = resolve_subject_id(db, user_id, payload.subject_id, payload.task_id)
    except AcademicContextNotFoundError:
        return None

    common = dict(
        user_id=user_id,
        subject_id=subject_id,
        task_id=payload.task_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        location=payload.location,
        color=payload.color,
    )

    if payload.recurrence is None:
        db_event = CalendarEvent(
            **common,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
            recurrence_group_id=None,
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return [db_event]

    occurrences = expand_recurrence(payload.start_datetime, payload.end_datetime, payload.recurrence)
    if not occurrences:
        raise CalendarEventValidationError("A recorrência não contém nenhuma ocorrência no intervalo selecionado")
    group_id = uuid.uuid4().hex
    db_events = [
        CalendarEvent(**common, start_datetime=occ_start, end_datetime=occ_end, recurrence_group_id=group_id)
        for occ_start, occ_end in occurrences
    ]
    db.add_all(db_events)
    db.commit()
    for e in db_events:
        db.refresh(e)
    return db_events


def update_event(db: Session, event_id: int, update: CalendarEventUpdate, user_id: int) -> Optional[CalendarEvent]:
    """Atualiza uma ocorrência específica (mesmo que ela pertença a uma série)."""
    db_event = get_event_by_id(db, event_id, user_id)
    if not db_event:
        return None

    update_data = update.model_dump(exclude_unset=True)

    new_task_id = update_data.get("task_id", db_event.task_id)
    # Ao trocar somente a tarefa, derive a disciplina da nova seleção.
    # Ao manter a tarefa, valide também a disciplina já persistida.
    default_subject_id = db_event.subject_id
    if "task_id" in update_data and new_task_id is not None:
        default_subject_id = None
    new_subject_id = update_data.get("subject_id", default_subject_id)
    try:
        resolved_subject_id = resolve_subject_id(db, user_id, new_subject_id, new_task_id)
    except AcademicContextNotFoundError:
        return None
    if new_task_id is not None or "subject_id" in update_data:
        update_data["subject_id"] = resolved_subject_id

    validate_interval(
        update_data.get("start_datetime", db_event.start_datetime),
        update_data.get("end_datetime", db_event.end_datetime),
    )

    for key, value in update_data.items():
        setattr(db_event, key, value)

    db.commit()
    db.refresh(db_event)
    return db_event


def delete_event(db: Session, event_id: int, user_id: int) -> bool:
    db_event = get_event_by_id(db, event_id, user_id)
    if not db_event:
        return False
    db.delete(db_event)
    db.commit()
    return True


def delete_series(db: Session, recurrence_group_id: str, user_id: int) -> int:
    """Remove todas as ocorrências de uma série recorrente. Retorna quantas foram removidas."""
    deleted = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.recurrence_group_id == recurrence_group_id,
            CalendarEvent.user_id == user_id,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted
