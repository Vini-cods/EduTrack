"""Persistent recovery outbox and shared sliding-window limits.

Revision ID: c18e20c4d202
Revises: b18e20c4d201
"""
from alembic import op
import sqlalchemy as sa

revision = "c18e20c4d202"
down_revision = "b18e20c4d201"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("recovery_deliveries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("password_version", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_token", sa.String(64)),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"))
    for column in ("user_id", "status", "available_at"):
        op.create_index("ix_recovery_deliveries_" + column, "recovery_deliveries", [column])
    op.create_table("recovery_rate_lock", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("generation", sa.Integer(), nullable=False))
    op.bulk_insert(sa.table("recovery_rate_lock", sa.column("id", sa.Integer()),
                           sa.column("generation", sa.Integer())), [{"id": 1, "generation": 0}])
    op.create_table("recovery_rate_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bucket", sa.String(64), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False))
    for column in ("bucket", "requested_at"):
        op.create_index("ix_recovery_rate_events_" + column, "recovery_rate_events", [column])


def downgrade():
    op.drop_table("recovery_rate_events")
    op.drop_table("recovery_rate_lock")
    op.drop_table("recovery_deliveries")
