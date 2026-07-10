"""workflow: multi-level approval chains

Revision ID: 0026
Revises: 0025
Create Date: 2026-07-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Chain definition (template, reusable within a workflow)
    op.create_table(
        "approval_chain_def",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workflow_id", UUID(as_uuid=True),
                  sa.ForeignKey("workflow.workflow_def.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        # transition to fire when all levels approved / any level rejected
        sa.Column("on_approve_transition", sa.String(128), nullable=True),
        sa.Column("on_reject_transition", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        schema="workflow",
    )
    op.create_index("ix_approval_chain_def_wf", "approval_chain_def", ["workflow_id"], schema="workflow")

    # Ordered levels within a chain
    op.create_table(
        "approval_level_def",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("chain_id", UUID(as_uuid=True),
                  sa.ForeignKey("workflow.approval_chain_def.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("level_order", sa.Integer, nullable=False),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("assignee_type", sa.String(16), nullable=True),   # user | group | role
        sa.Column("assignee_id", sa.String(128), nullable=True),
        sa.UniqueConstraint("chain_id", "level_order", name="uq_approval_level_chain_order"),
        schema="workflow",
    )

    # State → chain attachment
    op.add_column(
        "state_def",
        sa.Column("approval_chain_id", UUID(as_uuid=True),
                  sa.ForeignKey("workflow.approval_chain_def.id", ondelete="SET NULL"),
                  nullable=True),
        schema="workflow",
    )

    # Runtime: one instance per (workflow_instance, state entry)
    op.create_table(
        "approval_chain_instance",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("chain_def_id", UUID(as_uuid=True),
                  sa.ForeignKey("workflow.approval_chain_def.id"),
                  nullable=False),
        sa.Column("workflow_instance_id", UUID(as_uuid=True),
                  sa.ForeignKey("workflow.workflow_instance.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("current_level", sa.Integer, nullable=False, server_default="1"),
        sa.Column("status", sa.String(32), nullable=False, server_default="'pending'"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        schema="workflow",
    )
    op.create_index("ix_approval_chain_instance_wf_inst",
                    "approval_chain_instance", ["workflow_instance_id"], schema="workflow")

    # Runtime: per-level decisions
    op.create_table(
        "approval_level_response",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("chain_instance_id", UUID(as_uuid=True),
                  sa.ForeignKey("workflow.approval_chain_instance.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("level_order", sa.Integer, nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), nullable=True),
        sa.Column("decision", sa.String(16), nullable=False),   # approved | rejected
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        schema="workflow",
    )


def downgrade() -> None:
    op.drop_table("approval_level_response", schema="workflow")
    op.drop_table("approval_chain_instance", schema="workflow")
    op.drop_column("state_def", "approval_chain_id", schema="workflow")
    op.drop_table("approval_level_def", schema="workflow")
    op.drop_table("approval_chain_def", schema="workflow")
