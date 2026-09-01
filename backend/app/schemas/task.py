from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"

class TaskBase(BaseModel):
    """
    Base schema para Task (Tarefa).
    """
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: TaskStatus = TaskStatus.PENDENTE

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
