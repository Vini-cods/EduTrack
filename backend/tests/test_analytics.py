"""Métricas reais, períodos locais e estimativas sem duplicação de esforço."""

from datetime import date, datetime, timezone

import pytest

from app.models import CalendarEvent, EventCategory, StudySession, StudySessionStatus, Subject, Task, User
from app.services.analytics_service import AnalyticsValidationError, get_analytics
from tests.conftest import TestingSessionLocal


@pytest.fixture()
def records():
    with TestingSessionLocal() as db:
        user = User(name="Aluno", email="analytics@example.com", hashed_password="not-used")
        foreign = User(name="Outro", email="foreign-analytics@example.com", hashed_password="not-used")
        db.add_all([user, foreign])
        db.flush()
        subject = Subject(user_id=user.id, name="Algoritmos", color="#123456")
        foreign_subject = Subject(user_id=foreign.id, name="Privada")
        db.add_all([subject, foreign_subject])
        db.commit()
        yield db, user, subject, foreign, foreign_subject


def test_load_subtracts_completed_work_and_scheduled_blocks_once_and_is_private(records):
    db, user, subject, foreign, foreign_subject = records
    task = Task(user_id=user.id, subject_id=subject.id, title="Estudar grafos", due_date=date(2026, 10, 14), estimated_hours=4)
    db.add(task)
    db.flush()
    db.add_all([
        StudySession(user_id=user.id, subject_id=subject.id, task_id=task.id, status=StudySessionStatus.CONCLUIDA,
                     started_at=datetime(2026, 10, 8, 15), accumulated_seconds=3600),
        StudySession(user_id=user.id, subject_id=subject.id, status=StudySessionStatus.CONCLUIDA,
                     started_at=datetime(2026, 10, 12, 13), accumulated_seconds=2700),
        CalendarEvent(user_id=user.id, subject_id=subject.id, task_id=task.id, title="Bloco 1", category=EventCategory.ESTUDO,
                      start_datetime=datetime(2026, 10, 13, 10), end_datetime=datetime(2026, 10, 13, 11)),
        CalendarEvent(user_id=user.id, subject_id=subject.id, task_id=task.id, title="Bloco 2", category=EventCategory.ESTUDO,
                      start_datetime=datetime(2026, 10, 14, 10), end_datetime=datetime(2026, 10, 14, 11)),
        CalendarEvent(user_id=user.id, subject_id=subject.id, title="Aula", category=EventCategory.AULA,
                      start_datetime=datetime(2026, 10, 13, 14), end_datetime=datetime(2026, 10, 13, 16)),
        Task(user_id=user.id, subject_id=subject.id, title="Concluída", due_date=date(2026, 10, 14), estimated_hours=8, status="concluida"),
        Task(user_id=foreign.id, subject_id=foreign_subject.id, title="Privada", due_date=date(2026, 10, 14), estimated_hours=10),
        CalendarEvent(user_id=foreign.id, subject_id=foreign_subject.id, title="Privada", category=EventCategory.ESTUDO,
                      start_datetime=datetime(2026, 10, 13, 10), end_datetime=datetime(2026, 10, 13, 20)),
        StudySession(user_id=foreign.id, subject_id=foreign_subject.id, status=StudySessionStatus.CONCLUIDA,
                     started_at=datetime(2026, 10, 12, 13), accumulated_seconds=36000),
    ])
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 14), now=datetime(2026, 10, 12, 14, tzinfo=timezone.utc))
    assert result.summary.studied_minutes == 45
    assert result.summary.planned_study_minutes == 120
    assert result.summary.scheduled_minutes == 240
    assert result.summary.unallocated_task_minutes == 60
    assert result.summary.total_load_minutes == 300
    assert result.summary.tasks_due == 2
    assert result.summary.tasks_completed == 1
    assert result.summary.completion_rate == 50
    assert result.summary.open_tasks == 1
    assert result.daily[1].scheduled_minutes == 180
    assert result.daily[2].total_load_minutes == 120
    assert len(result.subjects) == 1
    assert result.subjects[0].subject_name == "Algoritmos"
    assert result.subjects[0].total_load_minutes == 300


