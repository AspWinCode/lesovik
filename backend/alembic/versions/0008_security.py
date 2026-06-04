"""security schema: field_permission

Revision ID: 0008
Revises: 0007
Create Date: 2025-01-08 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS security")

    # ------------------------------------------------------------------ #
    # security.field_permission
    #
    # Field-level ABAC: explicit DENY rows per (entity_id, field_name, role_id).
    # Absence of a row = ALLOW (open by default, explicit deny).
    # If a user holds multiple roles and ANY role denies → access denied.
    # ------------------------------------------------------------------ #
    op.create_table(
        "field_permission",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_name", sa.String(128), nullable=False),
        # References identity.role.id (string PK like "data_viewer")
        sa.Column("role_id", sa.String(128), nullable=False),
        sa.Column("can_read", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("can_write", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.UniqueConstraint("entity_id", "field_name", "role_id",
                            name="uq_field_permission"),
        schema="security",
    )
    op.create_index("ix_sec_fp_entity", "field_permission", ["entity_id"], schema="security")
    op.create_index("ix_sec_fp_app",    "field_permission", ["app_id"],    schema="security")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS security.field_permission CASCADE")
    op.execute("DROP SCHEMA IF EXISTS security")
