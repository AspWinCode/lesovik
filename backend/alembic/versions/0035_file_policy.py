"""File policy: admin-configurable size/format limits (ТЗ 3.7.1 / Приложение A)

Revision ID: 0035
Revises: 0034
Create Date: 2026-09-13
"""
import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0035"
down_revision: str | None = "0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_ALLOWED_EXTENSIONS = [
    "pdf", "docx", "xlsx", "pptx", "odt", "txt", "rtf",
    "jpg", "jpeg", "png", "gif", "webp", "svg",
    "zip", "rar", "7z",
]


def upgrade() -> None:
    # Singleton policy row (id=1 always) — mirrors identity.password_policy
    # and identity.session_policy.
    op.create_table(
        "file_policy",
        sa.Column("id", sa.SmallInteger, primary_key=True),
        sa.Column("max_file_size_mb", sa.Integer, nullable=False, server_default="100"),
        sa.Column("max_files_per_record", sa.Integer, nullable=False, server_default="50"),
        sa.Column("allowed_extensions", postgresql.JSONB, nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        schema="identity",
    )

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "INSERT INTO identity.file_policy (id, allowed_extensions) "
            "VALUES (1, CAST(:ext AS jsonb))"
        ),
        {"ext": json.dumps(DEFAULT_ALLOWED_EXTENSIONS)},
    )


def downgrade() -> None:
    op.drop_table("file_policy", schema="identity")
