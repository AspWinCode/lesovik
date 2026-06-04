"""Workflow Engine Pydantic schemas."""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ------------------------------------------------------------------
# WorkflowDef
# ------------------------------------------------------------------

class WorkflowDefRead(BaseModel):
    id: uuid.UUID
    app_id: uuid.UUID
    entity_id: uuid.UUID
    name: str
    description: str | None
    initial_state: str
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class WorkflowDefCreate(BaseModel):
    entity_id: uuid.UUID
    name: str = Field(min_length=2, max_length=256)
    description: str | None = None
    initial_state: str = Field(min_length=1, max_length=128)


class WorkflowDefUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=256)
    description: str | None = None
    initial_state: str | None = Field(default=None, min_length=1, max_length=128)


# ------------------------------------------------------------------
# StateDef
# ------------------------------------------------------------------

class StateDefRead(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    name: str
    display_name: str
    is_terminal: bool
    sla_seconds: int | None
    on_enter_actions: list[dict[str, Any]]
    on_exit_actions: list[dict[str, Any]]
    sla_breach_actions: list[dict[str, Any]]
    color: str | None
    model_config = {"from_attributes": True}


class StateDefCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128,
                      pattern=r"^[a-z0-9_]+$",
                      description="Machine name: lowercase, digits, underscores")
    display_name: str = Field(min_length=1, max_length=256)
    is_terminal: bool = False
    sla_seconds: int | None = Field(default=None, ge=1)
    on_enter_actions: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    on_exit_actions: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    sla_breach_actions: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    color: str | None = None


class StateDefUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    is_terminal: bool | None = None
    sla_seconds: int | None = Field(default=None, ge=1)
    on_enter_actions: list[dict[str, Any]] | None = None
    on_exit_actions: list[dict[str, Any]] | None = None
    sla_breach_actions: list[dict[str, Any]] | None = None
    color: str | None = None


# ------------------------------------------------------------------
# TransitionDef
# ------------------------------------------------------------------

class TransitionDefRead(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    name: str
    display_name: str
    from_state: str
    to_state: str
    guard_conditions: dict[str, Any]
    actions: list[dict[str, Any]]
    required_roles: list[str]
    model_config = {"from_attributes": True}


class TransitionDefCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128,
                      pattern=r"^[a-z0-9_]+$")
    display_name: str = Field(min_length=1, max_length=256)
    from_state: str = Field(min_length=1, max_length=128)
    to_state: str = Field(min_length=1, max_length=128)
    guard_conditions: dict[str, Any] = Field(default_factory=dict)
    actions: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    required_roles: list[str] = Field(default_factory=list)


class TransitionDefUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    from_state: str | None = Field(default=None, min_length=1, max_length=128)
    to_state: str | None = Field(default=None, min_length=1, max_length=128)
    guard_conditions: dict[str, Any] | None = None
    actions: list[dict[str, Any]] | None = None
    required_roles: list[str] | None = None


# ------------------------------------------------------------------
# WorkflowInstance
# ------------------------------------------------------------------

class WorkflowInstanceRead(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    app_id: uuid.UUID
    entity_id: uuid.UUID
    record_id: uuid.UUID
    current_state: str
    version: int
    sla_deadline: datetime | None
    started_at: datetime
    completed_at: datetime | None
    model_config = {"from_attributes": True}


class StartInstanceRequest(BaseModel):
    record_id: uuid.UUID
    record_payload: dict[str, Any] = Field(default_factory=dict)


# ------------------------------------------------------------------
# Transition execution
# ------------------------------------------------------------------

class TransitionRequest(BaseModel):
    """Execute a named transition on a workflow instance."""
    transition_name: str = Field(min_length=1, max_length=128)
    record_payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Current record payload used to evaluate guard conditions and actions",
    )


class TransitionResponse(BaseModel):
    instance: WorkflowInstanceRead
    field_mutations: dict[str, Any]
    notifications: list[dict[str, Any]]
    webhooks: list[dict[str, Any]]
    errors: list[str]


# ------------------------------------------------------------------
# TransitionLog
# ------------------------------------------------------------------

class TransitionLogRead(BaseModel):
    id: uuid.UUID
    instance_id: uuid.UUID
    from_state: str | None
    to_state: str
    transition_id: uuid.UUID | None
    actor_id: uuid.UUID | None
    executed_at: datetime
    duration_ms: int | None
    error: str | None
    model_config = {"from_attributes": True}


# ------------------------------------------------------------------
# Available transitions response
# ------------------------------------------------------------------

class AvailableTransitionRead(BaseModel):
    name: str
    display_name: str
    to_state: str
    requires_roles: list[str]
