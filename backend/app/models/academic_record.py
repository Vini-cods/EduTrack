"""Syllabus and assessment results; deadlines remain on related tasks."""
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SubjectSyllabus(Base):
    __tablename__ = "subject_syllabi"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), unique=True, index=True)
    objectives: Mapped[str] = mapped_column(Text, default="", nullable=False)
    topics: Mapped[str] = mapped_column(Text, default="", nullable=False)
    bibliography: Mapped[str] = mapped_column(Text, default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    subject = relationship("Subject", back_populates="syllabus")


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (
        CheckConstraint("max_score > 0 AND max_score <= 10000", name="max_score_range"),
        CheckConstraint("weight > 0 AND weight <= 1000", name="weight_range"),
        CheckConstraint("score IS NULL OR (score >= 0 AND score <= max_score)", name="score_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    score: Mapped[float | None] = mapped_column(Float)
    max_score: Mapped[float] = mapped_column(Float, default=10)
    weight: Mapped[float] = mapped_column(Float, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    subject = relationship("Subject", back_populates="assessments")
    task = relationship("Task", back_populates="assessments")
