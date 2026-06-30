import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.users import RoleRead


class GroupMemberRead(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    is_active: bool

    model_config = {"from_attributes": True}


class GroupRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    member_count: int = 0
    roles: list[RoleRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class GroupDetailRead(GroupRead):
    members: list[GroupMemberRead] = Field(default_factory=list)


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=256)
    description: str | None = None
    role_ids: list[str] = Field(default_factory=list)


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=256)
    description: str | None = None
    role_ids: list[str] | None = None
