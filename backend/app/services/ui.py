"""UIService: view CRUD, field config bulk-replace, page CRUD + publish."""
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ui import Page, View, ViewFieldConfig
from app.schemas.ui import (
    PageCreate,
    PageRead,
    PageUpdate,
    ViewCreate,
    ViewFieldConfigBulkUpdate,
    ViewFieldConfigRead,
    ViewRead,
    ViewUpdate,
)

logger = structlog.get_logger(__name__)


class ViewNotFoundError(Exception):
    pass


class PageNotFoundError(Exception):
    pass


class PageSlugConflictError(Exception):
    pass


class UIService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ==============================================================
    # Views
    # ==============================================================

    async def list_views(
        self,
        app_id: uuid.UUID,
        entity_id: uuid.UUID | None = None,
        view_type: str | None = None,
    ) -> list[ViewRead]:
        stmt = select(View).where(View.app_id == app_id).order_by(
            View.entity_id, View.is_default.desc(), View.created_at
        )
        if entity_id:
            stmt = stmt.where(View.entity_id == entity_id)
        if view_type:
            stmt = stmt.where(View.view_type == view_type)
        result = await self._db.execute(stmt)
        return [ViewRead.model_validate(v) for v in result.scalars()]

    async def get_view(self, app_id: uuid.UUID, view_id: uuid.UUID) -> ViewRead:
        view = await self._fetch_view(app_id, view_id)
        return ViewRead.model_validate(view)

    async def create_view(
        self,
        app_id: uuid.UUID,
        entity_id: uuid.UUID,
        data: ViewCreate,
        creator_id: uuid.UUID | None = None,
    ) -> ViewRead:
        view = View(
            app_id=app_id,
            entity_id=entity_id,
            name=data.name,
            view_type=data.view_type.value,
            config=data.config,
            is_public=data.is_public,
            created_by=creator_id,
        )
        self._db.add(view)
        await self._db.flush()
        logger.info("view_created", view_id=str(view.id), entity_id=str(entity_id))
        return ViewRead.model_validate(view)

    async def update_view(
        self, app_id: uuid.UUID, view_id: uuid.UUID, data: ViewUpdate
    ) -> ViewRead:
        view = await self._fetch_view(app_id, view_id)
        if data.name is not None:
            view.name = data.name
        if data.config is not None:
            view.config = data.config
        if data.is_public is not None:
            view.is_public = data.is_public
        await self._db.flush()
        return ViewRead.model_validate(view)

    async def delete_view(self, app_id: uuid.UUID, view_id: uuid.UUID) -> None:
        view = await self._fetch_view(app_id, view_id)
        await self._db.delete(view)
        await self._db.flush()

    async def set_default_view(self, app_id: uuid.UUID, view_id: uuid.UUID) -> ViewRead:
        """Make this view the default for its entity; clear any prior default."""
        view = await self._fetch_view(app_id, view_id)

        # Clear existing default for same entity
        await self._db.execute(
            update(View)
            .where(View.entity_id == view.entity_id, View.is_default.is_(True))
            .values(is_default=False)
        )
        view.is_default = True
        await self._db.flush()
        return ViewRead.model_validate(view)

    # ==============================================================
    # ViewFieldConfig
    # ==============================================================

    async def list_field_configs(self, view_id: uuid.UUID) -> list[ViewFieldConfigRead]:
        result = await self._db.execute(
            select(ViewFieldConfig)
            .where(ViewFieldConfig.view_id == view_id)
            .order_by(ViewFieldConfig.display_order, ViewFieldConfig.field_name)
        )
        return [ViewFieldConfigRead.model_validate(c) for c in result.scalars()]

    async def replace_field_configs(
        self, app_id: uuid.UUID, view_id: uuid.UUID, data: ViewFieldConfigBulkUpdate
    ) -> list[ViewFieldConfigRead]:
        """Full replacement: delete all existing configs, insert new set."""
        # Verify view ownership
        await self._fetch_view(app_id, view_id)

        await self._db.execute(
            delete(ViewFieldConfig).where(ViewFieldConfig.view_id == view_id)
        )

        new_configs: list[ViewFieldConfig] = []
        for item in data.fields:
            cfg = ViewFieldConfig(
                view_id=view_id,
                field_name=item.field_name,
                is_visible=item.is_visible,
                is_readonly=item.is_readonly,
                display_order=item.display_order,
                width=item.width,
                widget_type=item.widget_type,
                widget_config=item.widget_config,
            )
            self._db.add(cfg)
            new_configs.append(cfg)

        await self._db.flush()
        return [ViewFieldConfigRead.model_validate(c) for c in new_configs]

    # ==============================================================
    # Pages
    # ==============================================================

    async def list_pages(self, app_id: uuid.UUID) -> list[PageRead]:
        result = await self._db.execute(
            select(Page)
            .where(Page.app_id == app_id)
            .order_by(Page.nav_order, Page.created_at)
        )
        return [PageRead.model_validate(p) for p in result.scalars()]

    async def get_page(self, app_id: uuid.UUID, page_id: uuid.UUID) -> PageRead:
        page = await self._fetch_page(app_id, page_id)
        return PageRead.model_validate(page)

    async def create_page(self, app_id: uuid.UUID, data: PageCreate) -> PageRead:
        # Slug uniqueness
        existing = await self._db.execute(
            select(Page).where(Page.app_id == app_id, Page.slug == data.slug)
        )
        if existing.scalar_one_or_none():
            raise PageSlugConflictError(f"Slug '{data.slug}' already exists in this app")

        page = Page(
            app_id=app_id,
            slug=data.slug,
            title=data.title,
            icon=data.icon,
            nav_order=data.nav_order,
            layout=data.layout,
            blocks=data.blocks,
        )
        self._db.add(page)
        await self._db.flush()
        logger.info("page_created", page_id=str(page.id), slug=data.slug)
        return PageRead.model_validate(page)

    async def update_page(
        self, app_id: uuid.UUID, page_id: uuid.UUID, data: PageUpdate
    ) -> PageRead:
        page = await self._fetch_page(app_id, page_id)
        if data.title is not None:
            page.title = data.title
        if data.icon is not None:
            page.icon = data.icon
        if data.nav_order is not None:
            page.nav_order = data.nav_order
        if data.layout is not None:
            page.layout = data.layout
        if data.blocks is not None:
            page.blocks = data.blocks
        await self._db.flush()
        return PageRead.model_validate(page)

    async def delete_page(self, app_id: uuid.UUID, page_id: uuid.UUID) -> None:
        page = await self._fetch_page(app_id, page_id)
        await self._db.delete(page)
        await self._db.flush()

    async def publish_page(self, app_id: uuid.UUID, page_id: uuid.UUID) -> PageRead:
        page = await self._fetch_page(app_id, page_id)
        page.is_published = True
        page.published_at = datetime.now(UTC)
        await self._db.flush()
        logger.info("page_published", page_id=str(page_id))
        return PageRead.model_validate(page)

    async def unpublish_page(self, app_id: uuid.UUID, page_id: uuid.UUID) -> PageRead:
        page = await self._fetch_page(app_id, page_id)
        page.is_published = False
        await self._db.flush()
        return PageRead.model_validate(page)

    # ==============================================================
    # Internals
    # ==============================================================

    async def _fetch_view(self, app_id: uuid.UUID, view_id: uuid.UUID) -> View:
        result = await self._db.execute(
            select(View).where(View.id == view_id, View.app_id == app_id)
        )
        view = result.scalar_one_or_none()
        if view is None:
            raise ViewNotFoundError(str(view_id))
        return view

    async def _fetch_page(self, app_id: uuid.UUID, page_id: uuid.UUID) -> Page:
        result = await self._db.execute(
            select(Page).where(Page.id == page_id, Page.app_id == app_id)
        )
        page = result.scalar_one_or_none()
        if page is None:
            raise PageNotFoundError(str(page_id))
        return page
