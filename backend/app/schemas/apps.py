import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class AppMemberRead(BaseModel):
    user_id: uuid.UUID
    role: str
    granted_at: datetime
    model_config = {"from_attributes": True}


class AppRead(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    icon: str | None
    color: str | None
    owner_id: uuid.UUID
    is_published: bool
    is_archived: bool
    settings: dict
    version: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class AppCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=128, pattern=r"^[a-z0-9][a-z0-9\-_]*$")
    name: str = Field(min_length=2, max_length=256)
    description: str | None = None
    icon: str | None = Field(default=None, max_length=64)
    color: str | None = Field(default=None, max_length=32)
    settings: dict = Field(default_factory=dict)


class AppUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=256)
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    settings: dict | None = None


class AppMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: str = Field(pattern=r"^(owner|admin|editor|viewer)$")


class LockInfo(BaseModel):
    user_id: str
    holder_name: str
    acquired_at: datetime
