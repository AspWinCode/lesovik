"""record_file versioning

Adds version chain columns to data.record_file. Whether an upload replaces
the current version or adds an independent file is an application-level
decision (the `replace` flag on FileService.upload_file) — the same
field_name is used both for single-value fields (replace) and multi-file
attachment lists (independent), so no filename- or field-based uniqueness
can be enforced at the DB level here; the "one latest per group" invariant
for the replace path is enforced procedurally via row locking instead.

Revision ID: 0034
Revises: 0033
Create Date: 2026-09-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0034"
down_revision = "0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "record_file",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        schema="data",
    )
    op.add_column(
        "record_file",
        sa.Column("is_latest", sa.Boolean(), nullable=False, server_default="true"),
        schema="data",
    )
    op.add_column(
        "record_file",
        sa.Column("previous_version_id", UUID(as_uuid=True), nullable=True),
        schema="data",
    )
    op.create_foreign_key(
        "fk_record_file_previous_version",
        "record_file",
        "record_file",
        ["previous_version_id"],
        ["id"],
        source_schema="data",
        referent_schema="data",
        ondelete="SET NULL",
    )
    # Speeds up both list_files' default (is_latest-only) filter and the
    # replace-path lookup in FileService.upload_file. Not unique: a
    # multi-file attachment list can legitimately have several latest rows
    # for the same (record_id, field_name).
    op.execute(
        """
        CREATE INDEX ix_data_record_file_latest
        ON data.record_file (record_id, field_name)
        WHERE is_latest
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS data.ix_data_record_file_latest")
    op.drop_constraint(
        "fk_record_file_previous_version", "record_file", schema="data", type_="foreignkey"
    )
    op.drop_column("record_file", "previous_version_id", schema="data")
    op.drop_column("record_file", "is_latest", schema="data")
    op.drop_column("record_file", "version", schema="data")
