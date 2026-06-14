"""Add module catalog and app module installation state.

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-14 02:10:00.000000
"""
from collections.abc import Sequence
import json

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


MODULES = [
    ("enterprise", "Enterprise", "Base company directories", "Base", "building", "#4C6EF5", True, []),
    ("warehouse", "Warehouse", "Products, warehouses, balances and stock operations", "Operations", "package", "#8B5CF6", False, ["enterprise"]),
    ("production", "Production", "Production orders, BOM and operations", "Operations", "settings", "#64748B", False, ["enterprise", "warehouse"]),
    ("orders", "Orders and shipments", "Customer orders, lines and shipments", "Operations", "truck", "#06B6D4", False, ["enterprise", "warehouse"]),
    ("finance", "Finance", "Budgets, payment documents and transactions", "Finance", "coins", "#059669", False, ["enterprise"]),
    ("contracts", "Contracts", "Contracts, attachments and execution stages", "Finance", "file-text", "#DC2626", False, ["enterprise"]),
    ("hr", "HR", "Candidates, hiring, reviews, training and vacations", "HR", "users", "#DB2777", False, ["enterprise"]),
    ("projects", "Tasks and projects", "Projects, tasks, milestones and resources", "Productivity", "check-square", "#10B981", False, ["enterprise"]),
    ("analytics", "Analytics", "KPI, dashboards and reports", "Analytics", "bar-chart", "#0EA5E9", False, []),
    ("documents", "Document flow", "Documents and filing nomenclature", "Documents", "file", "#7C3AED", False, ["enterprise"]),
    ("it_support", "IT support", "Tickets, equipment, SLA and incidents", "IT", "wrench", "#EA580C", False, ["enterprise"]),
]


def _manifest(code: str) -> dict:
    manifests = {
        "enterprise": {"entities": [["departments", "Departments", [["name", "Name", "text"], ["parent", "Parent", "text"]]], ["employees", "Employees", [["full_name", "Full name", "text"], ["email", "Email", "email"], ["department", "Department", "text"]]], ["positions", "Positions", [["name", "Name", "text"], ["level", "Level", "number"]]], ["counterparties", "Counterparties", [["name", "Name", "text"], ["tax_id", "Tax ID", "text"], ["type", "Type", "select"]]]], "pages": [["enterprise", "Enterprise", "table"]]},
        "warehouse": {"entities": [["products", "Products", [["name", "Name", "text"], ["sku", "SKU", "text"], ["unit", "Unit", "text"]]], ["warehouses", "Warehouses", [["name", "Name", "text"], ["location", "Location", "text"]]], ["stock_balances", "Stock balances", [["product", "Product", "text"], ["warehouse", "Warehouse", "text"], ["quantity", "Quantity", "number"]]], ["stock_operations", "Stock operations", [["operation_type", "Type", "select"], ["product", "Product", "text"], ["quantity", "Quantity", "number"]]]], "pages": [["warehouse", "Warehouse", "table"]]},
        "production": {"entities": [["production_orders", "Production orders", [["number", "Number", "text"], ["status", "Status", "select"], ["due_date", "Due date", "date"]]], ["bom", "BOM", [["product", "Product", "text"], ["component", "Component", "text"], ["quantity", "Quantity", "number"]]], ["production_operations", "Production operations", [["name", "Name", "text"], ["work_center", "Work center", "text"], ["duration", "Duration", "number"]]]], "pages": [["production", "Production", "table"]]},
        "orders": {"entities": [["customer_orders", "Customer orders", [["number", "Number", "text"], ["customer", "Customer", "text"], ["status", "Status", "select"]]], ["order_items", "Order items", [["order", "Order", "text"], ["product", "Product", "text"], ["quantity", "Quantity", "number"]]], ["shipments", "Shipments", [["number", "Number", "text"], ["order", "Order", "text"], ["shipped_at", "Shipped at", "datetime"]]]], "pages": [["orders", "Orders", "table"]]},
        "finance": {"entities": [["budget_items", "Budget items", [["name", "Name", "text"], ["code", "Code", "text"]]], ["payment_documents", "Payment documents", [["number", "Number", "text"], ["amount", "Amount", "decimal"], ["status", "Status", "select"]]], ["transactions", "Transactions", [["amount", "Amount", "decimal"], ["counterparty", "Counterparty", "text"], ["posted_at", "Posted at", "datetime"]]], ["budgets", "Budgets", [["name", "Name", "text"], ["period", "Period", "text"], ["amount", "Amount", "decimal"]]]], "pages": [["finance", "Finance", "table"]]},
        "contracts": {"entities": [["contracts", "Contracts", [["number", "Number", "text"], ["counterparty", "Counterparty", "text"], ["status", "Status", "select"]]], ["contract_attachments", "Contract attachments", [["contract", "Contract", "text"], ["name", "Name", "text"], ["file", "File", "file"]]], ["contract_stages", "Contract stages", [["contract", "Contract", "text"], ["stage", "Stage", "text"], ["due_date", "Due date", "date"]]]], "pages": [["contracts", "Contracts", "table"]]},
        "hr": {"entities": [["candidates", "Candidates", [["full_name", "Full name", "text"], ["email", "Email", "email"], ["status", "Status", "select"]]], ["hiring_requests", "Hiring requests", [["position", "Position", "text"], ["department", "Department", "text"], ["status", "Status", "select"]]], ["reviews", "Reviews", [["employee", "Employee", "text"], ["score", "Score", "number"], ["period", "Period", "text"]]], ["training", "Training", [["name", "Name", "text"], ["employee", "Employee", "text"], ["completed", "Completed", "boolean"]]], ["vacations", "Vacations", [["employee", "Employee", "text"], ["start_date", "Start date", "date"], ["end_date", "End date", "date"]]]], "pages": [["hr", "HR", "table"]]},
        "projects": {"entities": [["projects", "Projects", [["name", "Name", "text"], ["status", "Status", "select"], ["owner", "Owner", "text"]]], ["tasks", "Tasks", [["title", "Title", "text"], ["status", "Status", "select"], ["assignee", "Assignee", "text"]]], ["milestones", "Milestones", [["name", "Name", "text"], ["due_date", "Due date", "date"]]], ["resources", "Resources", [["name", "Name", "text"], ["capacity", "Capacity", "number"]]]], "pages": [["projects", "Projects", "kanban"]]},
        "analytics": {"entities": [["kpis", "KPIs", [["name", "Name", "text"], ["value", "Value", "decimal"], ["target", "Target", "decimal"]]], ["dashboards", "Dashboards", [["name", "Name", "text"], ["owner", "Owner", "text"]]], ["reports", "Reports", [["name", "Name", "text"], ["source", "Source", "text"]]]], "pages": [["analytics", "Analytics", "dashboard"]]},
        "documents": {"entities": [["documents", "Documents", [["number", "Registration number", "autonumber"], ["title", "Title", "text"], ["kind", "Kind", "select"], ["case_code", "Filing case", "text"], ["counterparty", "Counterparty", "text"], ["author", "Author", "text"], ["status", "Status", "select"], ["registered_at", "Registered at", "datetime"], ["retention_until", "Retention until", "date"]]], ["filing_cases", "Filing cases", [["code", "Case code", "text"], ["index", "Nomenclature index", "text"], ["title", "Title", "text"], ["category", "Category", "select"], ["owner_department", "Owner department", "text"], ["retention_years", "Retention years", "number"], ["opened_at", "Opened at", "date"], ["closed_at", "Closed at", "date"], ["export_ready", "Ready for export", "boolean"]]]], "sequences": [["documents", "number", {"prefix": "DOC-", "padding": 6, "start": 1}]], "pages": [["documents", "Documents", "table"]]},
        "it_support": {"entities": [["tickets", "Tickets", [["title", "Title", "text"], ["priority", "Priority", "select"], ["status", "Status", "select"]]], ["equipment", "Equipment", [["name", "Name", "text"], ["serial", "Serial", "text"], ["owner", "Owner", "text"]]], ["incidents", "Incidents", [["title", "Title", "text"], ["severity", "Severity", "select"], ["resolved", "Resolved", "boolean"]]], ["sla_policies", "SLA policies", [["name", "Name", "text"], ["response_minutes", "Response minutes", "number"]]]], "pages": [["it-support", "IT support", "kanban"]]},
    }
    return manifests[code]


