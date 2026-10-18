"""Histórico prospectivo, pausas, virada de dia, reabertura e isolamento."""
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from app.models import Task, TaskStatusEvent, StudySession, StudySessionStatus, StudySegment
from app.schemas.task import TaskStatusUpdate
from app.services import study_session_service, task_service
from app.services.activity_history import distribute_session
from app.services.analytics_service import get_analytics
from tests.conftest import TestingSessionLocal

UTC = timezone.utc


def test_task_transitions_record_actual_time_once_and_keep_reopening_history(client, academic_data):
    owner = academic_data["owner"]
    url = f"/api/v1/tasks/{owner['task_id']}"
    completed = client.patch(url + "/status", json={"status": "concluida"}, headers=owner["headers"])
    assert completed.status_code == 200
    timestamp = completed.json()["completed_at"]
    assert datetime.fromisoformat(timestamp).utcoffset() == timedelta(0)
    assert client.patch(url + "/status", json={"status": "concluida"}, headers=owner["headers"]).json()["completed_at"] == timestamp
    reopened = client.put(url, json={"status": "pendente"}, headers=owner["headers"])
    assert reopened.json()["completed_at"] is None
    assert client.patch(url + "/status", json={"status": "concluida"}, headers=owner["headers"]).status_code == 200
    with TestingSessionLocal() as db:
        events = db.query(TaskStatusEvent).filter(TaskStatusEvent.task_id == owner["task_id"]).order_by(TaskStatusEvent.id).all()
        assert [event.to_status for event in events] == ["concluida", "pendente", "concluida"]
        assert client.patch(url + "/status", json={"status": "pendente"}, headers=academic_data["other"]["headers"]).status_code == 404


def test_create_completed_task_records_creation_and_delete_removes_events(client, academic_data):
    owner = academic_data["owner"]
    task = client.post("/api/v1/tasks/", json={"subject_id": owner["subject_id"], "title": "Pronta", "status": "concluida"}, headers=owner["headers"]).json()
    assert task["completed_at"] is not None
    listed = client.get("/api/v1/tasks/", headers=owner["headers"]).json()
    assert next(item for item in listed if item["id"] == task["id"])["completed_at"] is not None
    with TestingSessionLocal() as db:
        event = db.query(TaskStatusEvent).filter(TaskStatusEvent.task_id == task["id"]).one()
        assert event.from_status is None
    assert client.delete(f"/api/v1/tasks/{task['id']}", headers=owner["headers"]).status_code == 204
    with TestingSessionLocal() as db:
        assert db.query(TaskStatusEvent).filter(TaskStatusEvent.task_id == task["id"]).count() == 0


def test_task_compare_and_swap_rejects_stale_transition(academic_data):
    owner = academic_data["owner"]
    with TestingSessionLocal() as first, TestingSessionLocal() as second:
        stale = task_service.get_task_by_id(first, owner["task_id"], owner["user_id"])
        task_service.update_task_status(second, owner["task_id"], TaskStatusUpdate(status="concluida"), owner["user_id"])
        with pytest.raises(task_service.TaskStateConflict):
            task_service._change_status(first, stale, "em_andamento")
    with TestingSessionLocal() as db:
        assert db.query(TaskStatusEvent).filter(TaskStatusEvent.task_id == owner["task_id"]).count() == 1


