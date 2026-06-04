import base64
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.identity import Role, User, UserRole
from app.schemas.common import CursorPage
from app.schemas.users import UserCreate, UserListParams, UserRead, UserUpdate

logger = structlog.get_logger(__name__)


class UserNotFoundError(Exception):
    pass


class UserConflictError(Exception):
    pass


def _encode_cursor(user_id: uuid.UUID, created_at: datetime) -> str:
    raw = f"{created_at.isoformat()}|{user_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    ts, uid = raw.split("|", 1)
    return datetime.fromisoformat(ts), uuid.UUID(uid)


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_users(self, params: UserListParams) -> CursorPage[UserRead]:
        stmt = (
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .order_by(User.created_at.asc(), User.id.asc())
        )

        if params.is_active is not None:
            stmt = stmt.where(User.is_active == params.is_active)

        if params.role:
            stmt = stmt.join(User.roles).where(UserRole.role_id == params.role)

        if params.search:
            term = f"%{params.search}%"
            stmt = stmt.where(
                or_(User.email.ilike(term), User.display_name.ilike(term))
            )

        if params.cursor:
            cur_ts, cur_id = _decode_cursor(params.cursor)
            stmt = stmt.where(
                or_(
                    User.created_at > cur_ts,
                    (User.created_at == cur_ts) & (User.id > cur_id),
                )
            )

        stmt = stmt.limit(params.limit + 1)
        result = await self._db.execute(stmt)
        rows = result.scalars().all()

        has_more = len(rows) > params.limit
        items = rows[: params.limit]
        next_cursor = _encode_cursor(items[-1].id, items[-1].created_at) if has_more else None

        return CursorPage(
            items=[UserRead.model_validate(u) for u in items],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_by_id(self, user_id: uuid.UUID) -> UserRead:
        user = await self._fetch_user(user_id)
        return UserRead.model_validate(user)

    async def create_user(self, data: UserCreate, granted_by: uuid.UUID | None = None) -> UserRead:
        # Check email uniqueness
        existing = await self._db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise UserConflictError(f"Email already registered: {data.email}")

        user = User(
            email=data.email,
            display_name=data.display_name,
            password_hash=hash_password(data.password),
        )
        self._db.add(user)
        await self._db.flush()  # get user.id

        if data.roles:
            await self._set_roles(user.id, data.roles, granted_by=granted_by)

        await self._db.flush()
        logger.info("user_created", user_id=str(user.id), email=data.email)
        return await self.get_by_id(user.id)

    async def update_user(
        self, user_id: uuid.UUID, data: UserUpdate, updated_by: uuid.UUID | None = None
    ) -> UserRead:
        user = await self._fetch_user(user_id)

        if data.display_name is not None:
            user.display_name = data.display_name
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.roles is not None:
            await self._set_roles(user_id, data.roles, granted_by=updated_by)

        await self._db.flush()
        logger.info("user_updated", user_id=str(user_id))
        return await self.get_by_id(user_id)

    async def delete_user(self, user_id: uuid.UUID) -> None:
        user = await self._fetch_user(user_id)
        if user.is_superuser:
            raise PermissionError("Cannot delete superuser")
        user.is_active = False
        await self._db.flush()
        logger.info("user_deactivated", user_id=str(user_id))

    async def get_roles(self) -> list[dict[str, str]]:
        result = await self._db.execute(select(Role).order_by(Role.id))
        return [{"id": r.id, "display_name": r.display_name} for r in result.scalars()]

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    async def _fetch_user(self, user_id: uuid.UUID) -> User:
        stmt = (
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .where(User.id == user_id)
        )
        result = await self._db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            raise UserNotFoundError(str(user_id))
        return user

    async def _set_roles(
        self, user_id: uuid.UUID, role_ids: list[str], granted_by: uuid.UUID | None
    ) -> None:
        # Validate role ids exist
        result = await self._db.execute(select(Role.id).where(Role.id.in_(role_ids)))
        found = {r for r in result.scalars()}
        invalid = set(role_ids) - found
        if invalid:
            raise ValueError(f"Unknown roles: {invalid}")

        # Delete old assignments
        existing = await self._db.execute(
            select(UserRole).where(UserRole.user_id == user_id)
        )
        for ur in existing.scalars():
            await self._db.delete(ur)

        # Insert new ones
        for rid in role_ids:
            self._db.add(UserRole(user_id=user_id, role_id=rid, granted_by=granted_by))
