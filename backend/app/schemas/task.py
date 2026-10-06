from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum

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
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: TaskStatus = TaskStatus.PENDENTE
    priority: TaskPriority = TaskPriority.MEDIA
    # Horas estimadas para concluir a tarefa. Opcional: uma tarefa "rápida"
    # criada direto em Subjects/SubjectDetail não precisa preencher isso —
    # é o Study Planner que dá destaque a este campo (ver seção "tempo
    # estimado" do briefing), mas o dado mora em Task para não duplicar
    # título/disciplina/prazo/status numa entidade separada.
    estimated_hours: Optional[float] = None

    @field_validator("estimated_hours")
    @classmethod
    def estimated_hours_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("estimated_hours deve ser maior que zero")
        return v

class TaskCreate(TaskBase):
    """
    Schema para criação de Task.
    """
    subject_id: int

class TaskUpdate(BaseModel):
    """
    Schema para atualização de Task.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    estimated_hours: Optional[float] = None

    @field_validator("estimated_hours")
    @classmethod
    def estimated_hours_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("estimated_hours deve ser maior que zero")
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

    model_config = ConfigDict(from_attributes=True)

class TaskWithSubject(TaskResponse):
    """
    Schema de resposta para Task incluindo dados da disciplina relacionada.
    Usado na listagem geral de tarefas do usuário (ex.: página de Tarefas e Dashboard),
    evitando que o frontend precise buscar cada disciplina separadamente.
    """
    subject_name: str
    subject_color: Optional[str] = None
