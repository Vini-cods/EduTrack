"""Histórico prospectivo de conclusões e segmentos ativos de estudo.

Revision ID: a18e20c4d200
Revises: f3a7bf247110
"""
from alembic import op
import sqlalchemy as sa

revision = "a18e20c4d200"
down_revision = "f3a7bf247110"
branch_labels = None
depends_on = None


def upgrade():
    # NULL é deliberado: updated_at não comprova uma conclusão histórica.
    op.add_column("tasks", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table("task_status_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", sa.String(20), nullable=True),
        sa.Column("to_status", sa.String(20), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_task_status_events_user_time", "task_status_events", ["user_id", "occurred_at"])
    op.create_index("ix_task_status_events_task_time", "task_status_events", ["task_id", "occurred_at"])
    op.create_table("study_segments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active_seconds", sa.Integer(), nullable=False),
        sa.UniqueConstraint("session_id", "started_at", name="uq_study_segments_session_start"))
    op.create_index("ix_study_segments_user_session", "study_segments", ["user_id", "session_id"])


def downgrade():
    op.drop_table("study_segments")
    op.drop_table("task_status_events")
    op.drop_column("tasks", "completed_at")
