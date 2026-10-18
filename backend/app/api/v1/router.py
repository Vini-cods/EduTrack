from fastapi import APIRouter
from app.api.v1.endpoints import academic_records
from app.api.v1.endpoints import user_preferences
from app.api.v1.endpoints import auth, subjects, tasks, dashboard, calendar_events, study_sessions, materials, notes, analytics

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(user_preferences.router, prefix="/preferences", tags=["preferences"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
api_router.include_router(academic_records.router, prefix="/subjects", tags=["academic-records"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(calendar_events.router, prefix="/calendar-events", tags=["calendar-events"])
api_router.include_router(study_sessions.router, prefix="/study-sessions", tags=["study-sessions"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
