import uuid
from datetime import datetime

import structlog
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import App, AppMember
from app.models.identity import User
from app.schemas.apps import AppCreate, AppMemberAdd, AppRead, AppUpdate
from app.schemas.common import CursorPage

logger = structlog.get_logger(__name__)


class AppNotFoundError(Exception):
    pass


class AppConflictError(Exception):
    pass


class AppPermissionError(Exception):
    pass


def _encode_cursor(app_id: uuid.UUID, created_at: datetime) -> str:
    import base64
    raw = f"{created_at.isoformat()}|{app_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    import base64
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    ts, uid = raw.split("|", 1)
    return datetime.fromisoformat(ts), uuid.UUID(uid)


class AppService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_apps(
        self,
        actor_id: uuid.UUID,
        is_platform_admin: bool,
        cursor: str | None = None,
        limit: int = 50,
        search: str | None = None,
        include_archived: bool = False,
    ) -> CursorPage[AppRead]:
        stmt = select(App).order_by(App.created_at.asc(), App.id.asc())

        if not is_platform_admin:
            # Non-admins only see apps they own or are members of
            stmt = stmt.where(
                or_(
                    App.owner_id == actor_id,
                    App.id.in_(
                        select(AppMember.app_id).where(AppMember.user_id == actor_id)
                    ),
                )
            )

        if not include_archived:
            stmt = stmt.where(App.is_archived.is_(False))

        if search:
            term = f"%{search}%"
            stmt = stmt.where(or_(App.name.ilike(term), App.slug.ilike(term)))

        if cursor:
            cur_ts, cur_id = _decode_cursor(cursor)
            stmt = stmt.where(
                or_(
                    App.created_at > cur_ts,
                    (App.created_at == cur_ts) & (App.id > cur_id),
                )
            )

        stmt = stmt.limit(limit + 1)
        result = await self._db.execute(stmt)
        rows = result.scalars().all()

        has_more = len(rows) > limit
        items = rows[:limit]
        next_cursor = _encode_cursor(items[-1].id, items[-1].created_at) if has_more else None

        return CursorPage(
            items=[AppRead.model_validate(a) for a in items],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_app(self, app_id: uuid.UUID, actor_id: uuid.UUID, is_admin: bool) -> AppRead:
        app = await self._fetch_app(app_id)
        if not is_admin:
            await self._require_member(app_id, actor_id)
        return AppRead.model_validate(app)

    async def create_app(self, data: AppCreate, owner_id: uuid.UUID) -> AppRead:
        existing = await self._db.execute(select(App).where(App.slug == data.slug))
        if existing.scalar_one_or_none():
            raise AppConflictError(f"Slug already taken: {data.slug}")

        app = App(
            slug=data.slug,
            name=data.name,
            description=data.description,
            icon=data.icon,
            color=data.color,
            settings=data.settings,
            owner_id=owner_id,
        )
        self._db.add(app)
        await self._db.flush()

        # Owner is also a member with 'owner' role
        self._db.add(AppMember(app_id=app.id, user_id=owner_id, role="owner"))
        await self._db.flush()

        logger.info("app_created", app_id=str(app.id), slug=app.slug, owner=str(owner_id))
        return AppRead.model_validate(app)

    async def update_app(
        self, app_id: uuid.UUID, data: AppUpdate, actor_id: uuid.UUID, is_admin: bool
    ) -> AppRead:
        app = await self._fetch_app(app_id)
        if not is_admin:
            await self._require_role(app_id, actor_id, {"owner", "admin"})

        if data.name is not None:
            app.name = data.name
        if data.description is not None:
            app.description = data.description
        if data.icon is not None:
            app.icon = data.icon
        if data.color is not None:
            app.color = data.color
        if data.settings is not None:
            app.settings = data.settings

        await self._db.flush()
        await self._db.refresh(app, attribute_names=["updated_at"])
        logger.info("app_updated", app_id=str(app_id))
        return AppRead.model_validate(app)

    async def delete_app(self, app_id: uuid.UUID, actor_id: uuid.UUID, is_admin: bool) -> None:
        app = await self._fetch_app(app_id)
        if not is_admin:
            await self._require_role(app_id, actor_id, {"owner"})
        app.is_archived = True
        await self._db.flush()
        logger.info("app_archived", app_id=str(app_id))

    async def publish_app(
        self, app_id: uuid.UUID, actor_id: uuid.UUID, is_admin: bool
    ) -> AppRead:
        app = await self._fetch_app(app_id)
        if not is_admin:
            await self._require_role(app_id, actor_id, {"owner", "admin"})
        app.is_published = True
        await self._db.flush()
        await self._db.refresh(app, attribute_names=["updated_at"])
        logger.info("app_published", app_id=str(app_id))
        return AppRead.model_validate(app)

    async def add_member(
        self,
        app_id: uuid.UUID,
        data: AppMemberAdd,
        actor_id: uuid.UUID,
        is_admin: bool,
    ) -> None:
        await self._fetch_app(app_id)
        if not is_admin:
            await self._require_role(app_id, actor_id, {"owner", "admin"})

        existing = await self._db.execute(
            select(AppMember).where(
                AppMember.app_id == app_id, AppMember.user_id == data.user_id
            )
        )
        member = existing.scalar_one_or_none()
        if member:
            member.role = data.role
        else:
            self._db.add(
                AppMember(
                    app_id=app_id,
                    user_id=data.user_id,
                    role=data.role,
                    granted_by=actor_id,
                )
            )
        await self._db.flush()

    async def remove_member(
        self,
        app_id: uuid.UUID,
        user_id: uuid.UUID,
        actor_id: uuid.UUID,
        is_admin: bool,
    ) -> None:
        if not is_admin:
            await self._require_role(app_id, actor_id, {"owner", "admin"})
        result = await self._db.execute(
            select(AppMember).where(
                AppMember.app_id == app_id, AppMember.user_id == user_id
            )
        )
        member = result.scalar_one_or_none()
        if member:
            await self._db.delete(member)

    # ------------------------------------------------------------------
    async def _fetch_app(self, app_id: uuid.UUID) -> App:
        result = await self._db.execute(select(App).where(App.id == app_id))
        app = result.scalar_one_or_none()
        if app is None:
            raise AppNotFoundError(str(app_id))
        return app

    async def _require_member(self, app_id: uuid.UUID, user_id: uuid.UUID) -> None:
        result = await self._db.execute(
            select(AppMember).where(
                AppMember.app_id == app_id, AppMember.user_id == user_id
            )
        )
        if result.scalar_one_or_none() is None:
            # 404 masking — don't reveal app existence to non-members
            raise AppNotFoundError(str(app_id))

    async def _require_role(
        self, app_id: uuid.UUID, user_id: uuid.UUID, allowed: set[str]
    ) -> None:
        result = await self._db.execute(
            select(AppMember).where(
                AppMember.app_id == app_id, AppMember.user_id == user_id
            )
        )
        member = result.scalar_one_or_none()
        if member is None or member.role not in allowed:
            raise AppPermissionError(f"Role {member.role if member else 'none'!r} not in {allowed}")
