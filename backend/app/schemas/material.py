"""Schemas Pydantic para materiais de estudo."""

from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.models.material import MaterialCategory, MaterialStatus

MaterialTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class MaterialBase(BaseModel):
    title: str
    category: MaterialCategory = MaterialCategory.OUTRO
    status: MaterialStatus = MaterialStatus.PARA_ESTUDAR
    url: Optional[str] = None
    description: Optional[str] = None
    subject_id: int


class MaterialCreate(MaterialBase):
    title: MaterialTitle


class MaterialUpdate(BaseModel):
    title: Optional[MaterialTitle] = None
    category: Optional[MaterialCategory] = None
    status: Optional[MaterialStatus] = None
    url: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[int] = None

    @field_validator("title", "category", "status", "subject_id")
    @classmethod
    def required_fields_cannot_be_null(cls, value):
        if value is None:
            raise ValueError("O campo não pode ser nulo")
        return value


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


class MaterialPage(BaseModel):
    items: list[MaterialWithSubject]
    total: int
    limit: int
    offset: int
    status_counts: dict[str, int]
