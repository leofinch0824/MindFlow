"""add persistent schedule config table

Revision ID: 20260424_02
Revises: 20260424_01
Create Date: 2026-04-24 16:20:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260424_02"
down_revision = "20260424_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "schedule_config",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fetch_times", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("schedule_config")
