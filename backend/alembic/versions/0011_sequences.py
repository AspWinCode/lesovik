"""Add data.sequence table for document registrar / auto-numbering

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-13 00:00:00.000000
"""
from collections.abc import Sequence as SeqType

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: SeqType[str] | None = None
depends_on: SeqType[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE data.sequence (
            id          UUID        NOT NULL DEFAULT gen_random_uuid(),
            app_id      UUID        NOT NULL,
            entity_id   UUID        NOT NULL,
            field_name  VARCHAR(128) NOT NULL,
            prefix      VARCHAR(32)  NOT NULL DEFAULT '',
            suffix      VARCHAR(32)  NOT NULL DEFAULT '',
            padding     INT          NOT NULL DEFAULT 0,
            step        INT          NOT NULL DEFAULT 1,
            next_value  BIGINT       NOT NULL DEFAULT 1,
            reset_on    VARCHAR(16),
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
            PRIMARY KEY (id),
            CONSTRAINT uq_sequence_entity_field UNIQUE (entity_id, field_name)
        )
    """)
    op.execute("CREATE INDEX ix_sequence_app_id ON data.sequence (app_id)")
    op.execute("CREATE INDEX ix_sequence_entity_id ON data.sequence (entity_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS data.sequence CASCADE")
