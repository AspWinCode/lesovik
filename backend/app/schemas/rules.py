"""Rule schemas + typed AST validation."""
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


# ------------------------------------------------------------------
# Trigger
# ------------------------------------------------------------------

class TriggerEvent(str, Enum):
    RECORD_CREATED = "record.created"
    RECORD_UPDATED = "record.updated"
    RECORD_DELETED = "record.deleted"
    FIELD_CHANGED  = "field.changed"


class RuleTrigger(BaseModel):
    event: TriggerEvent
    watch_fields: list[str] = Field(
        default_factory=list,
        description="For field.changed: only fire if these fields were modified",
    )


# ------------------------------------------------------------------
# Condition AST
# ------------------------------------------------------------------

class CompareOp(str, Enum):
    EQ          = "eq"
    NE          = "ne"
    GT          = "gt"
    GTE         = "gte"
    LT          = "lt"
    LTE         = "lte"
    CONTAINS    = "contains"
    ICONTAINS   = "icontains"
    IN          = "in"
    NIN         = "nin"
    IS_NULL     = "is_null"
    IS_NOT_NULL = "is_not_null"
    STARTS_WITH = "starts_with"
    ENDS_WITH   = "ends_with"


class CompareCondition(BaseModel):
    type: Literal["compare"]
    field: str
    op: CompareOp
    value: Any = None


class LogicalCondition(BaseModel):
    type: Literal["and", "or", "not"]
    children: list["ConditionNode"] = Field(default_factory=list)


ConditionNode = CompareCondition | LogicalCondition
LogicalCondition.model_rebuild()


# ------------------------------------------------------------------
# Expression AST
# ------------------------------------------------------------------

class LiteralExpr(BaseModel):
    type: Literal["literal"]
    value: Any


class FieldRefExpr(BaseModel):
    type: Literal["field_ref"]
    field: str


class MathOp(str, Enum):
    ADD      = "add"
    SUBTRACT = "subtract"
    MULTIPLY = "multiply"
    DIVIDE   = "divide"
    MODULO   = "modulo"
    POWER    = "power"


class MathExpr(BaseModel):
    type: Literal["math"]
    op: MathOp
    left: "ExprNode"
    right: "ExprNode"


class FuncExpr(BaseModel):
    type: Literal["func"]
    name: str
    args: list["ExprNode"] = Field(default_factory=list)


ExprNode = LiteralExpr | FieldRefExpr | MathExpr | FuncExpr
MathExpr.model_rebuild()
FuncExpr.model_rebuild()


# ------------------------------------------------------------------
# Action AST
# ------------------------------------------------------------------

class SetFieldAction(BaseModel):
    type: Literal["set_field"]
    field: str
    value: Any  # ExprNode or literal


class CreateRecordAction(BaseModel):
    type: Literal["create_record"]
    entity_id: uuid.UUID
    payload: dict[str, Any] = Field(default_factory=dict)


class UpdateRecordAction(BaseModel):
    type: Literal["update_record"]
    record_id_field: str = "id"
    payload: dict[str, Any] = Field(default_factory=dict)


class DeleteRecordAction(BaseModel):
    type: Literal["delete_record"]
    record_id_field: str = "id"


class SendNotificationAction(BaseModel):
    type: Literal["send_notification"]
    to_field: str | None = None
    to: str | None = None
    subject: str = ""
    template: str = ""


class CallWebhookAction(BaseModel):
    type: Literal["call_webhook"]
    url: str
    method: str = "POST"
    payload: dict[str, Any] = Field(default_factory=dict)


class StopAction(BaseModel):
    type: Literal["stop"]


ActionNode = (
    SetFieldAction
    | CreateRecordAction
    | UpdateRecordAction
    | DeleteRecordAction
    | SendNotificationAction
    | CallWebhookAction
    | StopAction
)


# ------------------------------------------------------------------
# Rule schemas
# ------------------------------------------------------------------

class RuleRead(BaseModel):
    id: uuid.UUID
    app_id: uuid.UUID
    entity_id: uuid.UUID
    name: str
    description: str | None
    is_active: bool
    trigger: dict[str, Any]
    conditions: dict[str, Any]
    actions: list[dict[str, Any]]
    priority: int
    version: int
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class RuleCreate(BaseModel):
    entity_id: uuid.UUID
    name: str = Field(min_length=2, max_length=256)
    description: str | None = None
    trigger: RuleTrigger
    conditions: dict[str, Any] = Field(default_factory=dict)
    actions: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    priority: int = Field(default=100, ge=1, le=9999)

    @model_validator(mode="after")
    def validate_ast(self) -> "RuleCreate":
        # Validate conditions structure
        if self.conditions:
            _validate_condition_node(self.conditions)
        # Validate actions structure
        for action in self.actions:
            _validate_action_node(action)
        return self


class RuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=256)
    description: str | None = None
    trigger: RuleTrigger | None = None
    conditions: dict[str, Any] | None = None
    actions: list[dict[str, Any]] | None = None
    priority: int | None = Field(default=None, ge=1, le=9999)
    is_active: bool | None = None


class RuleTestRequest(BaseModel):
    """Dry-run a rule against a sample record payload without persisting changes."""
    record_payload: dict[str, Any]
    event: str = "record.updated"
    changed_fields: list[str] = Field(default_factory=list)


class RuleTestResponse(BaseModel):
    matched: bool
    field_mutations: dict[str, Any]
    records_to_create: list[dict[str, Any]]
    notifications: list[dict[str, Any]]
    webhooks: list[dict[str, Any]]
    errors: list[str]


class RuleExecutionLogRead(BaseModel):
    id: uuid.UUID
    rule_id: uuid.UUID
    record_id: uuid.UUID | None
    event: str
    status: str
    duration_ms: int | None
    error: str | None
    output_snapshot: dict[str, Any] | None
    executed_at: datetime
    model_config = {"from_attributes": True}


class CycleCheckResponse(BaseModel):
    has_cycles: bool
    cycles: list[list[str]]  # list of rule_id lists that form cycles


# ------------------------------------------------------------------
# AST validation helpers (lightweight, not full type-checking)
# ------------------------------------------------------------------

_VALID_CONDITION_TYPES = {"and", "or", "not", "compare"}
_VALID_ACTION_TYPES = {
    "set_field", "create_record", "update_record", "delete_record",
    "send_notification", "call_webhook", "stop",
}


def _validate_condition_node(node: Any, depth: int = 0) -> None:
    if depth > 20:
        raise ValueError("Condition tree too deep (max 20)")
    if not isinstance(node, dict):
        raise ValueError("Condition node must be a dict")
    t = node.get("type")
    if t not in _VALID_CONDITION_TYPES:
        raise ValueError(f"Invalid condition type: {t!r}")
    for child in node.get("children", []):
        _validate_condition_node(child, depth + 1)


def _validate_action_node(node: Any) -> None:
    if not isinstance(node, dict):
        raise ValueError("Action node must be a dict")
    t = node.get("type")
    if t not in _VALID_ACTION_TYPES:
        raise ValueError(f"Invalid action type: {t!r}")
