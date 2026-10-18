from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.user_preferences import UserPreferencesPatch, UserPreferencesResponse
from app.services.user_preferences_service import read_preferences, update_preferences

router = APIRouter()


@router.get("/", response_model=UserPreferencesResponse)
def get_preferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return read_preferences(db, current_user.id)


@router.patch("/", response_model=UserPreferencesResponse)
def patch_preferences(payload: UserPreferencesPatch, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_preferences(db, current_user.id, payload)
