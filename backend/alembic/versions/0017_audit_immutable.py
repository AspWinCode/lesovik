"""Make identity.audit_log immutable via DB trigger

Revision ID: 0017
Revises: 0016
Create Date: 2025-01-17 00:00:00.000000
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Trigger function that blocks any modification or deletion
    op.execute("""
        CREATE OR REPLACE FUNCTION identity.audit_log_immutable()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION
                'audit_log is immutable — records cannot be modified or deleted (row id: %)', OLD.id
                USING ERRCODE = '55000';
        END;
        $$;
    """)

    op.execute("""
        CREATE TRIGGER audit_log_no_update
            BEFORE UPDATE ON identity.audit_log
            FOR EACH ROW EXECUTE FUNCTION identity.audit_log_immutable();
    """)

    op.execute("""
        CREATE TRIGGER audit_log_no_delete
            BEFORE DELETE ON identity.audit_log
            FOR EACH ROW EXECUTE FUNCTION identity.audit_log_immutable();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_update ON identity.audit_log")
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_delete ON identity.audit_log")
    op.execute("DROP FUNCTION IF EXISTS identity.audit_log_immutable()")
