"""Schemas Pydantic para eventos de calendário."""

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.calendar_event import EventCategory


class RecurrenceInput(BaseModel):
    """
    Regra de recorrência aceita apenas na criação de um evento.

    Não é persistida como regra abstrata — é usada uma única vez para gerar
    as ocorrências concretas (ver `calendar_event_service.expand_recurrence`
    e o comentário de arquitetura em `models/calendar_event.py`).
    """

    type: Literal["daily", "weekly"]
    # Obrigatório para 'weekly' (0=segunda ... 6=domingo); ignorado para 'daily'.
    days_of_week: Optional[List[int]] = None
    until: date

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None:
            if not v:
                raise ValueError("days_of_week não pode ser uma lista vazia")
            for d in v:
                if d < 0 or d > 6:
                    raise ValueError("days_of_week deve conter valores entre 0 (segunda) e 6 (domingo)")
        return v


class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: EventCategory = EventCategory.EVENTO
    subject_id: Optional[int] = None
    # Preenchido quando este evento é a sessão agendada de um objetivo do
    # Study Planner (ver comentário em models/calendar_event.py).
    task_id: Optional[int] = None
    location: Optional[str] = None
    color: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None

    @field_validator("end_datetime")
    @classmethod
    def end_after_start(cls, v: Optional[datetime], info):
        start = info.data.get("start_datetime")
        if v is not None and start is not None and v < start:
            raise ValueError("end_datetime não pode ser anterior a start_datetime")
        return v


class CalendarEventCreate(CalendarEventBase):
    recurrence: Optional[RecurrenceInput] = None

    @model_validator(mode="after")
    def recurrence_until_after_start(self) -> "CalendarEventCreate":
        if self.recurrence is not None and self.recurrence.until < self.start_datetime.date():
            raise ValueError("A data final da recorrência não pode ser anterior à data de início do evento")
        return self


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[EventCategory] = None
    subject_id: Optional[int] = None
    task_id: Optional[int] = None
    location: Optional[str] = None
    color: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None


class CalendarEventResponse(CalendarEventBase):
    id: int
    recurrence_group_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CalendarEventWithSubject(CalendarEventResponse):
    """Resposta com nome da disciplina e (quando houver) título da tarefa vinculada."""

    subject_name: Optional[str] = None
    task_title: Optional[str] = None


class CalendarEventCreateResult(BaseModel):
    """
    Retorno da criação: sempre uma lista, porque um evento recorrente cria
    várias ocorrências de uma vez. Um evento único vem como lista de 1 item.
    """

    events: List[CalendarEventResponse]
    recurrence_group_id: Optional[str] = None
