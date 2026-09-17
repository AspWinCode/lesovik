"""Add is_sensitive to field — AES-256-GCM encryption + masking (ТЗ 3.13)

Revision ID: 0042
Revises: 0041
Create Date: 2026-09-17
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0042"
down_revision: str | None = "0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "field",
        sa.Column("is_sensitive", sa.Boolean(), nullable=False, server_default="false"),
        schema="metamodel",
    )


def downgrade() -> None:
    op.drop_column("field", "is_sensitive", schema="metamodel")
