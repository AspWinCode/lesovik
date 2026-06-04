"""catalog and metamodel schemas

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-02 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # catalog.app
    # ------------------------------------------------------------------ #
    op.create_table(
        "app",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("slug", sa.String(128), nullable=False, unique=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("icon", sa.String(64), nullable=True),
        sa.Column("color", sa.String(32), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("identity.user.id", ondelete="SET NULL"),
            nullable=False,
        ),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_archived", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("settings", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        schema="catalog",
    )
    op.create_index("ix_catalog_app_slug", "app", ["slug"], schema="catalog")
    op.create_index("ix_catalog_app_owner", "app", ["owner_id"], schema="catalog")

    # ------------------------------------------------------------------ #
    # catalog.app_member
    # ------------------------------------------------------------------ #
    op.create_table(
        "app_member",
        sa.Column(
            "app_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("catalog.app.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("identity.user.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column(
            "granted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("granted_by", postgresql.UUID(as_uuid=True), nullable=True),
        schema="catalog",
    )
    op.create_index("ix_catalog_app_member_user", "app_member", ["user_id"], schema="catalog")

    # ------------------------------------------------------------------ #
    # metamodel.entity
    # ------------------------------------------------------------------ #
    op.create_table(
        "entity",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "app_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("catalog.app.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("name_plural", sa.String(256), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("icon", sa.String(64), nullable=True),
        sa.Column("color", sa.String(32), nullable=True),
        sa.Column("settings", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("field_order", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.UniqueConstraint("app_id", "slug", name="uq_entity_app_slug"),
        schema="metamodel",
    )
    op.create_index("ix_metamodel_entity_app", "entity", ["app_id"], schema="metamodel")

    # ------------------------------------------------------------------ #
    # metamodel.field
    # ------------------------------------------------------------------ #
    op.create_table(
        "field",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("metamodel.entity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("field_type", sa.String(64), nullable=False),
        sa.Column("is_required", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_unique", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_indexed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("default_value", postgresql.JSONB, nullable=True),
        sa.Column("validation_rules", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("field_options", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.UniqueConstraint("entity_id", "name", name="uq_field_entity_name"),
        schema="metamodel",
    )
    op.create_index("ix_metamodel_field_entity", "field", ["entity_id"], schema="metamodel")
    op.create_index("ix_metamodel_field_app", "field", ["app_id"], schema="metamodel")

    # GIN index on validation_rules and field_options for JSON containment queries
    op.execute(
        "CREATE INDEX ix_metamodel_field_options_gin ON metamodel.field USING GIN (field_options)"
    )

    # ------------------------------------------------------------------ #
    # metamodel.relation
    # ------------------------------------------------------------------ #
    op.create_table(
        "relation",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "from_entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("metamodel.entity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("metamodel.entity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("relation_type", sa.String(32), nullable=False),
        sa.Column("from_field_name", sa.String(128), nullable=False),
        sa.Column("to_field_name", sa.String(128), nullable=True),
        sa.Column("display_name", sa.String(256), nullable=True),
        sa.Column("settings", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        schema="metamodel",
    )
    op.create_index("ix_metamodel_relation_app", "relation", ["app_id"], schema="metamodel")
    op.create_index(
        "ix_metamodel_relation_from", "relation", ["from_entity_id"], schema="metamodel"
    )
    op.create_index(
        "ix_metamodel_relation_to", "relation", ["to_entity_id"], schema="metamodel"
    )

    # ------------------------------------------------------------------ #
    # updated_at auto-trigger helper (reusable)
    # ------------------------------------------------------------------ #
    op.execute("""
        CREATE OR REPLACE FUNCTION catalog.set_updated_at()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END;
        $$
    """)

    for schema, table in [
        ("catalog", "app"),
        ("metamodel", "entity"),
        ("metamodel", "field"),
    ]:
        op.execute(f"""
            CREATE TRIGGER trg_{table}__updated_at
                BEFORE UPDATE ON {schema}.{table}
                FOR EACH ROW EXECUTE FUNCTION catalog.set_updated_at()
        """)


def downgrade() -> None:
    for schema, table in [
        ("metamodel", "field"),
        ("metamodel", "entity"),
        ("catalog", "app"),
    ]:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}__updated_at ON {schema}.{table}")

    op.execute("DROP FUNCTION IF EXISTS catalog.set_updated_at()")

    op.drop_table("relation", schema="metamodel")
    op.drop_table("field", schema="metamodel")
    op.drop_table("entity", schema="metamodel")
    op.drop_table("app_member", schema="catalog")
    op.drop_table("app", schema="catalog")
