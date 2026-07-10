"""logic.rule: add rule_type column"""
from alembic import op
import sqlalchemy as sa

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rule",
        sa.Column("rule_type", sa.String(32), nullable=False, server_default="automation"),
        schema="logic",
    )
    op.create_index("ix_logic_rule_type", "rule", ["app_id", "entity_id", "rule_type"], schema="logic")


def downgrade() -> None:
    op.drop_index("ix_logic_rule_type", table_name="rule", schema="logic")
    op.drop_column("rule", "rule_type", schema="logic")
