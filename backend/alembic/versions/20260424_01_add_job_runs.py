"""add job runs observability table

Revision ID: 20260424_01
Revises: 20260423_01
Create Date: 2026-04-24 11:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260424_01"
down_revision = "20260423_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("job_name", sa.String(), nullable=False),
        sa.Column("job_type", sa.String(), nullable=False),
        sa.Column("trigger_source", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(), nullable=True),
        sa.Column("target_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("result_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_job_runs_name_started", "job_runs", ["job_name", "started_at"], unique=False)
    op.create_index("idx_job_runs_status", "job_runs", ["status"], unique=False)
    op.create_index("idx_job_runs_created_at", "job_runs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_job_runs_created_at", table_name="job_runs")
    op.drop_index("idx_job_runs_status", table_name="job_runs")
    op.drop_index("idx_job_runs_name_started", table_name="job_runs")
    op.drop_table("job_runs")
