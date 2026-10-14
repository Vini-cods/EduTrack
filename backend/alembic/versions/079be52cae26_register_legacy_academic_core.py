"""Recognize the academic-core revision already present in legacy databases.

Revision ID: 079be52cae26
Revises: 1b7cae50f901

Legacy databases carry this revision and already contain users, subjects and
tasks. Their schema is equivalent to the reproducible 1b7cae50f901 baseline.
Keeping that historical identity in the chain allows a normal upgrade,
without recreating the core tables or manually stamping a populated DB.

On clean installs, 1b7cae50f901 creates the core and this checkpoint is a no-op.
On legacy installs already at 079be52cae26, Alembic proceeds to the calendar.
"""

revision = "079be52cae26"
down_revision = "1b7cae50f901"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
