import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ModuleVersionRead(BaseModel):
    id: uuid.UUID
    version: str
    manifest: dict
    changelog: str | None
    is_current: bool
    released_at: datetime
    model_config = {"from_attributes": True}


class ModuleRead(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str | None
    category: str | None
    icon: str | None
    color: str | None
    is_base: bool
    is_active: bool
    current_version: str | None = None
    dependencies: list[str] = Field(default_factory=list)
    installed: bool = False
    installed_version: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class AppModuleRead(BaseModel):
    app_id: uuid.UUID
    module_id: uuid.UUID
    module_code: str
    module_name: str
    version: str
    status: str
    installed_at: datetime
    installed_by: uuid.UUID | None


class ModuleInstallResult(BaseModel):
    module: ModuleRead
    installed_dependencies: list[str] = Field(default_factory=list)
    entities_created: int = 0
    fields_created: int = 0
    pages_created: int = 0