def test_calendar_overnight_is_split_locally_and_study_utc_uses_local_day(records):
    db, user, subject, _, _ = records
    db.add_all([
        CalendarEvent(user_id=user.id, subject_id=subject.id, title="Noturno", category=EventCategory.ESTUDO,
                      start_datetime=datetime(2026, 10, 12, 23, 30), end_datetime=datetime(2026, 10, 13, 1, 30)),
        CalendarEvent(user_id=user.id, title="Sem duração", start_datetime=datetime(2026, 10, 12, 12)),
        StudySession(user_id=user.id, subject_id=subject.id, status=StudySessionStatus.CONCLUIDA,
                     started_at=datetime(2026, 10, 13, 1), accumulated_seconds=3600),
        StudySession(user_id=user.id, subject_id=subject.id, status=StudySessionStatus.PAUSADA,
                     started_at=datetime(2026, 10, 12, 18), accumulated_seconds=7200),
    ])
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 13), now=datetime(2026, 10, 13, 12, tzinfo=timezone.utc))
    assert [day.scheduled_minutes for day in result.daily] == [30, 90]
    assert [day.studied_minutes for day in result.daily] == [60, 0]
    assert result.summary.completed_sessions == 1
    assert result.summary.active_days == 1
    assert result.summary.consistency_percent == 50
    utc = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 13), timezone_name="UTC", now=datetime(2026, 10, 13, 12, tzinfo=timezone.utc))
    assert [day.studied_minutes for day in utc.daily] == [0, 60]


def test_capacity_overdue_and_missing_estimates_are_explicit(records):
    db, user, subject, _, _ = records
    db.add_all([
        Task(user_id=user.id, subject_id=subject.id, title="Atrasada", due_date=date(2026, 10, 12), estimated_hours=2),
        Task(user_id=user.id, subject_id=subject.id, title="Sem estimativa", due_date=date(2026, 10, 13)),
        Task(user_id=user.id, subject_id=subject.id, title="Sem prazo", estimated_hours=3),
    ])
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 13), date(2026, 10, 14), daily_capacity_hours=1,
                           now=datetime(2026, 10, 13, 12, tzinfo=timezone.utc))
    assert result.summary.open_tasks == 3
    assert result.summary.overdue_tasks == 1
    assert result.summary.unknown_estimate_tasks == 1
    assert result.summary.undated_tasks == 1
    assert result.daily[0].unallocated_task_minutes == 120
    assert result.daily[0].load_percent == 200
    assert result.summary.load_percent == 100
    assert {insight.id for insight in result.insights} >= {"overload", "overdue", "missing-estimates", "undated"}
    assert result.summary.tasks_due == 1  # Atrasos não são reescritos como novos prazos.


def test_elapsed_consistency_excludes_future_days_and_zero_period_is_honest(records):
    db, user, subject, _, _ = records
    db.add(StudySession(user_id=user.id, subject_id=subject.id, status=StudySessionStatus.CONCLUIDA,
                        started_at=datetime(2026, 10, 13, 10), accumulated_seconds=60))
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 13), date(2026, 10, 19), now=datetime(2026, 10, 13, 12, tzinfo=timezone.utc))
    assert result.summary.consistency_percent == 100
    future = get_analytics(db, user.id, date(2026, 11, 1), date(2026, 11, 7), now=datetime(2026, 10, 13, 12, tzinfo=timezone.utc))
    assert future.summary.consistency_percent == 0
    assert future.summary.completion_rate == 0
    assert future.summary.load_percent == 0
    assert future.insights[0].id == "start-recording"


