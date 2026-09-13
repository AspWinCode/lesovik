"""data.record: deleted_at / deleted_by (ТЗ Приложение B, 3.9.1)

Soft-deleted records must carry when and by whom they were deleted —
Приложение B lists deleted_at/deleted_by/is_deleted as the required fields,
but only is_deleted existed. Also adds the partial index the recycle bin
listing needs (mirrors the existing ix_data_record_not_deleted).

Revision ID: 0037
Revises: 0036
Create Date: 2026-09-14
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0037"
down_revision: str | None = "0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("record", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True), schema="data")
    op.add_column("record", sa.Column("deleted_by", UUID(as_uuid=True), nullable=True), schema="data")

    # Postgres propagates an index created on the partitioned parent to all
    # partitions automatically (declarative partitioning, PG 11+) — same as
    # ix_data_record_not_deleted in 0003.
    op.execute(
        """
        CREATE INDEX ix_data_record_deleted
        ON data.record (entity_id, deleted_at DESC)
        WHERE is_deleted
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS data.ix_data_record_deleted")
    op.drop_column("record", "deleted_by", schema="data")
    op.drop_column("record", "deleted_at", schema="data")
