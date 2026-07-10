"""workflow: SLA escalation levels per state

Revision ID: 0027
Revises: 0026
Create Date: 2026-07-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "state_def",
        sa.Column("escalation_levels", JSONB, nullable=False, server_default="[]"),
        schema="workflow",
    )
    op.add_column(
        "workflow_instance",
        sa.Column("escalation_level", sa.Integer(), nullable=True),
        schema="workflow",
    )


def downgrade() -> None:
    op.drop_column("state_def", "escalation_levels", schema="workflow")
    op.drop_column("workflow_instance", "escalation_level", schema="workflow")
