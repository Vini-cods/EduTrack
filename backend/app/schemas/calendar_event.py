"""Schemas Pydantic para eventos de calendário."""

from datetime import date, datetime
from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

from app.models.calendar_event import EventCategory

EventTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class CalendarEventValidationError(ValueError):
    """Intervalo incompatível com o evento atual."""


def validate_interval(start: datetime, end: Optional[datetime]) -> None:
    if end is None:
        return
    if (start.utcoffset() is None) != (end.utcoffset() is None):
        raise CalendarEventValidationError("Início e fim devem usar a mesma convenção de fuso horário")
    if end < start:
        raise CalendarEventValidationError("end_datetime não pode ser anterior a start_datetime")


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
        return sorted(set(v)) if v is not None else None


class CalendarEventBase(BaseModel):
    title: EventTitle
    description: Optional[str] = None
    category: EventCategory = EventCategory.EVENTO
    subject_id: Optional[int] = Field(default=None, gt=0)
    # Preenchido quando este evento é a sessão agendada de um objetivo do
    # Study Planner (ver comentário em models/calendar_event.py).
    task_id: Optional[int] = Field(default=None, gt=0)
    location: Optional[str] = None
    color: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None

    @field_validator("end_datetime")
    @classmethod
    def end_after_start(cls, v: Optional[datetime], info):
        start = info.data.get("start_datetime")
        if start is not None:
            validate_interval(start, v)
        return v


class CalendarEventCreate(CalendarEventBase):
    recurrence: Optional[RecurrenceInput] = None

    @model_validator(mode="after")
    def recurrence_until_after_start(self) -> "CalendarEventCreate":
        if self.recurrence is not None and self.recurrence.until < self.start_datetime.date():
            raise ValueError("A data final da recorrência não pode ser anterior à data de início do evento")
        if self.recurrence is not None and (self.recurrence.until - self.start_datetime.date()).days > 366:
            raise ValueError("O intervalo de recorrência deve ter no máximo 366 dias")
        return self


class CalendarEventUpdate(BaseModel):
    title: Optional[EventTitle] = None
    description: Optional[str] = None
    category: Optional[EventCategory] = None
    subject_id: Optional[int] = Field(default=None, gt=0)
    task_id: Optional[int] = Field(default=None, gt=0)
    location: Optional[str] = None
    color: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None

    @field_validator("title", "category", "start_datetime")
    @classmethod
    def required_fields_cannot_be_null(cls, v):
        if v is None:
            raise ValueError("O campo não pode ser nulo")
        return v


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
