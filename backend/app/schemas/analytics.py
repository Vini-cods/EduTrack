"""Métricas observáveis e carga estimada usam unidades explícitas em minutos."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class AnalyticsPeriod(BaseModel):
    start_date: date
    end_date: date
    timezone: str
    daily_capacity_hours: float
    as_of: datetime


class LoadMetrics(BaseModel):
    studied_minutes: float = 0
    planned_study_minutes: float = 0
    scheduled_minutes: float = 0
    unallocated_task_minutes: float = 0
    total_load_minutes: float = 0
    tasks_due: int = 0
    tasks_completed: int = 0


class AnalyticsDay(LoadMetrics):
    date: date
    capacity_minutes: float
    load_percent: float = 0


class AnalyticsSubject(LoadMetrics):
    subject_id: int | None
    subject_name: str
    subject_color: str | None = None
    completion_rate: float = 0


class AnalyticsSummary(LoadMetrics):
    completed_sessions: int = 0
    active_days: int = 0
    consistency_percent: float = 0
    completion_rate: float = 0
    open_tasks: int = 0
    overdue_tasks: int = 0
    unknown_estimate_tasks: int = 0
    undated_tasks: int = 0
    capacity_minutes: float = 0
    load_percent: float = 0


class AnalyticsInsight(BaseModel):
    id: str
    tone: Literal["info", "warning", "success"]
    title: str
    description: str


class AnalyticsResponse(BaseModel):
    period: AnalyticsPeriod
    summary: AnalyticsSummary
    daily: list[AnalyticsDay]
    subjects: list[AnalyticsSubject]
    insights: list[AnalyticsInsight]
    methodology: list[str]
