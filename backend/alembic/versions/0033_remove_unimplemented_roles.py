"""Remove system roles that were seeded but never enforced anywhere
(data_editor, data_viewer, workflow_actor, api_client) — actual data
access is governed by app membership (owner/admin/editor/viewer) plus
ABAC rules, not these. Cascades to user_role/resource_permission/
abac_rule via existing FKs.

Revision ID: 0033
Revises: 0032
Create Date: 2026-08-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0033"
down_revision = "0032"
branch_labels = None
depends_on = None

_DEAD_ROLES = ("data_editor", "data_viewer", "workflow_actor", "api_client")


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text('DELETE FROM identity.role WHERE id = ANY(:ids)'),
        {"ids": list(_DEAD_ROLES)},
    )


def downgrade() -> None:
    conn = op.get_bind()
    names = {
        "data_editor": "Редактор данных",
        "data_viewer": "Читатель данных",
        "workflow_actor": "Участник процессов",
        "api_client": "API-клиент",
    }
    for role_id, display_name in names.items():
        conn.execute(
            sa.text(
                'INSERT INTO identity.role (id, display_name, is_system) '
                'VALUES (:id, :display_name, true) ON CONFLICT (id) DO NOTHING'
            ),
            {"id": role_id, "display_name": display_name},
        )
