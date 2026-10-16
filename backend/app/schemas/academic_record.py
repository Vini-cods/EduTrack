from datetime import date, datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator


class SyllabusInput(BaseModel):
    objectives: str = Field(default="", max_length=20000)
    topics: str = Field(default="", max_length=20000)
    bibliography: str = Field(default="", max_length=20000)


class SyllabusResponse(SyllabusInput):
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)

    @field_validator("updated_at")
    @classmethod
    def utc_updated_at(cls, value):
        return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


class AssessmentInput(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    score: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    max_score: float = Field(default=10, gt=0, le=10000, allow_inf_nan=False)
    weight: float = Field(default=1, gt=0, le=1000, allow_inf_nan=False)
    task_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def score_within_scale(self):
        if self.score is not None and self.score > self.max_score:
            raise ValueError("A nota não pode ser maior que a nota máxima")
        return self


class AssessmentResponse(AssessmentInput):
    id: int
    subject_id: int
    task_title: str | None = None
    due_date: date | None = None


class GradeSummary(BaseModel):
    total_count: int
    graded_count: int
    total_weight: float
    graded_weight: float
    coverage_percent: float
    partial_average: float | None


class AssessmentList(BaseModel):
    items: list[AssessmentResponse]
    summary: GradeSummary
