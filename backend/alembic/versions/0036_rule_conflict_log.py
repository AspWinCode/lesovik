"""Rule conflict log (ТЗ 3.5.4): field-level priority conflicts between rules

Revision ID: 0036
Revises: 0035
Create Date: 2026-09-13
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0036"
down_revision: str | None = "0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rule_conflict_log",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event", sa.String(64), nullable=False),
        sa.Column("field_name", sa.String(128), nullable=False),
        sa.Column("winning_rule_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("winning_value", postgresql.JSONB, nullable=False),
        sa.Column("losing_writes", postgresql.JSONB, nullable=False),
        sa.Column("execution_batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "detected_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        schema="logic",
    )
    op.create_index("ix_logic_rule_conflict_log_app", "rule_conflict_log", ["app_id"], schema="logic")
    op.create_index("ix_logic_rule_conflict_log_record", "rule_conflict_log", ["record_id"], schema="logic")
    op.create_index("ix_logic_rule_conflict_log_batch", "rule_conflict_log", ["execution_batch_id"], schema="logic")


def downgrade() -> None:
    op.drop_table("rule_conflict_log", schema="logic")
