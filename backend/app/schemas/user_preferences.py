"""Limites iguais aos controles do Focus e Academic Load."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Theme = Literal["light", "dark", "system"]


class PomodoroPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")
    focusMinutes: int = Field(default=25, ge=1, le=180, strict=True)
    shortBreakMinutes: int = Field(default=5, ge=1, le=60, strict=True)
    longBreakMinutes: int = Field(default=15, ge=1, le=120, strict=True)
    cyclesUntilLongBreak: int = Field(default=4, ge=1, le=12, strict=True)


class PomodoroPreferencesPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    focusMinutes: int | None = Field(default=None, ge=1, le=180, strict=True)
    shortBreakMinutes: int | None = Field(default=None, ge=1, le=60, strict=True)
    longBreakMinutes: int | None = Field(default=None, ge=1, le=120, strict=True)
    cyclesUntilLongBreak: int | None = Field(default=None, ge=1, le=12, strict=True)

    @field_validator("focusMinutes", "shortBreakMinutes", "longBreakMinutes", "cyclesUntilLongBreak")
    @classmethod
    def not_null(cls, value):
        if value is None:
            raise ValueError("A preferência não pode ser nula")
        return value


class UserPreferencesResponse(BaseModel):
    theme: Theme = "system"
    daily_capacity_hours: float = Field(default=6, ge=0.5, le=24, allow_inf_nan=False)
    pomodoro: PomodoroPreferences = Field(default_factory=PomodoroPreferences)


class UserPreferencesPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    theme: Theme | None = None
    daily_capacity_hours: float | None = Field(default=None, ge=0.5, le=24, allow_inf_nan=False, strict=True)
    pomodoro: PomodoroPreferencesPatch | None = None

    @field_validator("theme", "daily_capacity_hours", "pomodoro")
    @classmethod
    def not_null(cls, value):
        if value is None:
            raise ValueError("A preferência não pode ser nula")
        return value
