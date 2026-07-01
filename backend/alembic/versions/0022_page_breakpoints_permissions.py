"""Add page breakpoints and page_role_permission table."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "page",
        sa.Column("breakpoints", JSONB, nullable=False, server_default="{}"),
        schema="ui",
    )

    op.create_table(
        "page_role_permission",
        sa.Column(
            "page_id",
            UUID(as_uuid=True),
            sa.ForeignKey("ui.page.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role_id", sa.String(128), primary_key=True),
        sa.Column("can_view", sa.Boolean, nullable=False, server_default="true"),
        schema="ui",
    )


def downgrade() -> None:
    op.drop_table("page_role_permission", schema="ui")
    op.drop_column("page", "breakpoints", schema="ui")
