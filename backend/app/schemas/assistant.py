"""Contratos limitados de um chat acadêmico sem ferramentas de escrita."""

from datetime import datetime
from typing import Annotated, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

MessageText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
HistoryText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: HistoryText
    model_config = ConfigDict(extra="forbid")


class AssistantChatRequest(BaseModel):
    message: MessageText
    history: list[AssistantMessage] = Field(default_factory=list, max_length=10)
    timezone: str = Field(default="America/Sao_Paulo", min_length=1, max_length=100)
    include_context: bool = True
    model_config = ConfigDict(extra="forbid")

    @field_validator("timezone")
    @classmethod
    def timezone_exists(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Informe um fuso horário IANA válido.") from None
        return value


class AssistantStatus(BaseModel):
    configured: bool
    provider: Literal["openai"] = "openai"
    model: str | None


class AssistantSource(BaseModel):
    kind: Literal["task", "event", "subject", "session"]
    id: int
    label: str


class AssistantContext(BaseModel):
    as_of: datetime
    timezone: str
    pending_tasks: int
    tasks_included: int
    events_included: int
    subjects_included: int
    truncated: bool


class AssistantChatResponse(BaseModel):
    reply: str
    sources: list[AssistantSource]
    context: AssistantContext | None