def test_finished_sessions_outside_period_reduce_remaining_task_estimate(records):
    db, user, subject, _, _ = records
    task = Task(user_id=user.id, subject_id=subject.id, title="Pronta", due_date=date(2026, 10, 14), estimated_hours=1)
    db.add(task)
    db.flush()
    db.add(StudySession(user_id=user.id, task_id=task.id, subject_id=subject.id, status=StudySessionStatus.CONCLUIDA,
                        started_at=datetime(2026, 10, 10, 12), accumulated_seconds=7200))
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 13), date(2026, 10, 14), now=datetime(2026, 10, 13, 12, tzinfo=timezone.utc))
    assert result.summary.studied_minutes == 0
    assert result.summary.unallocated_task_minutes == 0
    assert result.summary.open_tasks == 1  # Tempo estudado não conclui uma tarefa automaticamente.


def test_analytics_endpoint_validation_and_authentication(client, academic_data):
    headers = academic_data["owner"]["headers"]
    base = {"start_date": "2026-10-12", "end_date": "2026-10-18"}
    assert client.get("/api/v1/analytics/", params=base).status_code == 401
    response = client.get("/api/v1/analytics/", params=base, headers=headers)
    assert response.status_code == 200
    assert len(response.json()["daily"]) == 7
    assert response.json()["period"]["timezone"] == "America/Sao_Paulo"
    for invalid in (
        {"end_date": "2026-10-11"}, {"end_date": "2027-10-11"},
        {"timezone": "fake/timezone"}, {"daily_capacity_hours": 0},
        {"daily_capacity_hours": "nan"}, {"start_date": "bad-date"},
    ):
        assert client.get("/api/v1/analytics/", params={**base, **invalid}, headers=headers).status_code == 422


def test_service_rejects_invalid_period(records):
    db, user, _, _, _ = records
    with pytest.raises(AnalyticsValidationError):
        get_analytics(db, user.id, date(2026, 10, 13), date(2026, 10, 12))


def _study(user_id, subject_id, started_at, minutes, **values):
    return StudySession(
        user_id=user_id, subject_id=subject_id, status=StudySessionStatus.CONCLUIDA,
        started_at=started_at, accumulated_seconds=minutes * 60, **values,
    )


def test_partial_comparison_matches_elapsed_days_in_previous_window_and_is_private(records):
    db, user, subject, foreign, foreign_subject = records
    db.add_all([
        _study(user.id, subject.id, datetime(2026, 10, 5, 12), 30),
        _study(user.id, subject.id, datetime(2026, 10, 7, 12), 30),
        _study(user.id, subject.id, datetime(2026, 10, 8, 12), 600),  # Fora do trecho comparável.
        _study(user.id, subject.id, datetime(2026, 10, 12, 12), 30),
        _study(user.id, subject.id, datetime(2026, 10, 14, 12), 60),
        _study(foreign.id, foreign_subject.id, datetime(2026, 10, 12, 12), 900),
    ])
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 18),
                           now=datetime(2026, 10, 14, 15, tzinfo=timezone.utc))
    comparison = result.comparison
    assert comparison.available and comparison.elapsed_days == 3
    assert (comparison.current_start_date, comparison.current_end_date) == (date(2026, 10, 12), date(2026, 10, 14))
    assert (comparison.previous_start_date, comparison.previous_end_date) == (date(2026, 10, 5), date(2026, 10, 7))
    assert comparison.current_studied_minutes == 90
    assert comparison.previous_studied_minutes == 60
    assert comparison.delta_minutes == 30
    assert comparison.change_percent == 50
    assert result.session_patterns.completed_sessions == 2


def test_comparison_zero_baseline_and_future_are_not_percentage_growth(records):
    db, user, subject, _, _ = records
    db.add(_study(user.id, subject.id, datetime(2026, 10, 12, 12), 30))
    db.commit()
    now = datetime(2026, 10, 14, 15, tzinfo=timezone.utc)
    result = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 18), now=now)
    assert result.comparison.available
    assert result.comparison.delta_minutes == 30
    assert result.comparison.change_percent is None
    future = get_analytics(db, user.id, date(2026, 11, 1), date(2026, 11, 7), now=now)
    assert not future.comparison.available
    assert future.comparison.elapsed_days == 0
    assert future.comparison.current_start_date is None
    assert future.comparison.previous_end_date is None
    assert future.comparison.change_percent is None
    assert future.session_patterns.completed_sessions == 0
    assert future.session_patterns.current_streak_days == 0


