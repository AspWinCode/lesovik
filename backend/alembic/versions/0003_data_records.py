"""data schema: record (HASH partitioned) + record_file

Revision ID: 0003
Revises: 0002
Create Date: 2025-01-03 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Number of HASH partitions — increase only by recreating table + migrating data
PARTITIONS = 8


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # data.record — HASH partitioned by entity_id
    # ------------------------------------------------------------------ #
    op.execute("""
        CREATE TABLE data.record (
            entity_id   UUID        NOT NULL,
            id          UUID        NOT NULL DEFAULT gen_random_uuid(),
            payload     JSONB       NOT NULL DEFAULT '{}',
            is_deleted  BOOLEAN     NOT NULL DEFAULT false,
            version     INT         NOT NULL DEFAULT 1,
            created_by  UUID,
            updated_by  UUID,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (entity_id, id)
        ) PARTITION BY HASH (entity_id)
    """)

    # Create 8 HASH partitions
    for i in range(PARTITIONS):
        op.execute(f"""
            CREATE TABLE data.record_p{i}
            PARTITION OF data.record
            FOR VALUES WITH (MODULUS {PARTITIONS}, REMAINDER {i})
        """)

    # GIN index on payload — enables @>, ?, ?|, ?& operators
    op.execute(
        "CREATE INDEX ix_data_record_payload_gin ON data.record USING GIN (payload)"
    )
    # B-tree indexes for cursor pagination and soft-delete filter
    op.execute(
        "CREATE INDEX ix_data_record_created ON data.record (entity_id, created_at, id)"
    )
    op.execute(
        "CREATE INDEX ix_data_record_not_deleted ON data.record (entity_id) WHERE is_deleted = false"
    )

    # updated_at trigger (reuse catalog helper)
    op.execute("""
        CREATE OR REPLACE FUNCTION data.set_updated_at()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER trg_record__updated_at
            BEFORE UPDATE ON data.record
            FOR EACH ROW EXECUTE FUNCTION data.set_updated_at()
    """)

    # ------------------------------------------------------------------ #
    # data.record_file
    # ------------------------------------------------------------------ #
    op.create_table(
        "record_file",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_name", sa.String(128), nullable=False),
        sa.Column("original_filename", sa.String(512), nullable=False),
        sa.Column("content_type", sa.String(128), nullable=True),
        sa.Column("size_bytes", sa.BigInteger, nullable=True),
        sa.Column("s3_key", sa.String(1024), nullable=False),
        sa.Column("is_scanned", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_infected", sa.Boolean, nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        schema="data",
    )
    op.create_index("ix_data_record_file_record", "record_file", ["record_id"], schema="data")
    op.create_index("ix_data_record_file_entity", "record_file", ["entity_id"], schema="data")
    op.create_index("ix_data_record_file_app", "record_file", ["app_id"], schema="data")

    # ------------------------------------------------------------------ #
    # integration.outbox — transactional outbox for async events
    # ------------------------------------------------------------------ #
    op.execute("""
        CREATE TABLE integration.outbox (
            id           UUID        NOT NULL DEFAULT gen_random_uuid(),
            topic        VARCHAR(128) NOT NULL,
            payload      JSONB       NOT NULL,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            sent_at      TIMESTAMPTZ,
            retries      INT         NOT NULL DEFAULT 0,
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


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS integration.outbox")
    op.execute("DROP TRIGGER IF EXISTS trg_record__updated_at ON data.record")
    op.execute("DROP FUNCTION IF EXISTS data.set_updated_at()")
    op.drop_table("record_file", schema="data")

    for i in range(PARTITIONS - 1, -1, -1):
        op.execute(f"DROP TABLE IF EXISTS data.record_p{i}")
    op.execute("DROP TABLE IF EXISTS data.record")
