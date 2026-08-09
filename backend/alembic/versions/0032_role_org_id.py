"""add org_id to role

Revision ID: 0032
Revises: 0031
Create Date: 2026-08-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0032"
down_revision = "0031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "role",
        sa.Column(
            "org_id",
            UUID(as_uuid=True),
            sa.ForeignKey("identity.organisation.id", ondelete="CASCADE"),
            nullable=True,
        ),
        schema="identity",
    )
    op.create_index("ix_identity_role_org_id", "role", ["org_id"], schema="identity")


def downgrade() -> None:
    op.drop_index("ix_identity_role_org_id", table_name="role", schema="identity")
    op.drop_column("role", "org_id", schema="identity")
