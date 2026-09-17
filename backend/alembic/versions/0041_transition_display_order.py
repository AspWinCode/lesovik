"""Add display_order to transition_def so workflow actions can be reordered

Revision ID: 0041
Revises: 0040
Create Date: 2026-09-16
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0041"
down_revision: str | None = "0040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "transition_def",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        schema="workflow",
    )
    # Backfill existing rows with a stable order matching the old implicit
    # sort (from_state, name) so this migration doesn't reshuffle anything
    # already in production.
    op.execute("""
        WITH ordered AS (
            SELECT id, row_number() OVER (
                PARTITION BY workflow_id ORDER BY from_state, name
            ) - 1 AS rn
            FROM workflow.transition_def
        )
        UPDATE workflow.transition_def t
        SET display_order = ordered.rn
        FROM ordered
        WHERE t.id = ordered.id
    """)


def downgrade() -> None:
    op.drop_column("transition_def", "display_order", schema="workflow")
