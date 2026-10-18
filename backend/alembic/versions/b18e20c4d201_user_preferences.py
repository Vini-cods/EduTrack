"""Preferências por usuário sem alterar dados acadêmicos existentes."""
from alembic import op
import sqlalchemy as sa

revision = "b18e20c4d201"
down_revision = "a18e20c4d200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("user_preferences",
        sa.Column("user_id", sa.Integer(), primary_key=True),
        sa.Column("theme", sa.String(10), nullable=False),
        sa.Column("daily_capacity_hours", sa.Float(), nullable=False),
        sa.Column("focus_minutes", sa.Integer(), nullable=False),
        sa.Column("short_break_minutes", sa.Integer(), nullable=False),
        sa.Column("long_break_minutes", sa.Integer(), nullable=False),
        sa.Column("cycles_until_long_break", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint("theme IN ('light', 'dark', 'system')", name="theme_values"),
        sa.CheckConstraint("daily_capacity_hours >= 0.5 AND daily_capacity_hours <= 24", name="capacity_range"),
        sa.CheckConstraint("focus_minutes >= 1 AND focus_minutes <= 180", name="focus_range"),
        sa.CheckConstraint("short_break_minutes >= 1 AND short_break_minutes <= 60", name="short_break_range"),
        sa.CheckConstraint("long_break_minutes >= 1 AND long_break_minutes <= 120", name="long_break_range"),
        sa.CheckConstraint("cycles_until_long_break >= 1 AND cycles_until_long_break <= 12", name="cycles_range"))


def downgrade() -> None:
    op.drop_table("user_preferences")
