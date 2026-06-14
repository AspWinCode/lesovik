import uuid

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import AuthDep, DbDep
from app.models.metamodel import Entity
from app.schemas.records import RecordListParams
from app.services.apps import AppNotFoundError, AppService
from app.services.exports import ExportError, ExportService

router = APIRouter(prefix="/apps/{app_id}/documents", tags=["documents"])

CONTENT_TYPES = {
    "csv": "text/csv; charset=utf-8",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


async def _check_app(app_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> None:
    try:
        await AppService(db).get_app(
            app_id,
            actor_id=current_user.user_id,
            is_admin=current_user.has_role("platform_admin"),
        )
    except AppNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found") from exc


async def _entity_by_slug(app_id: uuid.UUID, slug: str, db: DbDep) -> Entity:
    entity = (await db.execute(
        select(Entity).where(Entity.app_id == app_id, Entity.slug == slug)
    )).scalar_one_or_none()
    if entity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document entity '{slug}' not found. Install the documents module first.",
        )
    return entity


@router.get("/filing-cases/export")
async def export_filing_cases(
    app_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
    format: str = Query(default="csv", pattern=r"^(csv|xlsx|pdf)$"),
) -> Response:
    await _check_app(app_id, current_user, db)
    entity = await _entity_by_slug(app_id, "filing_cases", db)
    params = RecordListParams(limit=10_000, sort_field="code", sort_dir="asc")
    try:
        payload = await ExportService(db).export(entity.id, params, format=format)
    except ExportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return Response(
        content=payload,
        media_type=CONTENT_TYPES[format],
        headers={
            "Content-Disposition": f'attachment; filename="filing_cases.{format}"',
        },
    )
