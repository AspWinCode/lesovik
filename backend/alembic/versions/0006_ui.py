"""ui schema: view / view_field_config / page

Revision ID: 0006
Revises: 0005
Create Date: 2025-01-06 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS ui")

    # ------------------------------------------------------------------ #
    # ui.view — entity record views (table / form / kanban / calendar …)
    # ------------------------------------------------------------------ #
    op.create_table(
        "view",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("view_type", sa.String(32), nullable=False),   # table|form|kanban|calendar|gallery|detail
        sa.Column("config", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_public", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        schema="ui",
    )
    op.create_index("ix_ui_view_entity", "view", ["app_id", "entity_id"], schema="ui")
    # Only one default view per entity
    op.execute("""
        CREATE UNIQUE INDEX uq_ui_view_entity_default
        ON ui.view (entity_id)
        WHERE is_default = true
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION ui.set_updated_at()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER trg_view__updated_at
            BEFORE UPDATE ON ui.view
            FOR EACH ROW EXECUTE FUNCTION ui.set_updated_at()
    """)

    # ------------------------------------------------------------------ #
    # ui.view_field_config — per-field display overrides within a view
    # ------------------------------------------------------------------ #
    op.create_table(
        "view_field_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("view_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_name", sa.String(128), nullable=False),
        sa.Column("is_visible", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_readonly", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("width", sa.Integer, nullable=True),           # px; null = auto
        sa.Column("widget_type", sa.String(64), nullable=True),  # null = default for field_type
        sa.Column("widget_config", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.ForeignKeyConstraint(["view_id"], ["ui.view.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("view_id", "field_name", name="uq_view_field_config"),
        schema="ui",
    )
    op.create_index("ix_ui_vfc_view", "view_field_config", ["view_id"], schema="ui")

    # ------------------------------------------------------------------ #
    # ui.page — app pages (sidebar navigation items)
    # ------------------------------------------------------------------ #
    op.create_table(
        "page",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("icon", sa.String(64), nullable=True),
        sa.Column("nav_order", sa.Integer, nullable=False, server_default="0"),
        # layout: {"type": "full_width"|"sidebar"|"two_column", ...}
        sa.Column("layout", postgresql.JSONB, nullable=False, server_default="{}"),
        # blocks: [{id, type, view_id?, content?, config}]
        sa.Column("blocks", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.UniqueConstraint("app_id", "slug", name="uq_ui_page_app_slug"),
        schema="ui",
    )
    op.create_index("ix_ui_page_app", "page", ["app_id", "nav_order"], schema="ui")
    op.execute("""
        CREATE TRIGGER trg_page__updated_at
            BEFORE UPDATE ON ui.page
            FOR EACH ROW EXECUTE FUNCTION ui.set_updated_at()
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ui.view_field_config CASCADE")
    op.execute("DROP TABLE IF EXISTS ui.page CASCADE")
    op.execute("DROP TRIGGER IF EXISTS trg_view__updated_at ON ui.view")
    op.execute("DROP TABLE IF EXISTS ui.view CASCADE")
    op.execute("DROP FUNCTION IF EXISTS ui.set_updated_at()")
    op.execute("DROP SCHEMA IF EXISTS ui")
