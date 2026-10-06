"""Modelo de sessão de estudo — execução, não planejamento.

Separação conceitual (ver CONTEXTO do projeto):
  Task / CalendarEvent = planejamento/intenção ("o que pretendo estudar",
    "quando pretendo sentar para estudar").
  StudySession = execução ("quanto tempo eu de fato fiquei estudando,
    com pausas reais"). Referencia subject/task quando fizer sentido, mas
    nunca duplica título/prazo/prioridade — isso continua vivendo só em Task.

Decisão de arquitetura — rastreamento de tempo com pausas:
Em vez de gravar um evento por pausa/retomada (log de eventos), a sessão
guarda só dois números que juntos dão o tempo ativo em qualquer momento:
  `accumulated_seconds`  — segundos ativos já "fechados" (de segmentos
                            anteriores, ou o valor final ao concluir).
  `segment_started_at`   — início do segmento ativo atual; None quando
                            pausada ou finalizada.
Tempo ativo agora = accumulated_seconds + (agora - segment_started_at),
quando em_andamento; ou só accumulated_seconds quando pausada/concluída
(já "congelado"). Isso é suficiente para pause/resume/stop e sobrevive a
reload de página (o cliente busca o estado real no servidor), sem precisar
de uma tabela de eventos separada.

Os ciclos de Pomodoro (foco vs. pausa) são um conceito só do cliente: uma
pausa de Pomodoro simplesmente aciona o mesmo pause/resume desta sessão —
não existe um "tipo de pausa" diferente para pausa manual vs. pausa de
Pomodoro, o que manteria a modelagem mais simples.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StudySessionStatus(str, enum.Enum):
    EM_ANDAMENTO = "em_andamento"
    PAUSADA = "pausada"
    CONCLUIDA = "concluida"


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    task_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True
    )

    status: Mapped[StudySessionStatus] = mapped_column(
        Enum(StudySessionStatus, native_enum=False, length=20),
        nullable=False,
        default=StudySessionStatus.EM_ANDAMENTO,
    )

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    segment_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accumulated_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    pomodoro_cycles_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="study_sessions")
    subject = relationship("Subject", back_populates="study_sessions")
    task = relationship("Task", back_populates="study_sessions")

    @property
    def elapsed_seconds(self) -> int:
        """
        Tempo ativo total até agora. Congelado (= accumulated_seconds) quando
        pausada/concluída; crescendo em tempo real quando em_andamento.
        """
        if self.status == StudySessionStatus.EM_ANDAMENTO and self.segment_started_at is not None:
            now = datetime.now(timezone.utc)
            started = self.segment_started_at
            # SQLite pode devolver o datetime sem tzinfo mesmo tendo sido
            # gravado como aware; normaliza os dois lados antes de subtrair.
            if started.tzinfo is None:
                now = now.replace(tzinfo=None)
            delta = (now - started).total_seconds()
            return self.accumulated_seconds + max(0, int(delta))
        return self.accumulated_seconds
