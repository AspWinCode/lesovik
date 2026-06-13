"""Rebuild integration.outbox to match current ORM model

The original 0003 migration created outbox with columns (topic, payload, created_at,
sent_at, retries, dedup_key).  The ORM model now uses (app_id, event_type, payload,
dedup_key, status, scheduled_at, created_at, processed_at).  Drop and recreate.

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-13 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS integration.outbox CASCADE")
    op.execute("""
        CREATE TABLE integration.outbox (
            id           UUID         NOT NULL DEFAULT gen_random_uuid(),
            app_id       UUID         NOT NULL,
            event_type   VARCHAR(64)  NOT NULL,
            payload      JSONB        NOT NULL,
            dedup_key    VARCHAR(256),
            status       VARCHAR(32)  NOT NULL DEFAULT 'pending',
            scheduled_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
            created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
            processed_at TIMESTAMPTZ,
            PRIMARY KEY (id)
        )
    """)
    op.execute(
        "CREATE INDEX ix_integration_outbox_pending ON integration.outbox (scheduled_at) WHERE status = 'pending'"
    )
    op.execute(
        "CREATE UNIQUE INDEX ix_integration_outbox_dedup ON integration.outbox (dedup_key) WHERE dedup_key IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS integration.outbox CASCADE")
    op.execute("""
        CREATE TABLE integration.outbox (
            id           UUID         NOT NULL DEFAULT gen_random_uuid(),
            topic        VARCHAR(128) NOT NULL,
            payload      JSONB        NOT NULL,
            created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
            sent_at      TIMESTAMPTZ,
            retries      INT          NOT NULL DEFAULT 0,
            dedup_key    VARCHAR(256),
            PRIMARY KEY (id)
        )
    """)
    op.execute(
        "CREATE INDEX ix_integration_outbox_unsent ON integration.outbox (created_at) WHERE sent_at IS NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX ix_integration_outbox_dedup ON integration.outbox (dedup_key) WHERE dedup_key IS NOT NULL"
    )
