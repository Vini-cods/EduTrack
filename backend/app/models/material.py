"""Modelo de material de estudo.

Diferente de CalendarEvent/StudySession (onde subject_id é opcional, porque
um evento genérico ou uma sessão livre podem não ter disciplina), aqui
subject_id é obrigatório: um material só existe associado a uma disciplina
(ver briefing, seção 13 — "permitir que o usuário associe materiais a uma
disciplina"). Por isso a FK usa CASCADE, igual à de Task (o par mais
próximo estruturalmente: ambos sempre pertencem a exatamente uma Subject).

Não referencia Task nem StudySession — o briefing só pede vínculo com
disciplina, e inventar um vínculo com tarefa aqui duplicaria a decisão de
"o que estudar" que já mora em Task, sem necessidade real.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MaterialCategory(str, enum.Enum):
    PDF = "pdf"
    LINK = "link"
    ARTIGO = "artigo"
    VIDEO = "video"
    DOCUMENTACAO = "documentacao"
    GITHUB = "github"
    ANOTACAO = "anotacao"
    OUTRO = "outro"


class MaterialStatus(str, enum.Enum):
    PARA_ESTUDAR = "para_estudar"
    ESTUDANDO = "estudando"
    CONCLUIDO = "concluido"


class Material(Base):
    """Tabela de materiais de estudo associados a uma disciplina."""

    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False, index=True
    )
    subject_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[MaterialCategory] = mapped_column(
        Enum(MaterialCategory, native_enum=False, length=20), nullable=False, default=MaterialCategory.OUTRO
    )
    status: Mapped[MaterialStatus] = mapped_column(
        Enum(MaterialStatus, native_enum=False, length=20), nullable=False, default=MaterialStatus.PARA_ESTUDAR
    )
    # Todo material aqui é referenciado por URL (link, PDF hospedado em algum
    # lugar, repositório, vídeo) — não há upload/armazenamento de arquivo
    # nesta etapa, coerente com o restante do backend (que também não tem
    # infraestrutura de arquivos). Opcional porque uma "anotação" pode não
    # ter link nenhum, só o texto em description.
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="materials")
    subject = relationship("Subject", back_populates="materials")