def test_completed_period_comparison_uses_whole_selected_window(records):
    db, user, subject, _, _ = records
    db.add_all([
        _study(user.id, subject.id, datetime(2026, 10, 2, 12), 60),
        _study(user.id, subject.id, datetime(2026, 10, 5, 12), 15),
    ])
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 5), date(2026, 10, 7),
                           now=datetime(2026, 10, 14, 15, tzinfo=timezone.utc))
    assert result.comparison.elapsed_days == 3
    assert result.comparison.previous_start_date == date(2026, 10, 2)
    assert result.comparison.previous_end_date == date(2026, 10, 4)
    assert result.comparison.change_percent == -75
    assert next(item for item in result.insights if item.id == "study-comparison").action == "planner"


def test_session_patterns_use_local_start_duration_distribution_and_bounded_streak(records):
    db, user, subject, _, _ = records
    db.add_all([
        _study(user.id, subject.id, datetime(2026, 10, 11, 12), 600),  # Fora do intervalo.
        _study(user.id, subject.id, datetime(2026, 10, 13, 1), 30),  # Segunda, 22h em SP.
        _study(user.id, subject.id, datetime(2026, 10, 13, 12), 60),
        _study(user.id, subject.id, datetime(2026, 10, 13, 15), 0),
    ])
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 18),
                           now=datetime(2026, 10, 14, 15, tzinfo=timezone.utc))
    patterns = result.session_patterns
    assert patterns.completed_sessions == 3
    assert patterns.average_session_minutes == 30
    assert patterns.median_session_minutes == 30
    assert patterns.longest_session_minutes == 60
    assert patterns.current_streak_days == 2  # Hoje vazio ainda permite continuar ontem.
    assert patterns.longest_streak_days == 2
    assert len(patterns.weekday_distribution) == 7 and len(patterns.hourly_distribution) == 24
    assert patterns.weekday_distribution[0].studied_minutes == 30
    assert patterns.weekday_distribution[1].studied_minutes == 60
    assert patterns.hourly_distribution[22].studied_minutes == 30
    assert patterns.hourly_distribution[9].completed_sessions == 1
    assert patterns.hourly_distribution[12].completed_sessions == 1
    utc = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 18), timezone_name="UTC",
                        now=datetime(2026, 10, 14, 15, tzinfo=timezone.utc))
    assert utc.session_patterns.weekday_distribution[0].studied_minutes == 0
    assert utc.session_patterns.weekday_distribution[1].studied_minutes == 90
    assert utc.session_patterns.current_streak_days == 1


def test_streak_stops_at_gaps_and_historical_end_without_today_grace(records):
    db, user, subject, _, _ = records
    db.add_all([
        _study(user.id, subject.id, datetime(2026, 10, 12, 12), 30),
        _study(user.id, subject.id, datetime(2026, 10, 14, 12), 30),
        _study(user.id, subject.id, datetime(2026, 10, 15, 12), 30),
    ])
    db.commit()
    now = datetime(2026, 10, 16, 15, tzinfo=timezone.utc)
    historical = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 13), now=now)
    assert historical.session_patterns.current_streak_days == 0
    assert historical.session_patterns.longest_streak_days == 1
    current = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 18), now=now)
    assert current.session_patterns.current_streak_days == 2
    assert current.session_patterns.longest_streak_days == 2


