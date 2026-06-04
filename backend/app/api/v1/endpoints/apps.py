import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis.asyncio import Redis

from app.api.deps import AuthDep, DbDep
from app.core.locks import EditLock, LockConflictError
from app.core.redis import get_redis
from app.schemas.apps import AppCreate, AppMemberAdd, AppRead, AppUpdate, LockInfo
from app.schemas.common import CursorPage
from app.services.apps import AppConflictError, AppNotFoundError, AppPermissionError, AppService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/apps", tags=["apps"])

RedisDep = Annotated[Redis, Depends(get_redis)]


def _svc(db: DbDep) -> AppService:
    return AppService(db)


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")


@router.get("", response_model=CursorPage[AppRead])
async def list_apps(
    current_user: AuthDep,
    db: DbDep,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    search: str | None = Query(default=None),
    include_archived: bool = Query(default=False),
) -> CursorPage[AppRead]:
    is_admin = current_user.has_role("platform_admin")
    return await AppService(db).list_apps(
        actor_id=current_user.user_id,
        is_platform_admin=is_admin,
        cursor=cursor,
        limit=limit,
        search=search,
        include_archived=include_archived,
    )


@router.post("", response_model=AppRead, status_code=status.HTTP_201_CREATED)
async def create_app(body: AppCreate, current_user: AuthDep, db: DbDep) -> AppRead:
    if not current_user.has_role("platform_admin", "app_builder"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return await AppService(db).create_app(body, owner_id=current_user.user_id)
    except AppConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{app_id}", response_model=AppRead)
async def get_app(app_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> AppRead:
    try:
        return await AppService(db).get_app(
            app_id, actor_id=current_user.user_id,
            is_admin=current_user.has_role("platform_admin"),
        )
    except AppNotFoundError as exc:
        raise _not_found() from exc


@router.patch("/{app_id}", response_model=AppRead)
async def update_app(
    app_id: uuid.UUID, body: AppUpdate, current_user: AuthDep, db: DbDep, redis: RedisDep
) -> AppRead:
    lock = EditLock(
        redis, "app", app_id, current_user.user_id,
        holder_name=str(current_user.user_id),
    )
    try:
        async with lock:
            return await AppService(db).update_app(
                app_id, body,
                actor_id=current_user.user_id,
                is_admin=current_user.has_role("platform_admin"),
            )
    except LockConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={"holder_id": exc.holder_id, "holder_name": exc.holder_name},
        ) from exc
    except AppNotFoundError as exc:
        raise _not_found() from exc
    except AppPermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_app(app_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> None:
    try:
        await AppService(db).delete_app(
            app_id, actor_id=current_user.user_id,
            is_admin=current_user.has_role("platform_admin"),
        )
    except AppNotFoundError as exc:
        raise _not_found() from exc
    except AppPermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/{app_id}/publish", response_model=AppRead)
async def publish_app(app_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> AppRead:
    try:
        return await AppService(db).publish_app(
            app_id, actor_id=current_user.user_id,
            is_admin=current_user.has_role("platform_admin"),
        )
    except AppNotFoundError as exc:
        raise _not_found() from exc
    except AppPermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


# ---- Members ----

@router.post("/{app_id}/members", status_code=status.HTTP_204_NO_CONTENT)
async def add_member(app_id: uuid.UUID, body: AppMemberAdd, current_user: AuthDep, db: DbDep) -> None:
    try:
        await AppService(db).add_member(
            app_id, body,
            actor_id=current_user.user_id,
            is_admin=current_user.has_role("platform_admin"),
        )
    except AppNotFoundError as exc:
        raise _not_found() from exc
    except AppPermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.delete("/{app_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    app_id: uuid.UUID, user_id: uuid.UUID, current_user: AuthDep, db: DbDep
) -> None:
    try:
        await AppService(db).remove_member(
            app_id, user_id,
            actor_id=current_user.user_id,
            is_admin=current_user.has_role("platform_admin"),
        )
    except AppNotFoundError as exc:
        raise _not_found() from exc
    except AppPermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


# ---- Edit lock (heartbeat / status) ----

@router.get("/{app_id}/lock", response_model=LockInfo | None, tags=["locks"])
async def get_lock_info(app_id: uuid.UUID, current_user: AuthDep, redis: RedisDep) -> LockInfo | None:
    lock = EditLock(redis, "app", app_id, current_user.user_id)
    info = await lock.get_info()
    if info is None:
        return None
    return LockInfo(**info)


@router.post("/{app_id}/lock", status_code=status.HTTP_204_NO_CONTENT, tags=["locks"])
async def acquire_lock(app_id: uuid.UUID, current_user: AuthDep, redis: RedisDep) -> None:
    lock = EditLock(redis, "app", app_id, current_user.user_id)
    try:
        await lock.acquire()
    except LockConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={"holder_id": exc.holder_id},
        ) from exc


@router.delete("/{app_id}/lock", status_code=status.HTTP_204_NO_CONTENT, tags=["locks"])
async def release_lock(app_id: uuid.UUID, current_user: AuthDep, redis: RedisDep) -> None:
    lock = EditLock(redis, "app", app_id, current_user.user_id)
    await lock.release()
