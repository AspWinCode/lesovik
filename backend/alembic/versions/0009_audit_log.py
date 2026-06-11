"""identity.audit_log table

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-11 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_email", sa.String(320), nullable=True),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=True),
        sa.Column("resource_id", sa.String(128), nullable=True),
        sa.Column("level", sa.String(16), nullable=False, server_default="info"),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("details", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        schema="identity",
    )
    op.create_index("ix_audit_log_user_id",    "audit_log", ["user_id"],    schema="identity")
    op.create_index("ix_audit_log_action",      "audit_log", ["action"],     schema="identity")
    op.create_index("ix_audit_log_created_at",  "audit_log", ["created_at"], schema="identity")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS identity.audit_log CASCADE")
