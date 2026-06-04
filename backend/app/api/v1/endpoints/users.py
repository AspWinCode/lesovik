import uuid

import structlog
from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AuthDep, DbDep
from app.schemas.common import CursorPage
from app.schemas.users import RoleRead, UserCreate, UserListParams, UserRead, UserUpdate
from app.services.users import UserConflictError, UserNotFoundError, UserService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


def _require_admin(current_user: AuthDep) -> None:
    if not current_user.has_role("platform_admin") and not current_user.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.get("", response_model=CursorPage[UserRead], summary="List users (cursor pagination)")
async def list_users(
    current_user: AuthDep,
    db: DbDep,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
) -> CursorPage[UserRead]:
    if not current_user.has_role("platform_admin", "auditor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    params = UserListParams(cursor=cursor, limit=limit, search=search, role=role, is_active=is_active)
    return await UserService(db).list_users(params)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="Create user")
async def create_user(body: UserCreate, current_user: AuthDep, db: DbDep) -> UserRead:
    if not current_user.has_role("platform_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return await UserService(db).create_user(body, granted_by=current_user.user_id)
    except UserConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/me", response_model=UserRead, summary="Get current user profile")
async def me(current_user: AuthDep, db: DbDep) -> UserRead:
    try:
        return await UserService(db).get_by_id(current_user.user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") from exc


@router.get("/{user_id}", response_model=UserRead, summary="Get user by ID")
async def get_user(user_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> UserRead:
    # Users can read their own profile; admins/auditors can read any
    if user_id != current_user.user_id and not current_user.has_role("platform_admin", "auditor"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    try:
        return await UserService(db).get_by_id(user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found") from exc


@router.patch("/{user_id}", response_model=UserRead, summary="Update user")
async def update_user(user_id: uuid.UUID, body: UserUpdate, current_user: AuthDep, db: DbDep) -> UserRead:
    if not current_user.has_role("platform_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return await UserService(db).update_user(user_id, body, updated_by=current_user.user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Deactivate user")
async def delete_user(user_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> None:
    if not current_user.has_role("platform_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        await UserService(db).delete_user(user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found") from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/roles", response_model=list[RoleRead], tags=["roles"], summary="List all roles")
async def list_roles(current_user: AuthDep, db: DbDep) -> list[RoleRead]:
    roles = await UserService(db).get_roles()
    return [RoleRead(id=r["id"], display_name=r["display_name"]) for r in roles]
