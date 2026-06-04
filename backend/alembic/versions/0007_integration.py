"""integration schema: webhook_subscription / webhook_delivery

NOTE: integration.outbox was created in 0003_data_records.py — only new
      tables are added here.

Revision ID: 0007
Revises: 0006
Create Date: 2025-01-07 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # schema already exists from 0003
    op.execute("CREATE SCHEMA IF NOT EXISTS integration")

    # ------------------------------------------------------------------ #
    # integration.webhook_subscription
    # ------------------------------------------------------------------ #
    op.create_table(
        "webhook_subscription",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("target_url", sa.String(2048), nullable=False),
        # Event filter list, e.g. ["record.created", "workflow.*", "*"]
        sa.Column("events", postgresql.JSONB, nullable=False, server_default='["*"]'),
        # HMAC-SHA256 signing secret (stored plain; rotate via API)
        sa.Column("secret", sa.String(256), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        # Extra headers forwarded on every delivery
        sa.Column("custom_headers", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("timeout_seconds", sa.Integer, nullable=False, server_default="30"),
        sa.Column("max_retries", sa.Integer, nullable=False, server_default="3"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        schema="integration",
    )
    op.create_index("ix_int_sub_app", "webhook_subscription", ["app_id"], schema="integration")
    op.execute("""
        CREATE OR REPLACE FUNCTION integration.set_updated_at()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER trg_webhook_subscription__updated_at
            BEFORE UPDATE ON integration.webhook_subscription
            FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at()
    """)

    # ------------------------------------------------------------------ #
    # integration.webhook_delivery
    # ------------------------------------------------------------------ #
    op.create_table(
        "webhook_delivery",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB, nullable=False),
        # nullable: deliveries can be triggered without an outbox event (manual)
        sa.Column("outbox_id", postgresql.UUID(as_uuid=True), nullable=True),
        # pending / delivering / delivered / failed / exhausted
        sa.Column("status", sa.String(32), nullable=False, server_default="'pending'"),
        sa.Column("attempt_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_response_code", sa.Integer, nullable=True),
        # Capped at 4096 chars to prevent runaway storage
        sa.Column("last_response_body", sa.String(4096), nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["subscription_id"], ["integration.webhook_subscription.id"],
            ondelete="CASCADE",
        ),
        schema="integration",
    )
    op.create_index("ix_int_del_subscription", "webhook_delivery",
                    ["subscription_id", "created_at"], schema="integration")
    op.create_index("ix_int_del_app", "webhook_delivery",
                    ["app_id", "status", "next_retry_at"], schema="integration")
    op.create_index("ix_int_del_outbox", "webhook_delivery",
                    ["outbox_id"], schema="integration",
                    postgresql_where=sa.text("outbox_id IS NOT NULL"))


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS integration.webhook_delivery CASCADE")
    op.execute(
        "DROP TRIGGER IF EXISTS trg_webhook_subscription__updated_at "
        "ON integration.webhook_subscription"
    )
    op.execute("DROP TABLE IF EXISTS integration.webhook_subscription CASCADE")
    op.execute("DROP FUNCTION IF EXISTS integration.set_updated_at()")
