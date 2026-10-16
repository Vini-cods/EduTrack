"""Add syllabus and assessment records, preserving all existing academic data.

Revision ID: f3a7bf247110
Revises: e6f38a91d420
"""
from alembic import op
import sqlalchemy as sa

revision = "f3a7bf247110"
down_revision = "e6f38a91d420"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("subject_syllabi",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("objectives", sa.Text(), nullable=False),
        sa.Column("topics", sa.Text(), nullable=False),
        sa.Column("bibliography", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"))
    op.create_index("ix_subject_syllabi_subject_id", "subject_syllabi", ["subject_id"], unique=True)
    op.create_table("assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("max_score", sa.Float(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="SET NULL"),
        sa.CheckConstraint("max_score > 0 AND max_score <= 10000", name="max_score_range"),
        sa.CheckConstraint("weight > 0 AND weight <= 1000", name="weight_range"),
        sa.CheckConstraint("score IS NULL OR (score >= 0 AND score <= max_score)", name="score_range"))
    for column in ("user_id", "subject_id", "task_id"):
        op.create_index("ix_assessments_" + column, "assessments", [column])


def downgrade() -> None:
    op.drop_table("assessments")
    op.drop_table("subject_syllabi")
