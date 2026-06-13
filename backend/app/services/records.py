"""RecordService: CRUD with JSONB payload, filter engine, cursor pagination, field validation."""
import base64
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import and_, cast, func, or_, select, text, update
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import Numeric

from app.core.metrics import record_operations
from app.models.data import Record
from app.models.metamodel import Entity, Field
from app.schemas.common import CursorPage
from app.schemas.records import FilterOp, ParsedFilter, RecordCreate, RecordListParams, RecordRead, RecordUpdate

logger = structlog.get_logger(__name__)

MAX_PAYLOAD_KEYS = 200


class RecordNotFoundError(Exception):
    pass


class RecordValidationError(Exception):
    pass


def _cursor_encode(created_at: datetime, record_id: uuid.UUID) -> str:
    raw = f"{created_at.isoformat()}|{record_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _cursor_decode(cursor: str) -> tuple[datetime, uuid.UUID]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    ts, uid = raw.split("|", 1)
    return datetime.fromisoformat(ts), uuid.UUID(uid)


# ------------------------------------------------------------------
# JSONB filter → SQLAlchemy expression
# ------------------------------------------------------------------

def _jsonb_text(field: str) -> Any:
    """payload->>'field' — text extraction."""
    return func.jsonb_extract_path_text(Record.payload, field)


def _build_condition(f: ParsedFilter) -> Any:
    """Convert a ParsedFilter into a SQLAlchemy WHERE clause."""
    text_expr = _jsonb_text(f.field)

    match f.op:
        case FilterOp.EQ:
            return text_expr == f.value
        case FilterOp.NE:
            return text_expr != f.value
        case FilterOp.GT:
            return cast(text_expr, Numeric) > float(f.value)  # type: ignore[arg-type]
        case FilterOp.GTE:
            return cast(text_expr, Numeric) >= float(f.value)  # type: ignore[arg-type]
        case FilterOp.LT:
            return cast(text_expr, Numeric) < float(f.value)  # type: ignore[arg-type]
        case FilterOp.LTE:
            return cast(text_expr, Numeric) <= float(f.value)  # type: ignore[arg-type]
        case FilterOp.CONTAINS:
            return text_expr.contains(f.value)
        case FilterOp.ICONTAINS:
            return text_expr.ilike(f"%{f.value}%")
        case FilterOp.IN:
            values = [v.strip() for v in (f.value or "").split(",")]
            return text_expr.in_(values)
        case FilterOp.NIN:
            values = [v.strip() for v in (f.value or "").split(",")]
            return text_expr.notin_(values)
        case FilterOp.IS_NULL:
            # field is absent from JSON or explicitly null
            return or_(
                text_expr.is_(None),
                ~Record.payload.has_key(f.field),  # type: ignore[attr-defined]
            )
        case FilterOp.IS_NOT_NULL:
            return and_(
                text_expr.isnot(None),
                Record.payload.has_key(f.field),  # type: ignore[attr-defined]
            )
        case _:
            raise ValueError(f"Unsupported filter op: {f.op}")


# ------------------------------------------------------------------
# Field validation
# ------------------------------------------------------------------

def _validate_payload(
    payload: dict[str, Any],
    fields: list[Field],
    partial: bool = False,
) -> None:
    """
    Validate record payload against entity field definitions.
    partial=True skips required-field check (used for PATCH).
    """
    if len(payload) > MAX_PAYLOAD_KEYS:
        raise RecordValidationError(f"Payload exceeds {MAX_PAYLOAD_KEYS} keys")

    field_map = {f.name: f for f in fields if not f.is_system}

    # Check for unknown fields
    unknown = set(payload) - set(field_map)
    # Allow _id/_meta style internal keys to pass through
    unknown = {k for k in unknown if not k.startswith("_")}
    if unknown:
        raise RecordValidationError(f"Unknown fields: {sorted(unknown)}")

    if not partial:
        # Check required fields
        missing = [
            f.name for f in field_map.values()
            if f.is_required and f.name not in payload
        ]
        if missing:
            raise RecordValidationError(f"Required fields missing: {missing}")

    # Type-level validation
    for name, value in payload.items():
        field = field_map.get(name)
        if not field:
            continue
        _validate_field_value(field, name, value)


def _validate_field_value(field: Field, name: str, value: Any) -> None:
    ft = field.field_type
    opts = field.field_options or {}
    rules = field.validation_rules or {}

    if value is None:
        if field.is_required:
            raise RecordValidationError(f"Field '{name}' is required, got null")
        return

    if ft in ("text", "long_text", "rich_text", "url", "email", "phone"):
        if not isinstance(value, str):
            raise RecordValidationError(f"Field '{name}' expects string, got {type(value).__name__}")
        if "max_length" in rules and len(value) > rules["max_length"]:
            raise RecordValidationError(f"Field '{name}' exceeds max_length {rules['max_length']}")
        if ft == "email" and "@" not in value:
            raise RecordValidationError(f"Field '{name}' is not a valid email")

    elif ft in ("number", "decimal"):
        if not isinstance(value, (int, float)):
            try:
                float(value)
            except (TypeError, ValueError) as exc:
                raise RecordValidationError(f"Field '{name}' expects number") from exc
        if "min" in rules and float(value) < rules["min"]:
            raise RecordValidationError(f"Field '{name}' below minimum {rules['min']}")
        if "max" in rules and float(value) > rules["max"]:
            raise RecordValidationError(f"Field '{name}' above maximum {rules['max']}")

    elif ft == "boolean":
        if not isinstance(value, bool):
            raise RecordValidationError(f"Field '{name}' expects boolean")

    elif ft == "select":
        choices = [c["value"] for c in opts.get("choices", [])]
        if choices and value not in choices:
            raise RecordValidationError(f"Field '{name}': {value!r} not in choices {choices}")

    elif ft == "multi_select":
        if not isinstance(value, list):
            raise RecordValidationError(f"Field '{name}' expects list for multi_select")
        choices = [c["value"] for c in opts.get("choices", [])]
        if choices:
            invalid = [v for v in value if v not in choices]
            if invalid:
                raise RecordValidationError(f"Field '{name}': invalid choices {invalid}")


