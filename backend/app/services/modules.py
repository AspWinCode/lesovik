import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import App, AppMember, AppModule, Module, ModuleDependency, ModuleVersion
from app.models.data import Sequence
from app.models.metamodel import Entity, Field
from app.models.ui import Page
from app.schemas.modules import AppModuleRead, ModuleInstallResult, ModuleRead


class ModuleNotFoundError(Exception):
    pass


class ModulePermissionError(Exception):
    pass


MODULE_MANIFESTS: dict[str, dict[str, Any]] = {
    "enterprise": {
        "entities": [
            ("departments", "Departments", [("name", "Name", "text"), ("parent", "Parent", "text")]),
            ("employees", "Employees", [("full_name", "Full name", "text"), ("email", "Email", "email"), ("department", "Department", "text")]),
            ("positions", "Positions", [("name", "Name", "text"), ("level", "Level", "number")]),
            ("counterparties", "Counterparties", [("name", "Name", "text"), ("tax_id", "Tax ID", "text"), ("type", "Type", "select")]),
        ],
        "pages": [("enterprise", "Enterprise", "table")],
    },
    "warehouse": {
        "dependencies": ["enterprise"],
        "entities": [
            ("products", "Products", [("name", "Name", "text"), ("sku", "SKU", "text"), ("unit", "Unit", "text")]),
            ("warehouses", "Warehouses", [("name", "Name", "text"), ("location", "Location", "text")]),
            ("stock_balances", "Stock balances", [("product", "Product", "text"), ("warehouse", "Warehouse", "text"), ("quantity", "Quantity", "number")]),
            ("stock_operations", "Stock operations", [("operation_type", "Type", "select"), ("product", "Product", "text"), ("quantity", "Quantity", "number")]),
        ],
        "pages": [("warehouse", "Warehouse", "table")],
    },
    "production": {
        "dependencies": ["enterprise", "warehouse"],
        "entities": [
            ("production_orders", "Production orders", [("number", "Number", "text"), ("status", "Status", "select"), ("due_date", "Due date", "date")]),
            ("bom", "BOM", [("product", "Product", "text"), ("component", "Component", "text"), ("quantity", "Quantity", "number")]),
            ("production_operations", "Production operations", [("name", "Name", "text"), ("work_center", "Work center", "text"), ("duration", "Duration", "number")]),
        ],
        "pages": [("production", "Production", "table")],
    },
    "orders": {
        "dependencies": ["enterprise", "warehouse"],
        "entities": [
            ("customer_orders", "Customer orders", [("number", "Number", "text"), ("customer", "Customer", "text"), ("status", "Status", "select")]),
            ("order_items", "Order items", [("order", "Order", "text"), ("product", "Product", "text"), ("quantity", "Quantity", "number")]),
            ("shipments", "Shipments", [("number", "Number", "text"), ("order", "Order", "text"), ("shipped_at", "Shipped at", "datetime")]),
        ],
        "pages": [("orders", "Orders", "table")],
    },
    "finance": {
        "dependencies": ["enterprise"],
        "entities": [
            ("budget_items", "Budget items", [("name", "Name", "text"), ("code", "Code", "text")]),
            ("payment_documents", "Payment documents", [("number", "Number", "text"), ("amount", "Amount", "decimal"), ("status", "Status", "select")]),
            ("transactions", "Transactions", [("amount", "Amount", "decimal"), ("counterparty", "Counterparty", "text"), ("posted_at", "Posted at", "datetime")]),
            ("budgets", "Budgets", [("name", "Name", "text"), ("period", "Period", "text"), ("amount", "Amount", "decimal")]),
        ],
        "pages": [("finance", "Finance", "table")],
    },
    "contracts": {
        "dependencies": ["enterprise"],
        "entities": [
            ("contracts", "Contracts", [("number", "Number", "text"), ("counterparty", "Counterparty", "text"), ("status", "Status", "select")]),
            ("contract_attachments", "Contract attachments", [("contract", "Contract", "text"), ("name", "Name", "text"), ("file", "File", "file")]),
            ("contract_stages", "Contract stages", [("contract", "Contract", "text"), ("stage", "Stage", "text"), ("due_date", "Due date", "date")]),
        ],
        "pages": [("contracts", "Contracts", "table")],
    },
    "hr": {
        "dependencies": ["enterprise"],
        "entities": [
            ("candidates", "Candidates", [("full_name", "Full name", "text"), ("email", "Email", "email"), ("status", "Status", "select")]),
            ("hiring_requests", "Hiring requests", [("position", "Position", "text"), ("department", "Department", "text"), ("status", "Status", "select")]),
            ("reviews", "Reviews", [("employee", "Employee", "text"), ("score", "Score", "number"), ("period", "Period", "text")]),
            ("training", "Training", [("name", "Name", "text"), ("employee", "Employee", "text"), ("completed", "Completed", "boolean")]),
            ("vacations", "Vacations", [("employee", "Employee", "text"), ("start_date", "Start date", "date"), ("end_date", "End date", "date")]),
        ],
        "pages": [("hr", "HR", "table")],
    },
    "projects": {
        "dependencies": ["enterprise"],
        "entities": [
            ("projects", "Projects", [("name", "Name", "text"), ("status", "Status", "select"), ("owner", "Owner", "text")]),
            ("tasks", "Tasks", [("title", "Title", "text"), ("status", "Status", "select"), ("assignee", "Assignee", "text")]),
            ("milestones", "Milestones", [("name", "Name", "text"), ("due_date", "Due date", "date")]),
            ("resources", "Resources", [("name", "Name", "text"), ("capacity", "Capacity", "number")]),
        ],
        "pages": [("projects", "Projects", "kanban")],
    },
    "analytics": {
        "entities": [
            ("kpis", "KPIs", [("name", "Name", "text"), ("value", "Value", "decimal"), ("target", "Target", "decimal")]),
            ("dashboards", "Dashboards", [("name", "Name", "text"), ("owner", "Owner", "text")]),
            ("reports", "Reports", [("name", "Name", "text"), ("source", "Source", "text")]),
        ],
        "pages": [("analytics", "Analytics", "dashboard")],
    },
    "documents": {
        "dependencies": ["enterprise"],
        "entities": [
            (
                "documents",
                "Documents",
                [
                    ("number", "Registration number", "autonumber"),
                    ("title", "Title", "text"),
                    ("kind", "Kind", "select"),
                    ("case_code", "Filing case", "text"),
                    ("counterparty", "Counterparty", "text"),
                    ("author", "Author", "text"),
                    ("status", "Status", "select"),
                    ("registered_at", "Registered at", "datetime"),
                    ("retention_until", "Retention until", "date"),
                ],
            ),
            (
                "filing_cases",
                "Filing cases",
                [
                    ("code", "Case code", "text"),
                    ("index", "Nomenclature index", "text"),
                    ("title", "Title", "text"),
                    ("category", "Category", "select"),
                    ("owner_department", "Owner department", "text"),
                    ("retention_years", "Retention years", "number"),
                    ("opened_at", "Opened at", "date"),
                    ("closed_at", "Closed at", "date"),
                    ("export_ready", "Ready for export", "boolean"),
                ],
            ),
        ],
        "sequences": [
            ("documents", "number", {"prefix": "DOC-", "padding": 6, "start": 1}),
        ],
        "pages": [("documents", "Documents", "table")],
    },
    "it_support": {
        "dependencies": ["enterprise"],
        "entities": [
            ("tickets", "Tickets", [("title", "Title", "text"), ("priority", "Priority", "select"), ("status", "Status", "select")]),
            ("equipment", "Equipment", [("name", "Name", "text"), ("serial", "Serial", "text"), ("owner", "Owner", "text")]),
            ("incidents", "Incidents", [("title", "Title", "text"), ("severity", "Severity", "select"), ("resolved", "Resolved", "boolean")]),
            ("sla_policies", "SLA policies", [("name", "Name", "text"), ("response_minutes", "Response minutes", "number")]),
        ],
        "pages": [("it-support", "IT support", "kanban")],
    },
}


