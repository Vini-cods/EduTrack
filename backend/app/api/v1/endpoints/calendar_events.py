from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventCreateResult,
    CalendarEventUpdate,
    CalendarEventResponse,
    CalendarEventWithSubject,
)
from app.services import calendar_event_service

router = APIRouter()


@router.get("/", response_model=List[CalendarEventWithSubject])
def read_calendar_events(
    start: Optional[str] = Query(None, description="Início do intervalo (ISO 8601), inclusive"),
    end: Optional[str] = Query(None, description="Fim do intervalo (ISO 8601), inclusive"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lista os eventos do usuário. `start`/`end` restringem ao período visível
    (mês/semana/dia) em vez de carregar o histórico inteiro.
    """
    from datetime import datetime

    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None
    return calendar_event_service.get_events_for_user(db=db, user_id=current_user.id, start=start_dt, end=end_dt)


@router.post("/", response_model=CalendarEventCreateResult, status_code=201)
def create_calendar_event(
    event: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cria um evento. Se `recurrence` for enviado, cria todas as ocorrências da
    série de uma vez e retorna a lista completa junto com o
    `recurrence_group_id` compartilhado por elas.
    """
    created = calendar_event_service.create_events(db=db, payload=event, user_id=current_user.id)
    if created is None:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    group_id = created[0].recurrence_group_id if created else None
    return CalendarEventCreateResult(events=created, recurrence_group_id=group_id)


@router.put("/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: int,
    event_update: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma ocorrência específica (mesmo que pertença a uma série recorrente)."""
    updated = calendar_event_service.update_event(db=db, event_id=event_id, update=event_update, user_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return updated


@router.delete("/series/{recurrence_group_id}", status_code=204)
def delete_calendar_event_series(
    recurrence_group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove todas as ocorrências de uma série recorrente de uma vez."""
    deleted = calendar_event_service.delete_series(db=db, recurrence_group_id=recurrence_group_id, user_id=current_user.id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Série de eventos não encontrada")
    return None


@router.delete("/{event_id}", status_code=204)
def delete_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove uma única ocorrência."""
    success = calendar_event_service.delete_event(db=db, event_id=event_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return None
