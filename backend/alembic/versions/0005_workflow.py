"""workflow schema: workflow_def / state_def / transition_def / workflow_instance / transition_log

Revision ID: 0005
Revises: 0004
Create Date: 2025-01-05 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS workflow")

    # ------------------------------------------------------------------ #
    # workflow.workflow_def
    # ------------------------------------------------------------------ #
    op.create_table(
        "workflow_def",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("initial_state", sa.String(128), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        schema="workflow",
    )
    op.create_index("ix_wf_def_app", "workflow_def", ["app_id"], schema="workflow")
    op.create_index("ix_wf_def_entity", "workflow_def", ["app_id", "entity_id"], schema="workflow")

    op.execute("""
        CREATE OR REPLACE FUNCTION workflow.set_updated_at()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER trg_workflow_def__updated_at
            BEFORE UPDATE ON workflow.workflow_def
            FOR EACH ROW EXECUTE FUNCTION workflow.set_updated_at()
    """)

    # ------------------------------------------------------------------ #
    # workflow.state_def
    # ------------------------------------------------------------------ #
    op.create_table(
        "state_def",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("is_terminal", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("sla_seconds", sa.Integer, nullable=True),
        sa.Column("on_enter_actions", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("on_exit_actions", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("sla_breach_actions", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("color", sa.String(32), nullable=True),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflow.workflow_def.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("workflow_id", "name", name="uq_state_def_wf_name"),
        schema="workflow",
    )
    op.create_index("ix_wf_state_workflow", "state_def", ["workflow_id"], schema="workflow")

    # ------------------------------------------------------------------ #
    # workflow.transition_def
    # ------------------------------------------------------------------ #
    op.create_table(
        "transition_def",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("from_state", sa.String(128), nullable=False),
        sa.Column("to_state", sa.String(128), nullable=False),
        sa.Column("guard_conditions", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("actions", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("required_roles", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflow.workflow_def.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("workflow_id", "from_state", "name",
                            name="uq_transition_def_wf_from_name"),
        schema="workflow",
    )
    op.create_index("ix_wf_transition_workflow", "transition_def", ["workflow_id"], schema="workflow")
    op.create_index("ix_wf_transition_from", "transition_def", ["workflow_id", "from_state"],
                    schema="workflow")

    # ------------------------------------------------------------------ #
    # workflow.workflow_instance
    # ------------------------------------------------------------------ #
    op.create_table(
        "workflow_instance",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("current_state", sa.String(128), nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("sla_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflow.workflow_def.id"]),
        sa.UniqueConstraint("workflow_id", "record_id", name="uq_instance_wf_record"),
        schema="workflow",
    )
    op.create_index("ix_wf_instance_record", "workflow_instance",
                    ["workflow_id", "record_id"], schema="workflow")
    op.create_index("ix_wf_instance_app_state", "workflow_instance",
                    ["app_id", "current_state", "sla_deadline"], schema="workflow")
    op.create_index("ix_wf_instance_app", "workflow_instance", ["app_id"], schema="workflow")

    # ------------------------------------------------------------------ #
    # workflow.transition_log
    # ------------------------------------------------------------------ #
    op.create_table(
        "transition_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("instance_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_state", sa.String(128), nullable=True),   # null on instance start
        sa.Column("to_state", sa.String(128), nullable=False),
        sa.Column("transition_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("duration_ms", sa.Integer, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.ForeignKeyConstraint(["instance_id"], ["workflow.workflow_instance.id"],
                                ondelete="CASCADE"),
        schema="workflow",
    )
    op.create_index("ix_wf_log_instance", "transition_log",
                    ["instance_id", "executed_at"], schema="workflow")
    op.create_index("ix_wf_log_workflow", "transition_log", ["workflow_id"], schema="workflow")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS workflow.transition_log CASCADE")
    op.execute("DROP TABLE IF EXISTS workflow.workflow_instance CASCADE")
    op.execute("DROP TABLE IF EXISTS workflow.transition_def CASCADE")
    op.execute("DROP TABLE IF EXISTS workflow.state_def CASCADE")
    op.execute("DROP TRIGGER IF EXISTS trg_workflow_def__updated_at ON workflow.workflow_def")
    op.execute("DROP FUNCTION IF EXISTS workflow.set_updated_at()")
    op.execute("DROP TABLE IF EXISTS workflow.workflow_def CASCADE")
    op.execute("DROP SCHEMA IF EXISTS workflow")