class ModuleService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_modules(self, app_id: uuid.UUID | None = None) -> list[ModuleRead]:
        modules = (await self._db.execute(select(Module).where(Module.is_active.is_(True)).order_by(Module.name))).scalars().all()
        installed: dict[uuid.UUID, str] = {}
        if app_id:
            rows = (await self._db.execute(
                select(AppModule, ModuleVersion)
                .join(ModuleVersion, ModuleVersion.id == AppModule.module_version_id)
                .where(AppModule.app_id == app_id, AppModule.status == "installed")
            )).all()
            installed = {row[0].module_id: row[1].version for row in rows}

        result: list[ModuleRead] = []
        for module in modules:
            current = await self._current_version(module.id)
            deps = await self._dependency_codes(module.id)
            result.append(
                self._module_read(
                    module,
                    current_version=current.version if current else None,
                    dependencies=deps,
                    installed=module.id in installed,
                    installed_version=installed.get(module.id),
                )
            )
        return result

    async def list_app_modules(self, app_id: uuid.UUID) -> list[AppModuleRead]:
        rows = (await self._db.execute(
            select(AppModule, Module, ModuleVersion)
            .join(Module, Module.id == AppModule.module_id)
            .join(ModuleVersion, ModuleVersion.id == AppModule.module_version_id)
            .where(AppModule.app_id == app_id, AppModule.status == "installed")
            .order_by(Module.name)
        )).all()
        return [
            AppModuleRead(
                app_id=row[0].app_id,
                module_id=row[1].id,
                module_code=row[1].code,
                module_name=row[1].name,
                version=row[2].version,
                status=row[0].status,
                installed_at=row[0].installed_at,
                installed_by=row[0].installed_by,
            )
            for row in rows
        ]

    async def install_module(
        self,
        app_id: uuid.UUID,
        module_code: str,
        actor_id: uuid.UUID,
        is_admin: bool,
        _seen: set[str] | None = None,
    ) -> ModuleInstallResult:
        await self._require_app_role(app_id, actor_id, is_admin)
        module = await self._module_by_code(module_code)
        version = await self._current_version(module.id)
        if version is None:
            raise ModuleNotFoundError(f"No current version for module {module_code}")

        seen = _seen or set()
        if module.code in seen:
            return ModuleInstallResult(module=(await self._read_module(module, app_id)))
        seen.add(module.code)

        installed_dependencies: list[str] = []
        for dep_code in await self._dependency_codes(module.id):
            dep_result = await self.install_module(app_id, dep_code, actor_id, is_admin, seen)
            installed_dependencies.append(dep_result.module.code)
            installed_dependencies.extend(dep_result.installed_dependencies)

        entities_created, fields_created, pages_created = await self._apply_manifest(
            app_id, version.manifest
        )
        row = await self._app_module(app_id, module.id)
        if row is None:
            self._db.add(
                AppModule(
                    app_id=app_id,
                    module_id=module.id,
                    module_version_id=version.id,
                    installed_by=actor_id,
                )
            )
        else:
            row.module_version_id = version.id
            row.status = "installed"
            row.installed_by = actor_id

        await self._db.flush()
        return ModuleInstallResult(
            module=await self._read_module(module, app_id),
            installed_dependencies=sorted(set(installed_dependencies)),
            entities_created=entities_created,
            fields_created=fields_created,
            pages_created=pages_created,
        )

    async def uninstall_module(
        self, app_id: uuid.UUID, module_code: str, actor_id: uuid.UUID, is_admin: bool
    ) -> None:
        await self._require_app_role(app_id, actor_id, is_admin)
        module = await self._module_by_code(module_code)
        row = await self._app_module(app_id, module.id)
        if row is not None:
            row.status = "removed"
            await self._db.flush()

    async def _apply_manifest(self, app_id: uuid.UUID, manifest: dict[str, Any]) -> tuple[int, int, int]:
        entities_created = 0
        fields_created = 0
        pages_created = 0
        entity_ids: dict[str, uuid.UUID] = {}

        for ent in manifest.get("entities", []):
            slug, display_name, fields = ent
            entity = (await self._db.execute(
                select(Entity).where(Entity.app_id == app_id, Entity.slug == slug)
            )).scalar_one_or_none()
            if entity is None:
                entity = Entity(app_id=app_id, slug=slug, display_name=display_name)
                self._db.add(entity)
                await self._db.flush()
                entities_created += 1
            entity_ids[slug] = entity.id

            existing_fields = {
                f.name
                for f in (await self._db.execute(select(Field).where(Field.entity_id == entity.id))).scalars()
            }
            for order, (name, field_display, field_type) in enumerate(fields):
                if name in existing_fields:
                    continue
                self._db.add(
                    Field(
                        entity_id=entity.id,
                        app_id=app_id,
                        name=name,
                        display_name=field_display,
                        field_type=field_type,
                        display_order=order,
                    )
                )
                fields_created += 1

        for entity_slug, field_name, options in manifest.get("sequences", []):
            entity_id = entity_ids.get(entity_slug)
            if entity_id is None:
                continue
            existing_sequence = (await self._db.execute(
                select(Sequence).where(
                    Sequence.entity_id == entity_id,
                    Sequence.field_name == field_name,
                )
            )).scalar_one_or_none()
            if existing_sequence is not None:
                continue
            self._db.add(
                Sequence(
                    app_id=app_id,
                    entity_id=entity_id,
                    field_name=field_name,
                    prefix=options.get("prefix", ""),
                    suffix=options.get("suffix", ""),
                    padding=options.get("padding", 0),
                    step=options.get("step", 1),
                    next_value=options.get("start", 1),
                    reset_on=options.get("reset_on"),
                )
            )

        first_entity_id = next(iter(entity_ids.values()), None)
        for slug, title, view_type in manifest.get("pages", []):
            exists = (await self._db.execute(
                select(Page).where(Page.app_id == app_id, Page.slug == slug)
            )).scalar_one_or_none()
            if exists is not None:
                continue
            self._db.add(
                Page(
                    app_id=app_id,
                    slug=slug,
                    title=title,
                    layout={"view_type": view_type, "entity_id": str(first_entity_id) if first_entity_id else None},
                    blocks=[{"id": f"{slug}-main", "type": view_type, "title": title, "config": {}}],
                    is_published=True,
                )
            )
            pages_created += 1

        return entities_created, fields_created, pages_created

    async def _read_module(self, module: Module, app_id: uuid.UUID | None) -> ModuleRead:
        current = await self._current_version(module.id)
        installed_version = None
        if app_id:
            row = await self._app_module(app_id, module.id)
            if row and row.status == "installed":
                ver = (await self._db.execute(
                    select(ModuleVersion).where(ModuleVersion.id == row.module_version_id)
                )).scalar_one()
                installed_version = ver.version
        return self._module_read(
            module,
            current_version=current.version if current else None,
            dependencies=await self._dependency_codes(module.id),
            installed=installed_version is not None,
            installed_version=installed_version,
        )

    def _module_read(
        self,
        module: Module,
        current_version: str | None,
        dependencies: list[str],
        installed: bool,
        installed_version: str | None,
    ) -> ModuleRead:
        return ModuleRead(
            id=module.id,
            code=module.code,
            name=module.name,
            description=module.description,
            category=module.category,
            icon=module.icon,
            color=module.color,
            is_base=module.is_base,
            is_active=module.is_active,
            current_version=current_version,
            dependencies=dependencies,
            installed=installed,
            installed_version=installed_version,
            created_at=module.created_at,
        )

    async def _module_by_code(self, code: str) -> Module:
        module = (await self._db.execute(select(Module).where(Module.code == code))).scalar_one_or_none()
        if module is None:
            raise ModuleNotFoundError(code)
        return module

    async def _current_version(self, module_id: uuid.UUID) -> ModuleVersion | None:
        return (await self._db.execute(
            select(ModuleVersion).where(
                ModuleVersion.module_id == module_id,
                ModuleVersion.is_current.is_(True),
            )
        )).scalar_one_or_none()

    async def _dependency_codes(self, module_id: uuid.UUID) -> list[str]:
        rows = (await self._db.execute(
            select(Module.code)
            .join(ModuleDependency, ModuleDependency.depends_on_id == Module.id)
            .where(ModuleDependency.module_id == module_id)
            .order_by(Module.code)
        )).scalars().all()
        return list(rows)

    async def _app_module(self, app_id: uuid.UUID, module_id: uuid.UUID) -> AppModule | None:
        return (await self._db.execute(
            select(AppModule).where(AppModule.app_id == app_id, AppModule.module_id == module_id)
        )).scalar_one_or_none()

    async def _require_app_role(self, app_id: uuid.UUID, actor_id: uuid.UUID, is_admin: bool) -> None:
        app_exists = (await self._db.execute(select(App.id).where(App.id == app_id))).scalar_one_or_none()
        if app_exists is None:
            raise ModuleNotFoundError("app")
        if is_admin:
            return
        member = (await self._db.execute(
            select(AppMember).where(AppMember.app_id == app_id, AppMember.user_id == actor_id)
        )).scalar_one_or_none()
        if member is None or member.role not in {"owner", "admin", "editor"}:
            raise ModulePermissionError("Insufficient app permissions")
