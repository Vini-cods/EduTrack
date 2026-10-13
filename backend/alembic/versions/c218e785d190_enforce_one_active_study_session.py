"""Enforce one active study session per user, including concurrent requests.

Revision ID: c218e785d190
Revises: ebf926553436
"""

from alembic import context, op
import sqlalchemy as sa

revision = "c218e785d190"
down_revision = "ebf926553436"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not context.is_offline_mode():
        duplicate = op.get_bind().execute(sa.text(
            "SELECT user_id FROM study_sessions "
            "WHERE status IN ('EM_ANDAMENTO', 'PAUSADA') "
            "GROUP BY user_id HAVING COUNT(*) > 1"
        )).first()
        if duplicate is not None:
            raise RuntimeError(
                "Existem múltiplas sessões de estudo ativas para o mesmo usuário. "
                "Finalize as sessões extras antes de aplicar esta migração; nenhum histórico foi alterado."
            )
    active_statuses = sa.text("status IN ('EM_ANDAMENTO', 'PAUSADA')")
    op.create_index(
        "uq_study_sessions_active_user",
        "study_sessions",
        ["user_id"],
        unique=True,
        sqlite_where=active_statuses,
        postgresql_where=active_statuses,
        mssql_where=active_statuses,
    )


def downgrade() -> None:
    op.drop_index("uq_study_sessions_active_user", table_name="study_sessions")
