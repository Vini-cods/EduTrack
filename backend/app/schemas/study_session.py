"""Schemas Pydantic para sessões de estudo (execução real)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.study_session import StudySessionStatus


class StudySessionCreate(BaseModel):
    """Iniciar uma sessão: contexto opcional (disciplina e/ou tarefa sendo trabalhada)."""

    subject_id: Optional[int] = None
    task_id: Optional[int] = None


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


class StudySessionWithContext(StudySessionResponse):
    """Resposta com nome da disciplina e título da tarefa anexados, mesmo padrão de TaskWithSubject."""

    subject_name: Optional[str] = None
    task_title: Optional[str] = None
