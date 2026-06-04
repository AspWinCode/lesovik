"""Field-level ABAC schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class FieldPermissionRead(BaseModel):
    id: uuid.UUID
    app_id: uuid.UUID
    entity_id: uuid.UUID
    field_name: str
    role_id: str
    can_read: bool
    can_write: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class FieldPermissionUpsert(BaseModel):
    """Create or replace a field permission for one (field_name, role_id) pair."""
    field_name: str = Field(min_length=1, max_length=128)
    role_id: str = Field(min_length=1, max_length=128)
    can_read: bool = True
    can_write: bool = True


class FieldPermissionBulkUpsert(BaseModel):
    """Full replacement of all field permissions for one entity."""
    permissions: list[FieldPermissionUpsert] = Field(max_length=500)


class FieldRestrictionsResponse(BaseModel):
    """Result of an ABAC check for a given caller + entity."""
    entity_id: uuid.UUID
    denied_read: list[str]   # field names the caller cannot read
    denied_write: list[str]  # field names the caller cannot write
