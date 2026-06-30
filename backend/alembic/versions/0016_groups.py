"""add identity.group, user_group, group_role tables

Revision ID: 0016
Revises: 0015
Create Date: 2025-01-16 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "group",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(256), nullable=False, unique=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        schema="identity",
    )

    op.create_table(
        "user_group",
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("identity.user.id", ondelete="CASCADE"),
                  primary_key=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("identity.group.id", ondelete="CASCADE"),
                  primary_key=True),
        sa.Column("joined_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        schema="identity",
    )

    op.create_table(
        "group_role",
        sa.Column("group_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("identity.group.id", ondelete="CASCADE"),
                  primary_key=True),
        sa.Column("role_id", sa.String(64),
                  sa.ForeignKey("identity.role.id", ondelete="CASCADE"),
                  primary_key=True),
        schema="identity",
    )


def downgrade() -> None:
    op.drop_table("group_role", schema="identity")
    op.drop_table("user_group", schema="identity")
    op.drop_table("group", schema="identity")
