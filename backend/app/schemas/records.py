"""Record schemas + filter DSL parser.

Filter format: ?filter=field:op:value  (repeatable)
Operators: eq ne gt gte lt lte contains icontains in nin is_null is_not_null
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class FilterOp(str, Enum):
    EQ = "eq"
    NE = "ne"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    CONTAINS = "contains"
    ICONTAINS = "icontains"
    IN = "in"          # value is comma-separated list
    NIN = "nin"        # not in
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"


class ParsedFilter(BaseModel):
    field: str
    op: FilterOp
    value: str | None = None


def parse_filters(raw_filters: list[str]) -> list[ParsedFilter]:
    """
    Parse list of 'field:op:value' strings into ParsedFilter objects.
    Raises ValueError on malformed input.
    """
    result: list[ParsedFilter] = []
    for raw in raw_filters:
        parts = raw.split(":", 2)
        if len(parts) < 2:
            raise ValueError(f"Invalid filter format: {raw!r} — expected 'field:op[:value]'")
        field, op_str = parts[0], parts[1]
        value = parts[2] if len(parts) == 3 else None

        # Validate field name (basic safety: alphanumeric + underscore)
        if not field.replace("_", "").replace(".", "").isalnum():
            raise ValueError(f"Invalid field name in filter: {field!r}")

        try:
            op = FilterOp(op_str)
        except ValueError as exc:
            raise ValueError(f"Unknown filter operator: {op_str!r}") from exc

        if op not in (FilterOp.IS_NULL, FilterOp.IS_NOT_NULL) and not value:
            raise ValueError(f"Filter {op} requires a value")

        result.append(ParsedFilter(field=field, op=op, value=value))
    return result


# ---- Schemas ----

class RecordRead(BaseModel):
    id: uuid.UUID
    entity_id: uuid.UUID
    payload: dict[str, Any]
    version: int
    created_by: uuid.UUID | None
    updated_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class RecordCreate(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class RecordUpdate(BaseModel):
    """PATCH — only provided fields are updated in payload."""
    payload: dict[str, Any] = Field(min_length=1)


class RecordListParams(BaseModel):
    cursor: str | None = None
    limit: int = Field(default=50, ge=1, le=200)
    filters: list[ParsedFilter] = Field(default_factory=list)
    sort_field: str | None = None
    sort_dir: str = Field(default="asc", pattern=r"^(asc|desc)$")
    include_deleted: bool = False


class RecordFileRead(BaseModel):
    id: uuid.UUID
    record_id: uuid.UUID
    entity_id: uuid.UUID
    field_name: str
    original_filename: str
    content_type: str | None
    size_bytes: int | None
    download_url: str | None = None  # presigned URL, populated on demand
    is_scanned: bool
    is_infected: bool | None
    created_at: datetime
    model_config = {"from_attributes": True}
