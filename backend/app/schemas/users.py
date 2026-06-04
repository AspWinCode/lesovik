import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RoleRead(BaseModel):
    id: str
    display_name: str

    model_config = {"from_attributes": True}


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    is_active: bool
    is_superuser: bool
    totp_enabled: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
    roles: list[RoleRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_roles(cls, user: object) -> "UserRead":
        obj = cls.model_validate(user)
        # roles already loaded via selectin relationship
        return obj


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=256)
    password: str = Field(min_length=10, max_length=128)
    roles: list[str] = Field(default_factory=list)


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=256)
    is_active: bool | None = None
    roles: list[str] | None = None


class UserListParams(BaseModel):
    cursor: str | None = None
    limit: int = Field(default=50, ge=1, le=200)
    search: str | None = None
    role: str | None = None
    is_active: bool | None = None
