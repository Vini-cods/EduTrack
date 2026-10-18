from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user_preferences import UserPreferences
from app.schemas.user_preferences import PomodoroPreferences, UserPreferencesPatch, UserPreferencesResponse

POMODORO_COLUMNS = {
    "focusMinutes": "focus_minutes", "shortBreakMinutes": "short_break_minutes",
    "longBreakMinutes": "long_break_minutes", "cyclesUntilLongBreak": "cycles_until_long_break",
}


def read_preferences(db: Session, user_id: int) -> UserPreferencesResponse:
    row = db.get(UserPreferences, user_id)
    if row is None:
        # Ler não cria/escreve registros nem importa preferências de outro navegador.
        return UserPreferencesResponse()
    return UserPreferencesResponse(theme=row.theme, daily_capacity_hours=row.daily_capacity_hours,
                                   pomodoro=PomodoroPreferences(**{field: getattr(row, column) for field, column in POMODORO_COLUMNS.items()}))


def update_preferences(db: Session, user_id: int, patch: UserPreferencesPatch) -> UserPreferencesResponse:
    row = db.get(UserPreferences, user_id)
    if row is None:
        row = UserPreferences(user_id=user_id)
        db.add(row)
        try:
            db.flush()
        except IntegrityError:
            # Duas primeiras gravações simultâneas não criam duas preferências.
            db.rollback()
            row = db.get(UserPreferences, user_id)
            if row is None:
                raise
    for field, value in patch.model_dump(exclude_unset=True).items():
        if field == "pomodoro":
            for key, setting in value.items():
                setattr(row, POMODORO_COLUMNS[key], setting)
        else:
            setattr(row, field, value)
    # SQLAlchemy só altera colunas sujas: PATCH de tema não substitui capacidade
    # ou Pomodoro salvos por outro dispositivo.
    db.commit()
    db.refresh(row)
    return read_preferences(db, user_id)