# ------------------------------------------------------------------
# RecordService
# ------------------------------------------------------------------

class RecordService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_records(
        self, entity_id: uuid.UUID, params: RecordListParams
    ) -> CursorPage[RecordRead]:
        stmt = (
            select(Record)
            .where(Record.entity_id == entity_id)
            .order_by(Record.created_at.asc(), Record.id.asc())
        )

        if not params.include_deleted:
            stmt = stmt.where(Record.is_deleted.is_(False))

        # JSONB filters
        for f in params.filters:
            stmt = stmt.where(_build_condition(f))

        # Custom sort by payload field
        if params.sort_field:
            sort_expr = _jsonb_text(params.sort_field)
            stmt = stmt.order_by(
                sort_expr.asc() if params.sort_dir == "asc" else sort_expr.desc()
            )

        # Cursor pagination
        if params.cursor:
            cur_ts, cur_id = _cursor_decode(params.cursor)
            stmt = stmt.where(
                or_(
                    Record.created_at > cur_ts,
                    and_(Record.created_at == cur_ts, Record.id > cur_id),
                )
            )

        stmt = stmt.limit(params.limit + 1)
        result = await self._db.execute(stmt)
        rows = result.scalars().all()

        has_more = len(rows) > params.limit
        items = rows[: params.limit]
        next_cursor = (
            _cursor_encode(items[-1].created_at, items[-1].id) if has_more else None
        )
        record_operations.labels(operation="list").inc()
        return CursorPage(
            items=[RecordRead.model_validate(r) for r in items],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_record(self, entity_id: uuid.UUID, record_id: uuid.UUID) -> RecordRead:
        record = await self._fetch(entity_id, record_id)
        record_operations.labels(operation="read").inc()
        return RecordRead.model_validate(record)

    async def create_record(
        self,
        entity_id: uuid.UUID,
        data: RecordCreate,
        actor_id: uuid.UUID | None = None,
    ) -> RecordRead:
        fields = await self._get_entity_fields(entity_id)
        _validate_payload(data.payload, fields, partial=False)

        record = Record(
            entity_id=entity_id,
            payload=data.payload,
            created_by=actor_id,
            updated_by=actor_id,
        )
        self._db.add(record)
        await self._db.flush()
        record_operations.labels(operation="create").inc()
        logger.info("record_created", record_id=str(record.id), entity_id=str(entity_id))
        return RecordRead.model_validate(record)

    async def update_record(
        self,
        entity_id: uuid.UUID,
        record_id: uuid.UUID,
        data: RecordUpdate,
        actor_id: uuid.UUID | None = None,
    ) -> RecordRead:
        record = await self._fetch(entity_id, record_id)
        fields = await self._get_entity_fields(entity_id)
        _validate_payload(data.payload, fields, partial=True)

        # JSONB merge: existing payload + incoming updates
        merged = {**record.payload, **data.payload}
        # Remove keys explicitly set to None (delete semantics)
        merged = {k: v for k, v in merged.items() if v is not None}

        await self._db.execute(
            update(Record)
            .where(Record.entity_id == entity_id, Record.id == record_id)
            .values(
                payload=merged,
                version=Record.version + 1,
                updated_by=actor_id,
                updated_at=datetime.now(UTC),
            )
        )
        await self._db.flush()
        record_operations.labels(operation="update").inc()
        return await self.get_record(entity_id, record_id)

    async def delete_record(
        self, entity_id: uuid.UUID, record_id: uuid.UUID, hard: bool = False
    ) -> None:
        record = await self._fetch(entity_id, record_id)
        if hard:
            await self._db.delete(record)
        else:
            record.is_deleted = True
        await self._db.flush()
        record_operations.labels(operation="delete").inc()
        logger.info("record_deleted", record_id=str(record_id), hard=hard)

    async def restore_record(self, entity_id: uuid.UUID, record_id: uuid.UUID) -> RecordRead:
        stmt = select(Record).where(
            Record.entity_id == entity_id,
            Record.id == record_id,
            Record.is_deleted.is_(True),
        )
        result = await self._db.execute(stmt)
        record = result.scalar_one_or_none()
        if record is None:
            raise RecordNotFoundError(str(record_id))
        record.is_deleted = False
        await self._db.flush()
        await self._db.refresh(record, attribute_names=["updated_at"])
        return RecordRead.model_validate(record)

    # ------------------------------------------------------------------
    async def _fetch(self, entity_id: uuid.UUID, record_id: uuid.UUID) -> Record:
        stmt = select(Record).where(
            Record.entity_id == entity_id,
            Record.id == record_id,
            Record.is_deleted.is_(False),
        )
        result = await self._db.execute(stmt)
        record = result.scalar_one_or_none()
        if record is None:
            raise RecordNotFoundError(str(record_id))
        return record

    async def _get_entity_fields(self, entity_id: uuid.UUID) -> list[Field]:
        result = await self._db.execute(
            select(Field).where(Field.entity_id == entity_id)
        )
        return list(result.scalars())
