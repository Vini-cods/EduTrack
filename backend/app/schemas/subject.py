"""Contratos de disciplinas; horários pertencem a CalendarEvent."""

from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

SubjectName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
SubjectColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]


class SubjectValidationError(ValueError):
    """Atualização incompatível com o período existente da disciplina."""


def validate_subject_dates(start: date | None, end: date | None) -> None:
    if start is not None and end is not None and end < start:
        raise SubjectValidationError("O fim do período não pode ser anterior ao início")


class SubjectBase(BaseModel):
    name: SubjectName
    description: str | None = Field(default=None, max_length=1000)
    color: SubjectColor | None = None
    professor: str | None = Field(default=None, max_length=255)
    workload_hours: int | None = Field(default=None, ge=0, le=2000)
    start_date: date | None = None
    end_date: date | None = None


class SubjectCreate(SubjectBase):
    @model_validator(mode="after")
    def validate_period(self) -> "SubjectCreate":
        validate_subject_dates(self.start_date, self.end_date)
        return self


class SubjectUpdate(BaseModel):
    name: SubjectName | None = None
    description: str | None = Field(default=None, max_length=1000)
    color: SubjectColor | None = None
    professor: str | None = Field(default=None, max_length=255)
    workload_hours: int | None = Field(default=None, ge=0, le=2000)
    start_date: date | None = None
    end_date: date | None = None

    @field_validator("name")
    @classmethod
    def name_cannot_be_null(cls, value):
        if value is None:
            raise ValueError("O nome da disciplina não pode ser nulo")
        return value

    @model_validator(mode="after")
    def validate_period(self) -> "SubjectUpdate":
        validate_subject_dates(self.start_date, self.end_date)
        return self


class SubjectResponse(SubjectBase):
    # Registros anteriores continuam legíveis; restrições são aplicadas à escrita.
    name: str
    description: str | None = None
    color: str | None = None
    professor: str | None = None
    workload_hours: int | None = None
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubjectWithProgress(SubjectResponse):
    total_tasks: int = 0
    completed_tasks: int = 0
    progress: float = 0.0
