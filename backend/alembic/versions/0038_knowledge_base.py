"""Knowledge base: support.article + support.article_image (ТЗ 3.12)

Revision ID: 0038
Revises: 0037
Create Date: 2026-09-15
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0038"
down_revision: str | None = "0037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS support")

    op.create_table(
        "article",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("slug", sa.String(200), nullable=False, unique=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("category", sa.String(128), nullable=True),
        sa.Column("content", sa.Text, nullable=False, server_default=""),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"), onupdate=sa.text("now()"),
        ),
        schema="support",
    )
    op.create_index("ix_support_article_category", "article", ["category"], schema="support")

    op.create_table(
        "article_image",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "article_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("support.article.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column("s3_key", sa.String(1024), nullable=False),
        sa.Column("content_type", sa.String(128), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="support",
    )
    op.create_index("ix_support_article_image_article", "article_image", ["article_id"], schema="support")


def downgrade() -> None:
    op.drop_table("article_image", schema="support")
    op.drop_table("article", schema="support")
    op.execute("DROP SCHEMA IF EXISTS support")
