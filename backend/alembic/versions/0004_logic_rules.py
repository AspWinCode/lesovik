"""logic schema: rule + rule_execution_log (partitioned by month)

Revision ID: 0004
Revises: 0003
Create Date: 2025-01-04 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # logic.rule
    # ------------------------------------------------------------------ #
    op.create_table(
        "rule",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("app_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("trigger", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("conditions", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("actions", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("priority", sa.Integer, nullable=False, server_default="100"),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        schema="logic",
    )
    op.create_index("ix_logic_rule_app", "rule", ["app_id"], schema="logic")
    op.create_index("ix_logic_rule_entity", "rule", ["entity_id"], schema="logic")
    op.create_index(
        "ix_logic_rule_active",
        "rule",
        ["app_id", "entity_id", "priority"],
        schema="logic",
        postgresql_where=sa.text("is_active = true"),
    )
    # GIN indexes for trigger and conditions lookups
    op.execute(
        "CREATE INDEX ix_logic_rule_trigger_gin ON logic.rule USING GIN (trigger)"
    )
    op.execute(
        "CREATE INDEX ix_logic_rule_conditions_gin ON logic.rule USING GIN (conditions)"
    )

    # updated_at trigger
    op.execute("""
        CREATE OR REPLACE FUNCTION logic.set_updated_at()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER trg_rule__updated_at
            BEFORE UPDATE ON logic.rule
            FOR EACH ROW EXECUTE FUNCTION logic.set_updated_at()
    """)

    # ------------------------------------------------------------------ #
    # logic.rule_execution_log — partitioned by month
    # ------------------------------------------------------------------ #
    op.execute("""
        CREATE TABLE logic.rule_execution_log (
            id              UUID        NOT NULL DEFAULT gen_random_uuid(),
            rule_id         UUID        NOT NULL,
            record_id       UUID,
            entity_id       UUID        NOT NULL,
            app_id          UUID        NOT NULL,
            event           VARCHAR(64) NOT NULL,
            status          VARCHAR(32) NOT NULL,
            duration_ms     INT,
            error           TEXT,
            input_snapshot  JSONB,
            output_snapshot JSONB,
            executed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (id, executed_at)
        ) PARTITION BY RANGE (executed_at)
    """)

    # Initial partitions — 3 months (add more via scheduled job)
    for year, month in [(2025, 1), (2025, 2), (2025, 3), (2025, 4),
                         (2025, 5), (2025, 6), (2025, 7), (2025, 8),
                         (2025, 9), (2025, 10), (2025, 11), (2025, 12),
                         (2026, 1), (2026, 2), (2026, 3), (2026, 4),
                         (2026, 5), (2026, 6)]:
        next_year = year + (1 if month == 12 else 0)
        next_month = 1 if month == 12 else month + 1
        op.execute(f"""
            CREATE TABLE logic.rule_execution_log_{year}_{month:02d}
            PARTITION OF logic.rule_execution_log
            FOR VALUES FROM ('{year}-{month:02d}-01') TO ('{next_year}-{next_month:02d}-01')
        """)

    op.execute(
        "CREATE INDEX ix_logic_log_rule ON logic.rule_execution_log (rule_id, executed_at DESC)"
    )
    op.execute(
        "CREATE INDEX ix_logic_log_app ON logic.rule_execution_log (app_id, executed_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS logic.rule_execution_log CASCADE")
    op.execute("DROP TRIGGER IF EXISTS trg_rule__updated_at ON logic.rule")
    op.execute("DROP FUNCTION IF EXISTS logic.set_updated_at()")
    op.drop_table("rule", schema="logic")
