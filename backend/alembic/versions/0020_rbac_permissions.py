"""RBAC resource permissions + ABAC rules.

revision ID: 0020
Revises: 0019
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # resource_permission: role → resource access matrix
    op.create_table(
        "resource_permission",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("role_id", sa.String(64), nullable=False),
        sa.Column("resource_type", sa.String(32), nullable=False),   # app|page|block|field|record
        sa.Column("resource_id", sa.String(256), nullable=False),
        sa.Column("action", sa.String(32), nullable=False),          # read|write|delete|manage
        sa.Column("allowed", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["role_id"], ["identity.role.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "role_id", "resource_type", "resource_id", "action",
            name="uq_resource_permission",
        ),
        schema="identity",
    )
    op.create_index(
        "ix_resource_permission_role",
        "resource_permission",
        ["role_id"],
        schema="identity",
    )

    # abac_rule: conditional record-level visibility / editability
    op.create_table(
        "abac_rule",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("role_id", sa.String(64), nullable=False),
        sa.Column("resource_type", sa.String(128), nullable=False),  # entity type slug or entity_id
        sa.Column("resource_id", sa.String(256), nullable=True),     # optional specific resource
        sa.Column(
            "condition_json",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("effect", sa.String(8), nullable=False, server_default="allow"),  # allow|deny
        sa.Column("priority", sa.Integer, nullable=False, server_default="0"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["role_id"], ["identity.role.id"], ondelete="CASCADE"
        ),
        schema="identity",
    )
    op.create_index(
        "ix_abac_rule_role",
        "abac_rule",
        ["role_id"],
        schema="identity",
    )


def downgrade() -> None:
    op.drop_index("ix_abac_rule_role", table_name="abac_rule", schema="identity")
    op.drop_table("abac_rule", schema="identity")
    op.drop_index(
        "ix_resource_permission_role",
        table_name="resource_permission",
        schema="identity",
    )
    op.drop_table("resource_permission", schema="identity")
