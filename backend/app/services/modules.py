import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import App, AppMember, AppModule, Module, ModuleDependency, ModuleVersion
from app.models.data import Sequence
from app.models.metamodel import Entity, Field
from app.models.ui import Page
from app.schemas.modules import AppModuleRead, ModuleConflict, ModuleInstallResult, ModuleRead


class ModuleNotFoundError(Exception):
    pass


class ModulePermissionError(Exception):
    pass


MODULE_MANIFESTS: dict[str, dict[str, Any]] = {
    "enterprise": {
        "entities": [
            ("departments", "Отделы", [("name", "Название", "text"), ("parent", "Родительский отдел", "text")]),
            ("employees", "Сотрудники", [("full_name", "ФИО", "text"), ("email", "Email", "email"), ("department", "Отдел", "text")]),
            ("positions", "Должности", [("name", "Название", "text"), ("level", "Уровень", "number")]),
            ("counterparties", "Контрагенты", [("name", "Название", "text"), ("tax_id", "ИНН", "text"), ("type", "Тип", "select")]),
        ],
        "pages": [("enterprise", "Предприятие", "table")],
    },
    "warehouse": {
        "dependencies": ["enterprise"],
        "entities": [
            ("products", "Товары", [("name", "Название", "text"), ("sku", "Артикул", "text"), ("unit", "Единица измерения", "text")]),
            ("warehouses", "Склады", [("name", "Название", "text"), ("location", "Местоположение", "text")]),
            ("stock_balances", "Остатки", [("product", "Товар", "text"), ("warehouse", "Склад", "text"), ("quantity", "Количество", "number")]),
            ("stock_operations", "Складские операции", [("operation_type", "Тип операции", "select"), ("product", "Товар", "text"), ("quantity", "Количество", "number")]),
        ],
        "pages": [("warehouse", "Склад", "table")],
    },
    "production": {
        "dependencies": ["enterprise", "warehouse"],
        "entities": [
            ("production_orders", "Производственные заказы", [("number", "Номер", "text"), ("status", "Статус", "select"), ("due_date", "Срок", "date")]),
            ("bom", "Спецификации (BOM)", [("product", "Продукт", "text"), ("component", "Компонент", "text"), ("quantity", "Количество", "number")]),
            ("production_operations", "Производственные операции", [("name", "Название", "text"), ("work_center", "Рабочий центр", "text"), ("duration", "Длительность", "number")]),
        ],
        "pages": [("production", "Производство", "table")],
    },
    "orders": {
        "dependencies": ["enterprise", "warehouse"],
        "entities": [
            ("customer_orders", "Заказы клиентов", [("number", "Номер", "text"), ("customer", "Клиент", "text"), ("status", "Статус", "select")]),
            ("order_items", "Позиции заказа", [("order", "Заказ", "text"), ("product", "Товар", "text"), ("quantity", "Количество", "number")]),
            ("shipments", "Отгрузки", [("number", "Номер", "text"), ("order", "Заказ", "text"), ("shipped_at", "Дата отгрузки", "datetime")]),
        ],
        "pages": [("orders", "Заказы", "table")],
    },
    "finance": {
        "dependencies": ["enterprise"],
        "entities": [
            ("budget_items", "Статьи бюджета", [("name", "Название", "text"), ("code", "Код", "text")]),
            ("payment_documents", "Платёжные документы", [("number", "Номер", "text"), ("amount", "Сумма", "decimal"), ("status", "Статус", "select")]),
            ("transactions", "Транзакции", [("amount", "Сумма", "decimal"), ("counterparty", "Контрагент", "text"), ("posted_at", "Дата проводки", "datetime")]),
            ("budgets", "Бюджеты", [("name", "Название", "text"), ("period", "Период", "text"), ("amount", "Сумма", "decimal")]),
        ],
        "pages": [("finance", "Финансы", "table")],
    },
    "contracts": {
        "dependencies": ["enterprise"],
        "entities": [
            ("contracts", "Договоры", [("number", "Номер", "text"), ("counterparty", "Контрагент", "text"), ("status", "Статус", "select")]),
            ("contract_attachments", "Вложения договоров", [("contract", "Договор", "text"), ("name", "Название", "text"), ("file", "Файл", "file")]),
            ("contract_stages", "Этапы договоров", [("contract", "Договор", "text"), ("stage", "Этап", "text"), ("due_date", "Срок", "date")]),
        ],
        "pages": [("contracts", "Договоры", "table")],
    },
    "hr": {
        "dependencies": ["enterprise"],
        "entities": [
            ("candidates", "Кандидаты", [("full_name", "ФИО", "text"), ("email", "Email", "email"), ("status", "Статус", "select")]),
            ("hiring_requests", "Заявки на найм", [("position", "Должность", "text"), ("department", "Отдел", "text"), ("status", "Статус", "select")]),
            ("reviews", "Оценки", [("employee", "Сотрудник", "text"), ("score", "Оценка", "number"), ("period", "Период", "text")]),
            ("training", "Обучение", [("name", "Название", "text"), ("employee", "Сотрудник", "text"), ("completed", "Завершено", "boolean")]),
            ("vacations", "Отпуска", [("employee", "Сотрудник", "text"), ("start_date", "Дата начала", "date"), ("end_date", "Дата окончания", "date")]),
        ],
        "pages": [("hr", "HR", "table")],
    },
    "projects": {
        "dependencies": ["enterprise"],
        "entities": [
            ("projects", "Проекты", [("name", "Название", "text"), ("status", "Статус", "select"), ("owner", "Владелец", "text")]),
            ("tasks", "Задачи", [("title", "Заголовок", "text"), ("status", "Статус", "select"), ("assignee", "Исполнитель", "text")]),
            ("milestones", "Вехи", [("name", "Название", "text"), ("due_date", "Срок", "date")]),
            ("resources", "Ресурсы", [("name", "Название", "text"), ("capacity", "Мощность", "number")]),
        ],
        "pages": [("projects", "Проекты", "kanban")],
    },
    "analytics": {
        "entities": [
            ("kpis", "KPI", [("name", "Название", "text"), ("value", "Значение", "decimal"), ("target", "Цель", "decimal")]),
            ("dashboards", "Дашборды", [("name", "Название", "text"), ("owner", "Владелец", "text")]),
            ("reports", "Отчёты", [("name", "Название", "text"), ("source", "Источник", "text")]),
        ],
        "pages": [("analytics", "Аналитика", "dashboard")],
    },
    "documents": {
        "dependencies": ["enterprise"],
        "entities": [
            (
                "documents",
                "Документы",
                [
                    ("number", "Регистрационный номер", "autonumber"),
                    ("title", "Заголовок", "text"),
                    ("kind", "Вид", "select"),
                    ("case_code", "Дело", "text"),
                    ("counterparty", "Контрагент", "text"),
                    ("author", "Автор", "text"),
                    ("status", "Статус", "select"),
                    ("registered_at", "Дата регистрации", "datetime"),
                    ("retention_until", "Хранить до", "date"),
                ],
            ),
            (
                "filing_cases",
                "Дела",
                [
                    ("code", "Код дела", "text"),
                    ("index", "Индекс номенклатуры", "text"),
                    ("title", "Заголовок", "text"),
                    ("category", "Категория", "select"),
                    ("owner_department", "Отдел-владелец", "text"),
                    ("retention_years", "Срок хранения (лет)", "number"),
                    ("opened_at", "Дата открытия", "date"),
                    ("closed_at", "Дата закрытия", "date"),
                    ("export_ready", "Готово к архивации", "boolean"),
                ],
            ),
        ],
        "sequences": [
            ("documents", "number", {"prefix": "DOC-", "padding": 6, "start": 1}),
        ],
        "pages": [("documents", "Документы", "table")],
    },
    "it_support": {
        "dependencies": ["enterprise"],
        "entities": [
            ("tickets", "Заявки", [("title", "Заголовок", "text"), ("priority", "Приоритет", "select"), ("status", "Статус", "select")]),
            ("equipment", "Оборудование", [("name", "Название", "text"), ("serial", "Серийный номер", "text"), ("owner", "Владелец", "text")]),
            ("incidents", "Инциденты", [("title", "Заголовок", "text"), ("severity", "Серьёзность", "select"), ("resolved", "Решено", "boolean")]),
            ("sla_policies", "SLA-политики", [("name", "Название", "text"), ("response_minutes", "Время ответа (мин)", "number")]),
        ],
        "pages": [("it-support", "IT-поддержка", "kanban")],
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

        entities_created, fields_created, pages_created, conflicts = await self._apply_manifest(
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
            conflicts=conflicts,
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

    async def _build_entity_source_map(self, app_id: uuid.UUID) -> dict[str, str]:
        """Returns {entity_slug: module_code} for all entities owned by installed modules."""
        rows = (await self._db.execute(
            select(Module.code, ModuleVersion.manifest)
            .join(AppModule, AppModule.module_id == Module.id)
            .join(ModuleVersion, ModuleVersion.id == AppModule.module_version_id)
            .where(AppModule.app_id == app_id, AppModule.status == "installed")
        )).all()
        source_map: dict[str, str] = {}
        for code, manifest in rows:
            for ent in manifest.get("entities", []):
                source_map[ent[0]] = code
        return source_map

    async def _build_page_source_map(self, app_id: uuid.UUID) -> dict[str, str]:
        """Returns {page_slug: module_code} for all pages owned by installed modules."""
        rows = (await self._db.execute(
            select(Module.code, ModuleVersion.manifest)
            .join(AppModule, AppModule.module_id == Module.id)
            .join(ModuleVersion, ModuleVersion.id == AppModule.module_version_id)
            .where(AppModule.app_id == app_id, AppModule.status == "installed")
        )).all()
        source_map: dict[str, str] = {}
        for code, manifest in rows:
            for pg in manifest.get("pages", []):
                source_map[pg[0]] = code
        return source_map

    async def _apply_manifest(
        self, app_id: uuid.UUID, manifest: dict[str, Any]
    ) -> tuple[int, int, int, list[ModuleConflict]]:
        entity_source = await self._build_entity_source_map(app_id)
        page_source = await self._build_page_source_map(app_id)
        conflicts: list[ModuleConflict] = []
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
            else:
                conflicts.append(ModuleConflict(
                    kind="entity",
                    name=slug,
                    source=entity_source.get(slug, "manual"),
                    action="reused",
                ))
            entity_ids[slug] = entity.id

            existing_fields = {
                f.name
                for f in (await self._db.execute(select(Field).where(Field.entity_id == entity.id))).scalars()
            }
            for order, (name, field_display, field_type) in enumerate(fields):
                if name in existing_fields:
                    conflicts.append(ModuleConflict(
                        kind="field",
                        name=name,
                        entity=slug,
                        source=entity_source.get(slug, "manual"),
                        action="skipped",
                    ))
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
                conflicts.append(ModuleConflict(
                    kind="page",
                    name=slug,
                    source=page_source.get(slug, "manual"),
                    action="skipped",
                ))
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

        return entities_created, fields_created, pages_created, conflicts

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