def upgrade() -> None:
    op.create_table(
        "module",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("category", sa.String(64)),
        sa.Column("icon", sa.String(64)),
        sa.Column("color", sa.String(32)),
        sa.Column("is_base", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="catalog",
    )
    op.create_index("ix_catalog_module_code", "module", ["code"], schema="catalog")

    op.create_table(
        "module_version",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("module_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("catalog.module.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("manifest", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("changelog", sa.Text),
        sa.Column("is_current", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("module_id", "version", name="uq_module_version"),
        schema="catalog",
    )
    op.create_index("ix_catalog_module_version_module", "module_version", ["module_id"], schema="catalog")
    op.create_index("ix_catalog_module_version_current", "module_version", ["module_id"], schema="catalog", postgresql_where=sa.text("is_current = true"))

    op.create_table(
        "module_dependency",
        sa.Column("module_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("catalog.module.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("depends_on_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("catalog.module.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("min_version", sa.String(32)),
        schema="catalog",
    )

    op.create_table(
        "app_module",
        sa.Column("app_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("catalog.app.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("module_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("catalog.module.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("module_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("catalog.module_version.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="'installed'"),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("installed_by", postgresql.UUID(as_uuid=True)),
        sa.UniqueConstraint("app_id", "module_id", name="uq_app_module"),
        schema="catalog",
    )
    op.create_index("ix_catalog_app_module_app", "app_module", ["app_id"], schema="catalog")

    module_ids: dict[str, str] = {}
    conn = op.get_bind()
    for code, name, description, category, icon, color, is_base, _deps in MODULES:
        module_id = conn.execute(
            sa.text(
                """
                INSERT INTO catalog.module (code, name, description, category, icon, color, is_base)
                VALUES (:code, :name, :description, :category, :icon, :color, :is_base)
                RETURNING id
                """
            ),
            {"code": code, "name": name, "description": description, "category": category, "icon": icon, "color": color, "is_base": is_base},
        ).scalar_one()
        version_id = conn.execute(
            sa.text(
                """
                INSERT INTO catalog.module_version (module_id, version, manifest, changelog, is_current)
                VALUES (:module_id, '1.0.0', CAST(:manifest AS jsonb), 'Initial module manifest', true)
                RETURNING id
                """
            ),
            {"module_id": module_id, "manifest": json.dumps(_manifest(code))},
        ).scalar_one()
        module_ids[code] = str(module_id)

    for code, *_rest, deps in MODULES:
        for dep_code in deps:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO catalog.module_dependency (module_id, depends_on_id, min_version)
                    VALUES (:module_id, :depends_on_id, '1.0.0')
                    """
                ),
                {"module_id": module_ids[code], "depends_on_id": module_ids[dep_code]},
            )


def downgrade() -> None:
    op.drop_table("app_module", schema="catalog")
    op.drop_table("module_dependency", schema="catalog")
    op.drop_table("module_version", schema="catalog")
    op.drop_table("module", schema="catalog")
