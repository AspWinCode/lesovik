"""entity: formula_definition column, currency+signature field types, author+is_deleted system fields"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "field",
        sa.Column("formula_definition", JSONB, nullable=True),
        schema="metamodel",
    )


def downgrade() -> None:
    op.drop_column("field", "formula_definition", schema="metamodel")
