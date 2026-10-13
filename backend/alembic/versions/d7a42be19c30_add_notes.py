"""Add personal notes without changing academic history.

Revision ID: d7a42be19c30
Revises: c218e785d190
"""

from alembic import op
import sqlalchemy as sa

revision = "d7a42be19c30"
down_revision = "c218e785d190"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("study_session_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_notes_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], name="fk_notes_subject_id_subjects", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], name="fk_notes_task_id_tasks", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["study_session_id"], ["study_sessions.id"], name="fk_notes_study_session_id_study_sessions", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_notes"),
    )
    for column in ("user_id", "subject_id", "task_id", "study_session_id"):
        op.create_index(f"ix_notes_{column}", "notes", [column])


def downgrade() -> None:
    op.drop_table("notes")
