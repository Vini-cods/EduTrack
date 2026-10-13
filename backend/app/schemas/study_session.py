"""Schemas Pydantic para sessões de estudo (execução real)."""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.study_session import StudySessionStatus


class StudySessionCreate(BaseModel):
    """Iniciar uma sessão: contexto opcional (disciplina e/ou tarefa sendo trabalhada)."""

    subject_id: Optional[int] = Field(default=None, gt=0)
    task_id: Optional[int] = Field(default=None, gt=0)


class StudySessionStopInput(BaseModel):
    """Enviado ao finalizar a sessão — quantos ciclos de Pomodoro (foco) foram completados."""

    pomodoro_cycles_completed: int = Field(default=0, ge=0)


class StudySessionResponse(BaseModel):
    id: int
    subject_id: Optional[int] = None
    task_id: Optional[int] = None
    status: StudySessionStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    # Calculado (property no model, não é uma coluna crua) — tempo ativo até
    # agora, já considerando pausas.
    elapsed_seconds: int
    pomodoro_cycles_completed: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("started_at", "ended_at", "created_at", "updated_at")
    @classmethod
    def expose_utc_timestamps(cls, value: Optional[datetime]) -> Optional[datetime]:
        # A execução usa instantes UTC. SQLite remove tzinfo ao ler; repor
        # o offset na resposta impede o cliente de interpretar UTC como hora local.
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class StudySessionWithContext(StudySessionResponse):
    """Resposta com nome da disciplina e título da tarefa anexados, mesmo padrão de TaskWithSubject."""

    subject_name: Optional[str] = None
    task_title: Optional[str] = None
