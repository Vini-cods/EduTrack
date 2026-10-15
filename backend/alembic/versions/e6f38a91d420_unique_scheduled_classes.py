"""Prevent simultaneous creation of duplicate scheduled classes.

Revision ID: e6f38a91d420
Revises: d7a42be19c30
"""

from alembic import op
import sqlalchemy as sa

revision = "e6f38a91d420"
down_revision = "d7a42be19c30"
branch_labels = None
depends_on = None

INDEX_NAME = "uq_calendar_classes_subject_interval"


def upgrade() -> None:
    # Enum(EventCategory) é persistido pelo nome (AULA), não pelo valor (aula).
    duplicate = op.get_bind().execute(sa.text("""
        SELECT user_id, subject_id, start_datetime, end_datetime, COUNT(*) AS occurrences
        FROM calendar_events
        WHERE category = 'AULA' AND subject_id IS NOT NULL AND end_datetime IS NOT NULL
        GROUP BY user_id, subject_id, start_datetime, end_datetime
        HAVING COUNT(*) > 1
    """)).first()
    if duplicate is not None:
        raise RuntimeError(
            "Existem aulas duplicadas com a mesma disciplina, data e horário. "
            "Revise e remova explicitamente as ocorrências extras no calendário antes de executar a migração novamente. "
            "Nenhum evento foi alterado ou removido."
        )
    predicate = sa.text("category = 'AULA' AND subject_id IS NOT NULL AND end_datetime IS NOT NULL")
    op.create_index(
        INDEX_NAME, "calendar_events", ["user_id", "subject_id", "start_datetime", "end_datetime"],
        unique=True, sqlite_where=predicate, postgresql_where=predicate, mssql_where=predicate,
    )


def downgrade() -> None:
    op.drop_index(INDEX_NAME, table_name="calendar_events")
