"""Cálculos observáveis de estudo e planejamento, sem consultas ou persistência."""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from statistics import median

from app.schemas.analytics import (
    AnalyticsDay, PlanningDiagnostics, SessionPatterns, StudyComparison, StudyHour, StudyWeekday,
)


@dataclass(frozen=True)
class StudyRecord:
    """Sessão concluída válida; início já convertido para o fuso da consulta."""

    started_at: datetime
    minutes: float


def compare_study(records: list[StudyRecord], start: date, end: date, today: date) -> StudyComparison:
    elapsed_days = max(0, (min(today, end) - start).days + 1)
    if not elapsed_days:
        return StudyComparison()
    previous_start = start - timedelta(days=(end - start).days + 1)
    previous_end = previous_start + timedelta(days=elapsed_days - 1)
    current_end = start + timedelta(days=elapsed_days - 1)
    current_minutes = sum(record.minutes for record in records if start <= record.started_at.date() <= current_end)
    previous_minutes = sum(record.minutes for record in records if previous_start <= record.started_at.date() <= previous_end)
    delta = current_minutes - previous_minutes
    return StudyComparison(
        available=True, elapsed_days=elapsed_days,
        current_start_date=start, current_end_date=current_end,
        previous_start_date=previous_start, previous_end_date=previous_end,
        current_studied_minutes=round(current_minutes, 2),
        previous_studied_minutes=round(previous_minutes, 2), delta_minutes=round(delta, 2),
        change_percent=round(delta / previous_minutes * 100, 1) if previous_minutes > 0 else None,
    )


def _streaks(active_days: set[date], start: date, end: date, today: date) -> tuple[int, int]:
    """Sequências limitadas ao período; hoje ainda pode continuar a de ontem."""
    current = longest = run = 0
    cursor = start
    anchor = min(end, today)
    while cursor <= anchor:
        run = run + 1 if cursor in active_days else 0
        longest = max(longest, run)
        cursor += timedelta(days=1)
    cursor = anchor
    if cursor == today and cursor not in active_days:
        cursor -= timedelta(days=1)
    while cursor >= start and cursor in active_days:
        current += 1
        cursor -= timedelta(days=1)
    return current, longest


def session_patterns(records: list[StudyRecord], start: date, end: date, today: date,
                     distributed_active_days: set[date] | None = None) -> SessionPatterns:
    selected = [record for record in records if start <= record.started_at.date() <= min(end, today)]
    weekdays = [StudyWeekday(weekday=index) for index in range(7)]
    hours = [StudyHour(hour=index) for index in range(24)]
    for record in selected:
        weekday, hour = weekdays[record.started_at.weekday()], hours[record.started_at.hour]
        for bucket in (weekday, hour):
            bucket.studied_minutes += record.minutes
            bucket.completed_sessions += 1
    for bucket in (*weekdays, *hours):
        bucket.studied_minutes = round(bucket.studied_minutes, 2)
    durations = [record.minutes for record in selected]
    active_days = distributed_active_days if distributed_active_days is not None else {record.started_at.date() for record in selected if record.minutes > 0}
    current, longest = _streaks(active_days, start, end, today)
    return SessionPatterns(
        completed_sessions=len(selected), average_session_minutes=round(sum(durations) / len(durations), 2) if durations else 0,
        median_session_minutes=round(median(durations), 2) if durations else 0,
        longest_session_minutes=round(max(durations), 2) if durations else 0,
        current_streak_days=current, longest_streak_days=longest,
        weekday_distribution=weekdays, hourly_distribution=hours,
    )


def planning_diagnostics(days: list[AnalyticsDay], task_effort: list[tuple[float, float]],
                         tasks_without_estimates: int, undated_tasks: int) -> PlanningDiagnostics:
    """Pares de esforço restante e cobertura futura, limitada ao esforço de cada tarefa."""
    remaining = sum(item[0] for item in task_effort)
    covered = sum(item[1] for item in task_effort)
    peak = max(days, key=lambda day: day.load_percent, default=None)
    return PlanningDiagnostics(
        overloaded_days=sum(day.total_load_minutes > day.capacity_minutes for day in days),
        excess_load_minutes=round(sum(max(0, day.total_load_minutes - day.capacity_minutes) for day in days), 2),
        peak_date=peak.date if peak and peak.total_load_minutes > 0 else None,
        peak_load_percent=peak.load_percent if peak else 0,
        remaining_task_minutes=round(remaining, 2), covered_task_minutes=round(covered, 2),
        planning_coverage_percent=round(covered / remaining * 100, 1) if remaining > 0 else None,
        estimated_tasks=len(task_effort), tasks_without_estimates=tasks_without_estimates, undated_tasks=undated_tasks,
    )