def test_pause_resume_stop_store_only_active_intervals_and_reject_stale_writer(client, academic_data, monkeypatch):
    owner = academic_data["owner"]
    clock = [datetime(2026, 10, 18, 2, 30, tzinfo=UTC)]
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return clock[0]
    monkeypatch.setattr(study_session_service, "datetime", Clock)
    session = client.post("/api/v1/study-sessions/", json={}, headers=owner["headers"]).json()
    url = f"/api/v1/study-sessions/{session['id']}"
    with TestingSessionLocal() as stale_db:
        stale = study_session_service.get_session_by_id(stale_db, session["id"], owner["user_id"])
        clock[0] += timedelta(minutes=30)
        assert client.patch(url + "/pause", headers=owner["headers"]).json()["elapsed_seconds"] == 1800
        assert study_session_service._transition(stale_db, stale, StudySessionStatus.CONCLUIDA) is None
    clock[0] += timedelta(hours=1)
    assert client.patch(url + "/resume", headers=owner["headers"]).status_code == 200
    clock[0] += timedelta(minutes=20)
    stopped = client.patch(url + "/stop", json={}, headers=owner["headers"]).json()
    assert stopped["elapsed_seconds"] == 3000
    with TestingSessionLocal() as db:
        segments = db.query(StudySegment).filter(StudySegment.session_id == session["id"]).all()
        assert [segment.active_seconds for segment in segments] == [1800, 1200]
        assert client.delete(url, headers=owner["headers"]).status_code == 204
        assert db.query(StudySegment).filter(StudySegment.session_id == session["id"]).count() == 0


def test_distribution_splits_midnight_and_dst_without_allocating_pauses():
    session = StudySession(started_at=datetime(2026, 10, 18, 2, 30), ended_at=datetime(2026, 10, 18, 5), accumulated_seconds=5400)
    segments = [StudySegment(started_at=datetime(2026, 10, 18, 2, 30), ended_at=datetime(2026, 10, 18, 3, 30), active_seconds=3600),
                StudySegment(started_at=datetime(2026, 10, 18, 4, 30), ended_at=datetime(2026, 10, 18, 5), active_seconds=1800)]
    portions, legacy = distribute_session(session, segments, ZoneInfo("America/Sao_Paulo"))
    assert [(part.started_at.date().isoformat(), part.minutes) for part in portions] == [("2026-10-17", 30), ("2026-10-18", 30), ("2026-10-18", 30)]
    assert legacy == 0
    # O dia de mudança de horário em NY tem 25h: não usar duração civil ingênua.
    session.started_at, session.ended_at, session.accumulated_seconds = datetime(2026, 11, 1, 4), datetime(2026, 11, 2, 5), 90000
    parts, _ = distribute_session(session, [StudySegment(started_at=session.started_at, ended_at=session.ended_at, active_seconds=90000)], ZoneInfo("America/New_York"))
    assert len(parts) == 1 and parts[0].minutes == 1500


def test_analytics_counts_status_history_separately_and_retains_legacy_evidence(academic_data):
    owner, other = academic_data["owner"], academic_data["other"]
    with TestingSessionLocal() as db:
        session = StudySession(user_id=owner["user_id"], subject_id=owner["subject_id"], status=StudySessionStatus.CONCLUIDA,
            started_at=datetime(2026, 10, 18, 2, 30), ended_at=datetime(2026, 10, 18, 3, 30), accumulated_seconds=3600)
        db.add(session)
        db.flush()
        db.add(StudySegment(user_id=owner["user_id"], session_id=session.id, started_at=session.started_at, ended_at=session.ended_at, active_seconds=3600))
        for user, from_status, to_status in ((owner, "pendente", "concluida"), (owner, "concluida", "pendente"), (other, "pendente", "concluida")):
            db.add(TaskStatusEvent(user_id=user["user_id"], task_id=user["task_id"], from_status=from_status, to_status=to_status, occurred_at=datetime(2026, 10, 18, 3)))
        db.commit()
        report = get_analytics(db, owner["user_id"], date(2026, 10, 17), date(2026, 10, 18), now=datetime(2026, 10, 18, 6, tzinfo=UTC))
        assert [day.studied_minutes for day in report.daily] == [30, 30]
        assert report.summary.studied_minutes == 60 and report.summary.completed_sessions == 1
        assert report.session_patterns.longest_streak_days == 2
        assert report.summary.completion_events == report.summary.reopened_events == 1
        assert report.summary.tasks_completed == 0  # Sem prazo nesta janela; métrica separada.
        assert report.summary.legacy_studied_minutes == 0
        legacy = get_analytics(db, owner["user_id"], date(2026, 10, 9), date(2026, 10, 9), now=datetime(2026, 10, 18, 6, tzinfo=UTC))
        assert legacy.summary.studied_minutes == legacy.summary.legacy_studied_minutes == 30
