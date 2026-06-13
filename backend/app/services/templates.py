"""TemplateService: scaffold a pre-built app (entities + pages) from a template definition."""
from __future__ import annotations

import uuid
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Built-in template definitions
# Each template defines entities (with fields) and pages (with layout/blocks).
# ---------------------------------------------------------------------------

_TEMPLATES: dict[str, dict[str, Any]] = {
    "tasks": {
        "name": "Диспетчер задач",
        "entities": [
            {
                "slug": "tasks",
                "display_name": "Задачи",
                "fields": [
                    {"name": "title",    "display_name": "Название",   "field_type": "text",     "is_required": True},
                    {"name": "status",   "display_name": "Статус",     "field_type": "select",   "field_options": {"choices": [{"value": "todo", "label": "К выполнению"}, {"value": "in_progress", "label": "В работе"}, {"value": "done", "label": "Готово"}]}},
                    {"name": "priority", "display_name": "Приоритет",  "field_type": "select",   "field_options": {"choices": [{"value": "low", "label": "Низкий"}, {"value": "medium", "label": "Средний"}, {"value": "high", "label": "Высокий"}]}},
                    {"name": "due_date", "display_name": "Срок",       "field_type": "date"},
                    {"name": "notes",    "display_name": "Примечания", "field_type": "long_text"},
                ],
            }
        ],
        "pages": [
            {
                "slug": "task-list",
                "title": "Список задач",
                "layout": {"view_type": "table"},
                "blocks": [{"id": "_b1", "type": "table", "title": "Задачи", "config": {}}],
            }
        ],
    },
    "inventory": {
        "name": "Инвентаризация",
        "entities": [
            {
                "slug": "items",
                "display_name": "Предметы",
                "fields": [
                    {"name": "name",     "display_name": "Наименование", "field_type": "text",    "is_required": True},
                    {"name": "sku",      "display_name": "Артикул",      "field_type": "autonumber"},
                    {"name": "quantity", "display_name": "Количество",   "field_type": "number"},
                    {"name": "location", "display_name": "Расположение", "field_type": "text"},
                    {"name": "category", "display_name": "Категория",    "field_type": "select",  "field_options": {"choices": [{"value": "equipment", "label": "Оборудование"}, {"value": "material", "label": "Материал"}, {"value": "other", "label": "Прочее"}]}},
                ],
            }
        ],
        "pages": [
            {
                "slug": "inventory-list",
                "title": "Склад",
                "layout": {"view_type": "table"},
                "blocks": [{"id": "_b1", "type": "table", "title": "Предметы", "config": {}}],
            }
        ],
    },
    "visitors": {
        "name": "Регистрация посетителей",
        "entities": [
            {
                "slug": "visitors",
                "display_name": "Посетители",
                "fields": [
                    {"name": "full_name",   "display_name": "ФИО",          "field_type": "text",    "is_required": True},
                    {"name": "badge",       "display_name": "Пропуск №",    "field_type": "autonumber"},
                    {"name": "purpose",     "display_name": "Цель визита",  "field_type": "text"},
                    {"name": "host",        "display_name": "Принимает",    "field_type": "text"},
                    {"name": "visit_date",  "display_name": "Дата визита",  "field_type": "date"},
                    {"name": "checked_out", "display_name": "Вышел",        "field_type": "boolean"},
                ],
            }
        ],
        "pages": [
            {
                "slug": "visitor-log",
                "title": "Журнал посетителей",
                "layout": {"view_type": "table"},
                "blocks": [{"id": "_b1", "type": "table", "title": "Посетители", "config": {}}],
            },
            {
                "slug": "visitor-form",
                "title": "Регистрация",
                "layout": {"view_type": "form"},
                "blocks": [{"id": "_b2", "type": "form", "title": "Новый посетитель", "config": {}}],
            },
        ],
    },
    "survey": {
        "name": "Простой опрос",
        "entities": [
            {
                "slug": "responses",
                "display_name": "Ответы",
                "fields": [
                    {"name": "respondent", "display_name": "Участник",  "field_type": "text",   "is_required": True},
                    {"name": "score",      "display_name": "Оценка",   "field_type": "number"},
                    {"name": "comment",    "display_name": "Комментарий", "field_type": "long_text"},
                    {"name": "submitted",  "display_name": "Дата",     "field_type": "date"},
                ],
            }
        ],
        "pages": [
            {
                "slug": "survey-form",
                "title": "Пройти опрос",
                "layout": {"view_type": "form"},
                "blocks": [{"id": "_b1", "type": "form", "title": "Форма опроса", "config": {}}],
            },
            {
                "slug": "results",
                "title": "Результаты",
                "layout": {"view_type": "table"},
                "blocks": [{"id": "_b2", "type": "table", "title": "Ответы", "config": {}}],
            },
        ],
    },
}


