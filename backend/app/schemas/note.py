"""Conteúdo em texto simples: a UI não precisa interpretar HTML não confiável."""

from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

NoteTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
NoteTag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)]
PositiveId = Annotated[int, Field(gt=0)]


class NoteBase(BaseModel):
    title: NoteTitle
    content: str = Field(default="", max_length=100_000)
    tags: list[NoteTag] = Field(default_factory=list, max_length=10)
    subject_id: PositiveId | None = None
    task_id: PositiveId | None = None
    study_session_id: PositiveId | None = None

    @field_validator("tags")
    @classmethod
    def unique_tags(cls, tags: list[str]) -> list[str]:
        return list(dict.fromkeys(tag.casefold() for tag in tags))


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: NoteTitle | None = None
    content: str | None = Field(default=None, max_length=100_000)
    tags: list[NoteTag] | None = Field(default=None, max_length=10)
    subject_id: PositiveId | None = None
    task_id: PositiveId | None = None
    study_session_id: PositiveId | None = None

    @field_validator("title", "content", "tags")
    @classmethod
    def required_fields_not_null(cls, value):
        if value is None:
            raise ValueError("O campo não pode ser nulo")
        return value

    @field_validator("tags")
    @classmethod
    def unique_tags(cls, tags: list[str]) -> list[str]:
        return list(dict.fromkeys(tag.casefold() for tag in tags))


class NoteResponse(NoteBase):
    id: int
    subject_name: str | None = None
    subject_color: str | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def expose_utc_timestamps(cls, value: datetime) -> datetime:
        # SQLite remove tzinfo das colunas UTC. O cliente precisa do offset
        # explícito para não interpretar o instante como hora civil local.
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


class NotePage(BaseModel):
    items: list[NoteResponse]
    total: int
    limit: int
    offset: int


class NoteSearchResult(BaseModel):
    id: int
    title: str
    excerpt: str
    tags: list[str]
    subject_name: str | None


class NoteSearchPage(BaseModel):
    items: list[NoteSearchResult]
    total: int
    limit: int
    offset: int
