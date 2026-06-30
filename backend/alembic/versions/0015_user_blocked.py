"""add is_blocked to identity.user

Revision ID: 0015
Revises: 0014
Create Date: 2025-01-15 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default="false"),
        schema="identity",
    )


def downgrade() -> None:
    op.drop_column("user", "is_blocked", schema="identity")
