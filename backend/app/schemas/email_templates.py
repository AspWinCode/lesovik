import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TemplateVariable(BaseModel):
    name: str
    type: str = "string"
    description: str | None = None
    example: str | None = None


class EmailTemplateRead(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str | None
    subject: str
    body_html: str
    body_text: str | None
    variables: list[dict[str, Any]]
    is_system: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class EmailTemplateCreate(BaseModel):
    code: str = Field(min_length=1, max_length=128, pattern=r"^[a-z0-9_]+$")
    name: str = Field(min_length=1, max_length=256)
    description: str | None = None
    subject: str = Field(min_length=1)
    body_html: str = Field(min_length=1)
    body_text: str | None = None
    variables: list[dict[str, Any]] = Field(default_factory=list)


class EmailTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=256)
    description: str | None = None
    subject: str | None = None
    body_html: str | None = None
    body_text: str | None = None
    variables: list[dict[str, Any]] | None = None


class EmailTemplatePreviewRequest(BaseModel):
    context: dict[str, Any] = Field(default_factory=dict)


class EmailTemplatePreviewResponse(BaseModel):
    subject: str
    body_html: str
    body_text: str | None
