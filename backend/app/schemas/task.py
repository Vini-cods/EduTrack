from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

class TaskBase(BaseModel):
    """
    Base schema para Task (Tarefa).
    """
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: TaskStatus = TaskStatus.PENDING

class TaskCreate(TaskBase):
    """
    Schema para criação de Task.
    """
    subject_id: UUID

class TaskUpdate(BaseModel):
    """
    Schema para atualização de Task.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
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
    id: UUID
    subject_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
