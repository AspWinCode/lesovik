"""workflow: add assignee fields to state_def and workflow_instance

Revision ID: 0025
Revises: 0024
Create Date: 2026-07-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # state_def: default assignee when entering this state
    op.add_column(
        "state_def",
        sa.Column("assignee_type", sa.String(16), nullable=True),
        schema="workflow",
    )
    op.add_column(
        "state_def",
        sa.Column("assignee_id", sa.String(128), nullable=True),
        schema="workflow",
    )

    # workflow_instance: currently assigned user / group
    op.add_column(
        "workflow_instance",
        sa.Column("assigned_user_id", UUID(as_uuid=True), nullable=True),
        schema="workflow",
    )
    op.add_column(
        "workflow_instance",
        sa.Column("assigned_group_id", UUID(as_uuid=True), nullable=True),
        schema="workflow",
    )


def downgrade() -> None:
    op.drop_column("workflow_instance", "assigned_group_id", schema="workflow")
    op.drop_column("workflow_instance", "assigned_user_id", schema="workflow")
    op.drop_column("state_def", "assignee_id", schema="workflow")
    op.drop_column("state_def", "assignee_type", schema="workflow")
