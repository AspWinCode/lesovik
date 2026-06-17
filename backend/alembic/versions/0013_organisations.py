"""Add organisations: identity.organisation table, org_id to user and app.

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-18 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organisation",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("plan", sa.String(64), nullable=False, server_default="trial"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_organisation_slug"),
        schema="identity",
    )

    op.add_column(
        "user",
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema="identity",
    )
    op.create_foreign_key(
        "fk_user_org_id",
        "user", "organisation",
        ["org_id"], ["id"],
        source_schema="identity", referent_schema="identity",
        ondelete="SET NULL",
    )
    op.create_index("ix_user_org_id", "user", ["org_id"], schema="identity")

    op.add_column(
        "app",
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema="catalog",
    )
    op.create_foreign_key(
        "fk_app_org_id",
        "app", "organisation",
        ["org_id"], ["id"],
        source_schema="catalog", referent_schema="identity",
        ondelete="SET NULL",
    )
    op.create_index("ix_app_org_id", "app", ["org_id"], schema="catalog")

    op.execute(
        "INSERT INTO identity.role (id, display_name, is_system) "
        "VALUES ('org_admin', 'Organisation Admin', true) "
        "ON CONFLICT (id) DO NOTHING"
    )


def downgrade() -> None:
    op.drop_index("ix_app_org_id", table_name="app", schema="catalog")
    op.drop_constraint("fk_app_org_id", "app", schema="catalog", type_="foreignkey")
    op.drop_column("app", "org_id", schema="catalog")

    op.drop_index("ix_user_org_id", table_name="user", schema="identity")
    op.drop_constraint("fk_user_org_id", "user", schema="identity", type_="foreignkey")
    op.drop_column("user", "org_id", schema="identity")

    op.drop_table("organisation", schema="identity")

    op.execute("DELETE FROM identity.role WHERE id = 'org_admin'")
