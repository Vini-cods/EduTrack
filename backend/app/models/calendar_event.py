"""Modelo de evento de calendário.

Decisão de arquitetura — recorrência sem RRULE:
Em vez de guardar uma regra de recorrência abstrata (formato iCal RRULE) e
expandi-la em tempo de consulta, cada ocorrência de um evento recorrente é
materializada como uma linha própria no momento da criação (ver
`calendar_event_service.expand_recurrence`). Todas as ocorrências da mesma
série compartilham `recurrence_group_id`.

Trade-off consciente: consultas por intervalo de datas ficam triviais (um
simples BETWEEN, igual ao resto do projeto) e não há necessidade de uma lib
de RRULE; o custo é que a "regra" em si (ex.: "toda segunda e quarta até
dezembro") não fica guardada — só as ocorrências concretas. Para o uso real
do EduTrack (aulas de um semestre, sessões de estudo) isso é suficiente e é
a opção mais simples que ainda resolve o problema.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EventCategory(str, enum.Enum):
    """Categoria visual/semântica do evento (ver seção 6 do briefing)."""

    AULA = "aula"
    PROVA = "prova"
    TRABALHO = "trabalho"
    ESTUDO = "estudo"
    EVENTO = "evento"


class CalendarEvent(Base):
    """Um evento (ou uma ocorrência de uma série recorrente) no calendário."""

    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Igual a Subject: FK direta para user_id (e não só via subject) porque um
    # evento "Evento" genérico pode não pertencer a nenhuma disciplina.
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Preenchido quando este evento é a sessão agendada de um objetivo criado
    # no Study Planner. Mantém Task como única fonte de verdade para
    # objetivo/disciplina/prazo/prioridade/tempo estimado — o evento só
    # guarda a referência e o horário concreto da sessão.
    task_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    category: Mapped[EventCategory] = mapped_column(
        Enum(EventCategory, native_enum=False, length=20), nullable=False, default=EventCategory.EVENTO
    )
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)

    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_datetime: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Preenchido apenas quando o evento faz parte de uma série recorrente;
    # todas as ocorrências da mesma série compartilham o mesmo valor.
    recurrence_group_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="calendar_events")
    subject = relationship("Subject", back_populates="calendar_events")
    task = relationship("Task", back_populates="calendar_events")
