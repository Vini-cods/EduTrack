"""Distribui intervalos UTC em dias civis, preservando o total ativo conhecido."""

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from app.models.activity_history import StudySegment
from app.models.study_session import StudySession
from app.services.analytics_metrics import StudyRecord


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def distribute_session(session: StudySession, segments: list[StudySegment], zone: ZoneInfo
                       ) -> tuple[list[StudyRecord], float]:
    """Retorna parcelas diárias e minutos sem intervalo conhecido (legado).

    Resíduos antigos ficam no início da sessão, identificados como aproximados.
    Nunca interpolamos o total entre início/fim: esse intervalo pode conter pausas.
    """
    remaining = max(0, session.accumulated_seconds)
    parts: list[StudyRecord] = []
    for segment in sorted(segments, key=lambda item: item.started_at):
        start, end = utc(segment.started_at), utc(segment.ended_at)
        if start < utc(session.started_at) or (session.ended_at and end > utc(session.ended_at)):
            continue
        seconds = min(remaining, max(0, segment.active_seconds), max(0, int((end - start).total_seconds())))
        remaining -= seconds
        end = start + timedelta(seconds=seconds)
        cursor = start
        while cursor < end:
            local = cursor.astimezone(zone)
            midnight = datetime.combine(local.date() + timedelta(days=1), time.min, tzinfo=zone).astimezone(timezone.utc)
            until = min(end, midnight)
            parts.append(StudyRecord(started_at=local, minutes=(until - cursor).total_seconds() / 60))
            cursor = until
    legacy_minutes = remaining / 60
    if legacy_minutes:
        parts.append(StudyRecord(started_at=utc(session.started_at).astimezone(zone), minutes=legacy_minutes))
    return parts, legacy_minutes
