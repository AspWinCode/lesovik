"""Document registrar + номенклатура дел (ТЗ 3.10)

Revision ID: 0039
Revises: 0038
Create Date: 2026-09-16
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0039"
down_revision: str | None = "0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "doc_type_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doc_type", sa.String(16), nullable=False),
        sa.Column("prefix", sa.String(32), nullable=False, server_default=""),
        sa.Column("suffix", sa.String(32), nullable=False, server_default=""),
        sa.Column("include_department", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("seq_padding", sa.Integer, nullable=False, server_default="4"),
        sa.Column("reset_period", sa.String(16), nullable=False, server_default="yearly"),
        sa.UniqueConstraint("app_id", "doc_type", name="uq_doc_type_config_app_type"),
        schema="data",
    )
    op.create_index("ix_data_doc_type_config_app", "doc_type_config", ["app_id"], schema="data")

    op.create_table(
        "registration_counter",
        sa.Column("app_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("doc_type", sa.String(16), primary_key=True),
        sa.Column("department_code", sa.String(32), primary_key=True, server_default=""),
        sa.Column("year", sa.Integer, primary_key=True, server_default="0"),
        sa.Column("month", sa.Integer, primary_key=True, server_default="0"),
        sa.Column("next_value", sa.Integer, nullable=False, server_default="1"),
        schema="data",
    )

    op.create_table(
        "filing_case",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "parent_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("data.filing_case.id", ondelete="RESTRICT"), nullable=True,
        ),
        sa.Column("index_code", sa.String(64), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("retention_years", sa.Integer, nullable=True),
        sa.Column("storage_location", sa.String(256), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("close_by", sa.Date, nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("responsible_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("app_id", "index_code", name="uq_filing_case_app_index"),
        schema="data",
    )
    op.create_index("ix_data_filing_case_app", "filing_case", ["app_id"], schema="data")
    op.create_index(
        "ix_data_filing_case_open_close_by", "filing_case", ["close_by"],
        schema="data", postgresql_where=sa.text("status = 'open' AND close_by IS NOT NULL"),
    )

    op.create_table(
        "document_registration",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doc_type", sa.String(16), nullable=False),
        sa.Column("department_code", sa.String(32), nullable=True),
        sa.Column("registration_no", sa.String(128), nullable=False),
        sa.Column(
            "filing_case_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("data.filing_case.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column("registered_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("app_id", "doc_type", "registration_no", name="uq_document_registration_no"),
        schema="data",
    )
    op.create_index("ix_data_document_registration_app", "document_registration", ["app_id"], schema="data")
    op.create_index("ix_data_document_registration_entity", "document_registration", ["entity_id"], schema="data")
    op.create_index("ix_data_document_registration_record", "document_registration", ["record_id"], schema="data")


def downgrade() -> None:
    op.drop_table("document_registration", schema="data")
    op.drop_table("filing_case", schema="data")
    op.drop_table("registration_counter", schema="data")
    op.drop_table("doc_type_config", schema="data")
