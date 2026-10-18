from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from typing import Annotated, Optional
from datetime import date, datetime, timezone
from enum import Enum

TaskTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
EstimatedHours = Annotated[float, Field(gt=0, allow_inf_nan=False)]

class TaskStatus(str, Enum):
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"

class TaskPriority(str, Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"

class TaskBase(BaseModel):
    """
    Base schema para Task (Tarefa).
    """
    title: TaskTitle
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: TaskStatus = TaskStatus.PENDENTE
    priority: TaskPriority = TaskPriority.MEDIA
    # Horas estimadas para concluir a tarefa. Opcional: uma tarefa "rápida"
    # criada direto em Subjects/SubjectDetail não precisa preencher isso —
    # é o Study Planner que dá destaque a este campo (ver seção "tempo
    # estimado" do briefing), mas o dado mora em Task para não duplicar
    # título/disciplina/prazo/status numa entidade separada.
    estimated_hours: Optional[EstimatedHours] = None

class TaskCreate(TaskBase):
    """
    Schema para criação de Task.
    """
    subject_id: int

class TaskUpdate(BaseModel):
    """
    Schema para atualização de Task.
    """
    title: Optional[TaskTitle] = None
    subject_id: Optional[int] = Field(default=None, gt=0)
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    estimated_hours: Optional[EstimatedHours] = None

    @field_validator("title", "subject_id", "status", "priority")
    @classmethod
    def required_fields_cannot_be_null(cls, v):
        if v is None:
            raise ValueError("O campo não pode ser nulo")
        return v

class TaskStatusUpdate(BaseModel):
    """
    Schema para atualização apenas do status da Task.
    """
    status: TaskStatus

class TaskResponse(TaskBase):
    """
    Schema de resposta para Task.
    """
    id: int
    subject_id: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    @field_validator("completed_at")
    @classmethod
    def completion_is_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)

class TaskWithSubject(TaskResponse):
    """
    Schema de resposta para Task incluindo dados da disciplina relacionada.
    Usado na listagem geral de tarefas do usuário (ex.: página de Tarefas e Dashboard),
    evitando que o frontend precise buscar cada disciplina separadamente.
    """
    subject_name: str
    subject_color: Optional[str] = None
