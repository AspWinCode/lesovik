"""Session policy table and last_activity_at on refresh_token

Revision ID: 0019
Revises: 0018
Create Date: 2026-07-01 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "session_policy",
        sa.Column("id", sa.SmallInteger, primary_key=True),
        sa.Column("timeout_minutes", sa.Integer, nullable=False, server_default="30"),
        sa.Column("max_concurrent_sessions", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        schema="identity",
    )
    op.execute("INSERT INTO identity.session_policy (id) VALUES (1)")

    op.add_column(
        "refresh_token",
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        schema="identity",
    )


def downgrade() -> None:
    op.drop_column("refresh_token", "last_activity_at", schema="identity")
    op.drop_table("session_policy", schema="identity")
