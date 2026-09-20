"""Schemas Pydantic para materiais de estudo."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.material import MaterialCategory, MaterialStatus


class MaterialBase(BaseModel):
    title: str
    category: MaterialCategory = MaterialCategory.OUTRO
    status: MaterialStatus = MaterialStatus.PARA_ESTUDAR
    url: Optional[str] = None
    description: Optional[str] = None
    subject_id: int


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[MaterialCategory] = None
    status: Optional[MaterialStatus] = None
    url: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[int] = None


class MaterialStatusUpdate(BaseModel):
    status: MaterialStatus


class MaterialResponse(MaterialBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaterialWithSubject(MaterialResponse):
    """Resposta com nome/cor da disciplina anexados, mesmo padrão de TaskWithSubject."""

    subject_name: str
    subject_color: Optional[str] = None
