"""init schemas and identity tables

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMAS = [
    "identity", "catalog", "metamodel",
    "ui", "logic", "data", "integration", "audit",
]


def upgrade() -> None:
    # Create all managed schemas
    for schema in SCHEMAS:
        op.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")

    # ------------------------------------------------------------------ #
    # identity.role
    # ------------------------------------------------------------------ #
    op.create_table(
        "role",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("display_name", sa.String(128), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        schema="identity",
    )

    # ------------------------------------------------------------------ #
    # identity.user
    # ------------------------------------------------------------------ #
    op.create_table(
        "user",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("password_hash", sa.String(256), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_superuser", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("totp_secret", sa.String(64), nullable=True),
        sa.Column("totp_enabled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        schema="identity",
    )
    op.create_index("ix_identity_user_email", "user", ["email"], schema="identity")

    # ------------------------------------------------------------------ #
    # identity.user_role
    # ------------------------------------------------------------------ #
    op.create_table(
        "user_role",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("identity.user.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "role_id",
            sa.String(64),
            sa.ForeignKey("identity.role.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("granted_by", postgresql.UUID(as_uuid=True), nullable=True),
        schema="identity",
    )

    # ------------------------------------------------------------------ #
    # identity.refresh_token
    # ------------------------------------------------------------------ #
    op.create_table(
        "refresh_token",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("identity.user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        schema="identity",
    )
    op.create_index(
        "ix_identity_refresh_token_hash",
        "refresh_token",
        ["token_hash"],
        schema="identity",
    )
    op.create_index(
        "ix_identity_refresh_token_user",
        "refresh_token",
        ["user_id"],
        schema="identity",
    )

    # ------------------------------------------------------------------ #
    # audit.audit_log — append-only, partitioned by month
    # ------------------------------------------------------------------ #
    op.execute("""
        CREATE TABLE audit.audit_log (
            id          BIGSERIAL,
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            actor_id    UUID,
            action      VARCHAR(64)  NOT NULL,
            resource    VARCHAR(128),
            resource_id UUID,
            app_id      UUID,
            ip_address  VARCHAR(45),
            payload     JSONB,
            prev_hash   CHAR(64),
            row_hash    CHAR(64) NOT NULL,
            PRIMARY KEY (id, occurred_at)
        ) PARTITION BY RANGE (occurred_at)
    """)

    # Deny UPDATE/DELETE on audit log
    op.execute("""
        CREATE OR REPLACE FUNCTION audit.deny_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'audit_log is append-only';
        END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER trg_audit__no_update
            BEFORE UPDATE OR DELETE ON audit.audit_log
            FOR EACH ROW EXECUTE FUNCTION audit.deny_mutation()
    """)

    # Seed system roles
    op.execute("""
        INSERT INTO identity.role (id, display_name, is_system) VALUES
            ('platform_admin', 'Platform Admin', true),
            ('app_builder',    'App Builder',    true),
            ('app_admin',      'App Admin',      true),
            ('data_editor',    'Data Editor',    true),
            ('data_viewer',    'Data Viewer',    true),
            ('workflow_actor', 'Workflow Actor', true),
            ('auditor',        'Auditor',        true),
            ('api_client',     'API Client',     true)
        ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_audit__no_update ON audit.audit_log")
    op.execute("DROP FUNCTION IF EXISTS audit.deny_mutation()")
    op.execute("DROP TABLE IF EXISTS audit.audit_log")

    op.drop_table("refresh_token", schema="identity")
    op.drop_table("user_role", schema="identity")
    op.drop_table("user", schema="identity")
    op.drop_table("role", schema="identity")

    for schema in reversed(SCHEMAS):
        op.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
