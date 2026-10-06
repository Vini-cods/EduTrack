"""Modelo da tarefa acadêmica."""

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Task(Base):
    """Tabela de tarefas acadêmicas."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False, index=True
    )
    subject_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pendente"
    )
    # Mesma convenção de `status`: enum vive na camada de schema
    # (TaskPriority em schemas/task.py), coluna aqui é só string simples.
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="media")
    estimated_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relacionamentos
    user = relationship("User", back_populates="tasks")
    subject = relationship("Subject", back_populates="tasks")
    # Sem cascade de delete: uma sessão de calendário vinculada a esta tarefa
    # deve continuar existindo mesmo que a tarefa seja concluída/removida
    # (coerente com o ondelete="SET NULL" da FK em CalendarEvent.task_id).
    calendar_events = relationship("CalendarEvent", back_populates="task")
    study_sessions = relationship("StudySession", back_populates="task")
