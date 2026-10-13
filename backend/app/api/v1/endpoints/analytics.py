from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics_service import AnalyticsValidationError, get_analytics

router = APIRouter()


@router.get("/", response_model=AnalyticsResponse)
def read_analytics(start_date: date, end_date: date, timezone: str = Query(default="America/Sao_Paulo", max_length=100),
                   daily_capacity_hours: float = Query(default=6, ge=0.5, le=16, allow_inf_nan=False),
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return get_analytics(db, current_user.id, start_date, end_date, timezone, daily_capacity_hours)
    except AnalyticsValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
