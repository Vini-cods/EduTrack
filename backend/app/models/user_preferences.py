"""Preferências duráveis por conta; execução de timers continua local."""

from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (
        CheckConstraint("theme IN ('light', 'dark', 'system')", name="theme_values"),
        CheckConstraint("daily_capacity_hours >= 0.5 AND daily_capacity_hours <= 24", name="capacity_range"),
        CheckConstraint("focus_minutes >= 1 AND focus_minutes <= 180", name="focus_range"),
        CheckConstraint("short_break_minutes >= 1 AND short_break_minutes <= 60", name="short_break_range"),
        CheckConstraint("long_break_minutes >= 1 AND long_break_minutes <= 120", name="long_break_range"),
        CheckConstraint("cycles_until_long_break >= 1 AND cycles_until_long_break <= 12", name="cycles_range"),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme: Mapped[str] = mapped_column(String(10), default="system", nullable=False)
    daily_capacity_hours: Mapped[float] = mapped_column(Float, default=6, nullable=False)
    focus_minutes: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    short_break_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    long_break_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    cycles_until_long_break: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                                                onupdate=lambda: datetime.now(timezone.utc), nullable=False)
