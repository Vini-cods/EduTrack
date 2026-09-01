from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SubjectBase(BaseModel):
    """
    Base schema para Subject (Disciplina).
    """
    name: str
    description: Optional[str] = None
    color: Optional[str] = None

class SubjectCreate(SubjectBase):
    """
    Schema para criação de Subject.
    """
    pass

class SubjectUpdate(BaseModel):
    """
    Schema para atualização de Subject.
    """
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class SubjectResponse(SubjectBase):
    """
    Schema de resposta para Subject.
    """
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SubjectWithProgress(SubjectResponse):
    """
    Schema de resposta para Subject incluindo progresso.
    """
    total_tasks: int = 0
    completed_tasks: int = 0
    progress: float = 0.0
