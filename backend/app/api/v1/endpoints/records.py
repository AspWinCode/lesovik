import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status

from app.api.deps import AuthDep, DbDep
from app.core.antivirus import get_antivirus
from app.core.rate_limit import limiter
from app.core.storage import get_storage
from app.schemas.common import CursorPage
from app.schemas.records import (
    RecordCreate,
    RecordFileRead,
    RecordListParams,
    RecordRead,
    RecordUpdate,
    parse_filters,
)
from app.services.apps import AppNotFoundError, AppService
from app.services.entities import EntityNotFoundError, EntityService
from app.services.files import FileError, FileNotFoundError, FileService
from app.services.records import RecordNotFoundError, RecordService, RecordValidationError
from app.services.security import ABACService

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/apps/{app_id}/entities/{entity_id}/records",
    tags=["records"],
)


async def _resolve_entity(app_id: uuid.UUID, entity_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> None:
    """Verify app is accessible and entity belongs to it."""
    try:
        await AppService(db).get_app(
            app_id, actor_id=current_user.user_id,
            is_admin=current_user.has_role("platform_admin"),
        )
    except AppNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found") from exc

    try:
        await EntityService(db).get_entity(app_id, entity_id)
    except EntityNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found") from exc


def _apply_abac(record: RecordRead, denied_read: set) -> RecordRead:  # type: ignore[type-arg]
    """Return a copy of the record with denied fields stripped from payload."""
    if not denied_read:
        return record
    filtered = {k: v for k, v in record.payload.items() if k not in denied_read}
    return record.model_copy(update={"payload": filtered})


# ------------------------------------------------------------------
# Records
# ------------------------------------------------------------------

@router.get("", response_model=CursorPage[RecordRead])
async def list_records(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    filter: list[str] = Query(default=[]),  # ?filter=name:eq:John&filter=age:gte:18
    sort: str | None = Query(default=None),
    sort_dir: str = Query(default="asc", pattern=r"^(asc|desc)$"),
    include_deleted: bool = Query(default=False),
) -> CursorPage[RecordRead]:
    await _resolve_entity(app_id, entity_id, current_user, db)

    try:
        parsed_filters = parse_filters(filter)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    params = RecordListParams(
        cursor=cursor,
        limit=limit,
        filters=parsed_filters,
        sort_field=sort,
        sort_dir=sort_dir,
        include_deleted=include_deleted and current_user.has_role("platform_admin", "app_admin"),
    )
    page = await RecordService(db).list_records(entity_id, params)

    restrictions = await ABACService(db).get_restrictions(entity_id, current_user.roles)
    if restrictions.denied_read:
        page = page.model_copy(update={
            "items": [_apply_abac(r, restrictions.denied_read) for r in page.items]
        })
    return page


@router.post("", response_model=RecordRead, status_code=status.HTTP_201_CREATED)
async def create_record(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    body: RecordCreate,
    current_user: AuthDep,
    db: DbDep,
) -> RecordRead:
    await _resolve_entity(app_id, entity_id, current_user, db)

    restrictions = await ABACService(db).get_restrictions(entity_id, current_user.roles)
    denied = restrictions.check_write(list(body.payload.keys()))
    if denied:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Write access denied for fields: {denied}",
        )

    try:
        return await RecordService(db).create_record(
            entity_id, body, actor_id=current_user.user_id
        )
    except RecordValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/{record_id}", response_model=RecordRead)
async def get_record(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    record_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
) -> RecordRead:
    await _resolve_entity(app_id, entity_id, current_user, db)
    try:
        record = await RecordService(db).get_record(entity_id, record_id)
    except RecordNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found") from exc

    restrictions = await ABACService(db).get_restrictions(entity_id, current_user.roles)
    return _apply_abac(record, restrictions.denied_read)


@router.patch("/{record_id}", response_model=RecordRead)
async def update_record(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    record_id: uuid.UUID,
    body: RecordUpdate,
    current_user: AuthDep,
    db: DbDep,
) -> RecordRead:
    await _resolve_entity(app_id, entity_id, current_user, db)

    restrictions = await ABACService(db).get_restrictions(entity_id, current_user.roles)
    denied = restrictions.check_write(list(body.payload.keys()))
    if denied:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Write access denied for fields: {denied}",
        )

    try:
        record = await RecordService(db).update_record(
            entity_id, record_id, body, actor_id=current_user.user_id
        )
    except RecordNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found") from exc
    except RecordValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    return _apply_abac(record, restrictions.denied_read)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    record_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
    hard: bool = Query(default=False),
) -> None:
    await _resolve_entity(app_id, entity_id, current_user, db)
    if hard and not current_user.has_role("platform_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hard delete requires platform_admin")
    try:
        await RecordService(db).delete_record(entity_id, record_id, hard=hard)
    except RecordNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found") from exc


@router.post("/{record_id}/restore", response_model=RecordRead)
async def restore_record(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    record_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
) -> RecordRead:
    await _resolve_entity(app_id, entity_id, current_user, db)
    try:
        return await RecordService(db).restore_record(entity_id, record_id)
    except RecordNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deleted record not found") from exc


# ------------------------------------------------------------------
# File attachments (nested under records)
# ------------------------------------------------------------------

@router.post("/{record_id}/files", response_model=RecordFileRead, status_code=status.HTTP_201_CREATED, tags=["files"])
@limiter.limit("20/minute")
async def upload_file(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    record_id: uuid.UUID,
    field_name: str,
    file: UploadFile,
    request: Request,
    current_user: AuthDep,
    db: DbDep,
) -> RecordFileRead:
    await _resolve_entity(app_id, entity_id, current_user, db)
    svc = FileService(db, get_storage(), get_antivirus())
    try:
        return await svc.upload_file(
            app_id, entity_id, record_id, field_name, file, actor_id=current_user.user_id
        )
    except FileError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/{record_id}/files", response_model=list[RecordFileRead], tags=["files"])
async def list_files(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    record_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
    field_name: str | None = Query(default=None),
) -> list[RecordFileRead]:
    await _resolve_entity(app_id, entity_id, current_user, db)
    svc = FileService(db, get_storage(), get_antivirus())
    return await svc.list_files(record_id, field_name=field_name)


@router.get("/{record_id}/files/{file_id}/download", response_model=RecordFileRead, tags=["files"])
async def get_download_url(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    record_id: uuid.UUID,
    file_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
    expires: int = Query(default=3600, ge=60, le=86400),
) -> RecordFileRead:
    await _resolve_entity(app_id, entity_id, current_user, db)
    svc = FileService(db, get_storage(), get_antivirus())
    try:
        return await svc.get_download_url(file_id, expires=expires)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc


@router.delete("/{record_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["files"])
async def delete_file(
    app_id: uuid.UUID,
    entity_id: uuid.UUID,
    record_id: uuid.UUID,
    file_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
) -> None:
    await _resolve_entity(app_id, entity_id, current_user, db)
    svc = FileService(db, get_storage(), get_antivirus())
    try:
        await svc.delete_file(file_id, actor_id=current_user.user_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc
