"""add_app_category_and_snapshots

Revision ID: 0021
Revises: 0020
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "app",
        sa.Column("category", sa.String(64), nullable=True),
        schema="catalog",
    )
    op.create_table(
        "app_snapshot",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "app_id",
            UUID(as_uuid=True),
            sa.ForeignKey("catalog.app.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("snapshot_num", sa.Integer, nullable=False),
        sa.Column("snapshot_json", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_by", UUID(as_uuid=True), nullable=True),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("app_id", "snapshot_num", name="uq_app_snapshot_num"),
        schema="catalog",
    )


def downgrade() -> None:
    op.drop_table("app_snapshot", schema="catalog")
    op.drop_column("app", "category", schema="catalog")