class TemplateNotFoundError(Exception):
    pass


class TemplateService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def list_template_ids(self) -> list[str]:
        return list(_TEMPLATES.keys())

    def get_template_meta(self, template_id: str) -> dict[str, Any]:
        if template_id not in _TEMPLATES:
            raise TemplateNotFoundError(template_id)
        tpl = _TEMPLATES[template_id]
        return {"id": template_id, "name": tpl["name"]}

    async def install(
        self,
        app_id: uuid.UUID,
        template_id: str,
        actor_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """
        Create entities (with fields) and pages for the given template.
        Returns summary: {entities_created, pages_created}.
        """
        from app.models.metamodel import Entity, Field
        from app.models.ui import Page
        from app.services.sequences import SequenceService

        if template_id not in _TEMPLATES:
            raise TemplateNotFoundError(template_id)

        tpl = _TEMPLATES[template_id]
        entity_map: dict[str, uuid.UUID] = {}  # slug → entity_id
        entities_created = 0
        pages_created = 0

        for ent_def in tpl.get("entities", []):
            entity = Entity(
                app_id=app_id,
                slug=ent_def["slug"],
                display_name=ent_def["display_name"],
            )
            self._db.add(entity)
            await self._db.flush()

            for order, field_def in enumerate(ent_def.get("fields", [])):
                field = Field(
                    entity_id=entity.id,
                    app_id=app_id,
                    name=field_def["name"],
                    display_name=field_def["display_name"],
                    field_type=field_def["field_type"],
                    is_required=field_def.get("is_required", False),
                    field_options=field_def.get("field_options", {}),
                    display_order=order,
                )
                self._db.add(field)

                # Auto-create sequence for autonumber fields
                if field_def["field_type"] == "autonumber":
                    await self._db.flush()
                    seq_svc = SequenceService(self._db)
                    try:
                        await seq_svc.create_sequence(
                            app_id=app_id,
                            entity_id=entity.id,
                            field_name=field_def["name"],
                            prefix=field_def.get("prefix", ""),
                            padding=field_def.get("padding", 5),
                        )
                    except Exception:
                        pass  # Ignore if already exists (idempotent install)

            await self._db.flush()
            entity_map[ent_def["slug"]] = entity.id
            entities_created += 1

        for page_def in tpl.get("pages", []):
            # Resolve entity_id from the first entity by default
            first_entity_id = next(iter(entity_map.values()), None)
            layout = {**page_def.get("layout", {})}
            if first_entity_id:
                layout["entity_id"] = str(first_entity_id)

            # Patch block IDs to proper UUIDs
            blocks = []
            for b in page_def.get("blocks", []):
                import secrets
                blocks.append({**b, "id": secrets.token_hex(8)})

            page = Page(
                app_id=app_id,
                slug=page_def["slug"],
                title=page_def["title"],
                layout=layout,
                blocks=blocks,
                is_published=True,
            )
            self._db.add(page)
            pages_created += 1

        await self._db.flush()
        logger.info(
            "template_installed",
            app_id=str(app_id),
            template_id=template_id,
            entities_created=entities_created,
            pages_created=pages_created,
        )
        return {"entities_created": entities_created, "pages_created": pages_created}
