"""Importa todos os modelos para registro no Alembic."""

from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.models.subject import Subject
from app.models.task import Task
from app.models.calendar_event import CalendarEvent, EventCategory
from app.models.study_session import StudySession, StudySessionStatus
from app.models.material import Material, MaterialCategory, MaterialStatus
from app.models.note import Note
from app.models.academic_record import Assessment, SubjectSyllabus
from app.models.activity_history import TaskStatusEvent, StudySegment

__all__ = [
    "User",
    "UserPreferences",
    "Subject",
    "Task",
    "CalendarEvent",
    "EventCategory",
    "StudySession",
    "StudySessionStatus",
    "Material",
    "MaterialCategory",
    "MaterialStatus",
    "Note",
    "Assessment",
    "SubjectSyllabus",
    "TaskStatusEvent",
    "StudySegment",
]
