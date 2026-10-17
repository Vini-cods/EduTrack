"""Métricas observáveis e carga estimada usam unidades explícitas em minutos."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


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
    action: Literal["planner", "tasks", "focus", "academic_load"] | None = None


class StudyComparison(BaseModel):
    available: bool = False
    elapsed_days: int = 0
    current_start_date: date | None = None
    current_end_date: date | None = None
    previous_start_date: date | None = None
    previous_end_date: date | None = None
    current_studied_minutes: float = 0
    previous_studied_minutes: float = 0
    delta_minutes: float = 0
    change_percent: float | None = None


class StudyWeekday(BaseModel):
    weekday: int
    studied_minutes: float = 0
    completed_sessions: int = 0


class StudyHour(BaseModel):
    hour: int
    studied_minutes: float = 0
    completed_sessions: int = 0


class SessionPatterns(BaseModel):
    completed_sessions: int = 0
    average_session_minutes: float = 0
    median_session_minutes: float = 0
    longest_session_minutes: float = 0
    current_streak_days: int = 0
    longest_streak_days: int = 0
    weekday_distribution: list[StudyWeekday] = Field(default_factory=list)
    hourly_distribution: list[StudyHour] = Field(default_factory=list)


class PlanningDiagnostics(BaseModel):
    overloaded_days: int = 0
    excess_load_minutes: float = 0
    peak_date: date | None = None
    peak_load_percent: float = 0
    remaining_task_minutes: float = 0
    covered_task_minutes: float = 0
    planning_coverage_percent: float | None = None
    estimated_tasks: int = 0
    tasks_without_estimates: int = 0
    undated_tasks: int = 0


class AnalyticsResponse(BaseModel):
    period: AnalyticsPeriod
    summary: AnalyticsSummary
    daily: list[AnalyticsDay]
    subjects: list[AnalyticsSubject]
    insights: list[AnalyticsInsight]
    methodology: list[str]
    comparison: StudyComparison = Field(default_factory=StudyComparison)
    session_patterns: SessionPatterns = Field(default_factory=SessionPatterns)
    planning_diagnostics: PlanningDiagnostics = Field(default_factory=PlanningDiagnostics)
