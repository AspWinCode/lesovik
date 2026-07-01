"""Password policy table, history, and user expiry columns

Revision ID: 0018
Revises: 0017
Create Date: 2026-07-01 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Singleton policy row (id=1 always)
    op.create_table(
        "password_policy",
        sa.Column("id", sa.SmallInteger, primary_key=True),
        sa.Column("min_length", sa.Integer, nullable=False, server_default="10"),
        sa.Column("require_uppercase", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("require_lowercase", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("require_digit", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("require_special", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("max_age_days", sa.Integer, nullable=False, server_default="0"),
        sa.Column("history_depth", sa.Integer, nullable=False, server_default="5"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        schema="identity",
    )

    # Seed default row
    op.execute("INSERT INTO identity.password_policy (id) VALUES (1)")

    # Per-user password history
    op.create_table(
        "password_history",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("identity.user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        schema="identity",
    )

    # Track when the password was last changed and when it expires
    op.add_column(
        "user",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
        schema="identity",
    )
    op.add_column(
        "user",
        sa.Column("password_expires_at", sa.DateTime(timezone=True), nullable=True),
        schema="identity",
    )


def downgrade() -> None:
    op.drop_column("user", "password_expires_at", schema="identity")
    op.drop_column("user", "password_changed_at", schema="identity")
    op.drop_table("password_history", schema="identity")
    op.drop_table("password_policy", schema="identity")