def test_future_dated_execution_does_not_become_study_or_reduce_estimate(records):
    db, user, subject, _, _ = records
    task = Task(user_id=user.id, subject_id=subject.id, title="Pendente", due_date=date(2026, 10, 14), estimated_hours=2)
    db.add(task)
    db.flush()
    db.add_all([
        _study(user.id, subject.id, datetime(2026, 10, 14, 18), 60, task_id=task.id),
        _study(user.id, subject.id, datetime(2026, 10, 14, 12), 60, task_id=task.id, ended_at=datetime(2026, 10, 15, 12)),
    ])
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 12), date(2026, 10, 18),
                           now=datetime(2026, 10, 14, 15, tzinfo=timezone.utc))
    assert result.summary.studied_minutes == 0
    assert result.summary.completed_sessions == 0
    assert result.comparison.current_studied_minutes == 0
    assert result.session_patterns.completed_sessions == 0
    assert result.planning_diagnostics.remaining_task_minutes == 120
    assert result.summary.unallocated_task_minutes == 120


def test_planning_coverage_caps_blocks_by_task_and_load_diagnostics_do_not_hide_missing_data(records):
    db, user, subject, _, _ = records
    task = Task(user_id=user.id, subject_id=subject.id, title="Coberta", due_date=date(2026, 10, 14), estimated_hours=3)
    db.add(task)
    db.flush()
    db.add_all([
        _study(user.id, subject.id, datetime(2026, 10, 10, 12), 60, task_id=task.id),
        Task(user_id=user.id, subject_id=subject.id, title="Sem bloco", due_date=date(2026, 10, 14), estimated_hours=0.5),
        Task(user_id=user.id, subject_id=subject.id, title="Sem estimativa", due_date=date(2026, 10, 14)),
        Task(user_id=user.id, subject_id=subject.id, title="Sem prazo", estimated_hours=2),
        Task(user_id=user.id, subject_id=subject.id, title="Concluída", due_date=date(2026, 10, 14), estimated_hours=10, status="concluida"),
        CalendarEvent(user_id=user.id, task_id=task.id, title="Bloco passado", category=EventCategory.ESTUDO,
                      start_datetime=datetime(2026, 10, 13, 7), end_datetime=datetime(2026, 10, 13, 8)),
        CalendarEvent(user_id=user.id, task_id=task.id, title="Bloco maior que restante", category=EventCategory.ESTUDO,
                      start_datetime=datetime(2026, 10, 14, 10), end_datetime=datetime(2026, 10, 14, 14)),
        CalendarEvent(user_id=user.id, title="Aula", category=EventCategory.AULA,
                      start_datetime=datetime(2026, 10, 15, 10), end_datetime=datetime(2026, 10, 15, 12)),
    ])
    db.commit()
    result = get_analytics(db, user.id, date(2026, 10, 13), date(2026, 10, 15), daily_capacity_hours=1,
                           now=datetime(2026, 10, 13, 12, tzinfo=timezone.utc))
    planning = result.planning_diagnostics
    assert planning.remaining_task_minutes == 150
    assert planning.covered_task_minutes == 120
    assert planning.planning_coverage_percent == 80
    assert planning.estimated_tasks == 2
    assert planning.tasks_without_estimates == 1 and planning.undated_tasks == 1
    assert planning.overloaded_days == 2
    assert planning.excess_load_minutes == 270
    assert planning.peak_date == date(2026, 10, 14)
    assert planning.peak_load_percent == 450
    assert planning.remaining_task_minutes - planning.covered_task_minutes == result.summary.unallocated_task_minutes
    assert {item.action for item in result.insights} >= {"planner", "tasks", "academic_load"}


def test_empty_planning_coverage_is_unavailable_not_zero_or_full(records):
    db, user, _, _, _ = records
    result = get_analytics(db, user.id, date(2026, 10, 13), date(2026, 10, 15),
                           now=datetime(2026, 10, 13, 12, tzinfo=timezone.utc))
    assert result.planning_diagnostics.planning_coverage_percent is None
    assert result.planning_diagnostics.peak_date is None
    assert result.planning_diagnostics.excess_load_minutes == 0
    assert all(item.action is None or item.action in {"planner", "tasks", "focus", "academic_load"} for item in result.insights)
