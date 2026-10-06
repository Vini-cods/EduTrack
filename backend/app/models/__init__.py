"""Importa todos os modelos para registro no Alembic."""

from app.models.user import User
from app.models.subject import Subject
from app.models.task import Task
from app.models.calendar_event import CalendarEvent, EventCategory
from app.models.study_session import StudySession, StudySessionStatus
from app.models.material import Material, MaterialCategory, MaterialStatus

__all__ = [
    "User",
    "Subject",
    "Task",
    "CalendarEvent",
    "EventCategory",
    "StudySession",
    "StudySessionStatus",
    "Material",
    "MaterialCategory",
    "MaterialStatus",
]
