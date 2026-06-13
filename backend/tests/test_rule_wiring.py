"""
Rules Engine wiring tests.

Verifies that POST/PATCH /records dispatch rule evaluation to the sandbox queue.
Celery `apply_async` is mocked so no actual worker or Redis is required.
"""
from __future__ import annotations

import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.identity import Role, User, UserRole
from app.services.rules import RuleService


# ------------------------------------------------------------------
# Shared fixtures
# ------------------------------------------------------------------


@pytest.fixture()
async def builder(db_session: AsyncSession) -> User:
    for role_id in ("app_builder",):
        if not await db_session.get(Role, role_id):
            db_session.add(Role(id=role_id, display_name="App Builder", is_system=True))
    user = User(
        email="wiring_builder@example.com",
        display_name="Wiring Builder",
        password_hash=hash_password("Build1234!"),
    )
    db_session.add(user)
    await db_session.flush()
    db_session.add(UserRole(user_id=user.id, role_id="app_builder"))
    await db_session.flush()
    return user


async def _login(client: AsyncClient, email: str, pwd: str) -> str:
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


async def _setup_entity(client: AsyncClient, token: str) -> tuple[str, str]:
    slug = f"wire-app-{uuid.uuid4().hex[:6]}"
    app = await client.post(
        "/api/v1/apps", json={"slug": slug, "name": "Wiring Test App"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert app.status_code == 201, app.text
    app_id = app.json()["id"]

    entity = await client.post(
        f"/api/v1/apps/{app_id}/entities",
        json={"slug": "orders", "display_name": "Orders"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert entity.status_code == 201, entity.text
    return app_id, entity.json()["id"]


def _rule_payload(entity_id: str, trigger_event: str = "record.created") -> dict[str, Any]:
    return {
        "entity_id": entity_id,
        "name": f"Auto-flag on {trigger_event}",
        "trigger": {"event": trigger_event, "watch_fields": []},
        "conditions": {},
        "actions": [
            {"type": "set_field", "field": "flagged", "value": {"type": "literal", "value": True}},
        ],
        "priority": 10,
    }


# ------------------------------------------------------------------
# Unit: evaluate_rules_for_event dispatches Celery tasks
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_evaluate_rules_dispatches_to_sandbox(db_session: AsyncSession) -> None:
    """Active rules cause apply_async to be called once per rule."""
    app_id = uuid.uuid4()
    entity_id = uuid.uuid4()
    record_id = uuid.uuid4()
    payload = {"amount": 100}

    mock_task = MagicMock()
    mock_task.id = "mock-task-id"

    with patch(
        "app.worker.tasks.sandbox.execute_rule.apply_async",
        return_value=mock_task,
    ) as mock_apply:
        # No active rules — should return empty list
        svc = RuleService(db_session)
        task_ids = await svc.evaluate_rules_for_event(
            app_id, entity_id, record_id, payload, "record.created"
        )
        assert task_ids == []
        mock_apply.assert_not_called()


@pytest.mark.asyncio
async def test_evaluate_rules_context_includes_record_id(db_session: AsyncSession) -> None:
    """Context passed to Celery includes record_id so sandbox can update the right row."""
    from app.models.logic import Rule

    app_id = uuid.uuid4()
    entity_id = uuid.uuid4()
    record_id = uuid.uuid4()
    payload = {"status": "pending"}

    # Insert an active rule directly
    rule = Rule(
        app_id=app_id,
        entity_id=entity_id,
        name="Test wiring rule",
        trigger={"event": "record.created", "watch_fields": []},
        conditions={},
        actions=[{"type": "set_field", "field": "x", "value": {"type": "literal", "value": 1}}],
        priority=1,
        is_active=True,
    )
    db_session.add(rule)
    await db_session.flush()

    mock_task = MagicMock()
    mock_task.id = "mock-task-id"

    with patch(
        "app.worker.tasks.sandbox.execute_rule.apply_async",
        return_value=mock_task,
    ) as mock_apply:
        svc = RuleService(db_session)
        task_ids = await svc.evaluate_rules_for_event(
            app_id, entity_id, record_id, payload, "record.created"
        )
        assert len(task_ids) == 1
        called_kwargs = mock_apply.call_args.kwargs["kwargs"]
        assert called_kwargs["context"]["record_id"] == str(record_id)
        assert called_kwargs["context"]["entity_id"] == str(entity_id)
        assert called_kwargs["context"]["app_id"] == str(app_id)
        assert called_kwargs["context"]["event"] == "record.created"
        assert called_kwargs["context"]["record"] == payload


# ------------------------------------------------------------------
# Integration: POST /records calls evaluate_rules_for_event
# ------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_record_triggers_rule_evaluation(
    client: AsyncClient, builder: User
) -> None:
    """POST /records should call evaluate_rules_for_event (mocked — no Celery needed)."""
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    # Create and activate a rule
    rule_resp = await client.post(
        f"/api/v1/apps/{app_id}/rules",
        json=_rule_payload(entity_id, "record.created"),
        headers=headers,
    )
    assert rule_resp.status_code == 201
    rule_id = rule_resp.json()["id"]
    await client.post(f"/api/v1/apps/{app_id}/rules/{rule_id}/activate", headers=headers)

    mock_task = MagicMock()
    mock_task.id = "mock-task-123"

    with patch(
        "app.worker.tasks.sandbox.execute_rule.apply_async",
        return_value=mock_task,
    ) as mock_apply:
        resp = await client.post(
            f"/api/v1/apps/{app_id}/entities/{entity_id}/records",
            json={"payload": {"note": "hello"}},
            headers=headers,
        )
        assert resp.status_code == 201, resp.text
        # evaluate_rules_for_event was called → apply_async was invoked
        assert mock_apply.call_count == 1
        called_context = mock_apply.call_args.kwargs["kwargs"]["context"]
        assert called_context["event"] == "record.created"
        assert called_context["record_id"]  # not empty


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_record_triggers_rule_evaluation(
    client: AsyncClient, builder: User
) -> None:
    """PATCH /records should call evaluate_rules_for_event with changed_fields."""
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    rule_resp = await client.post(
        f"/api/v1/apps/{app_id}/rules",
        json=_rule_payload(entity_id, "record.updated"),
        headers=headers,
    )
    rule_id = rule_resp.json()["id"]
    await client.post(f"/api/v1/apps/{app_id}/rules/{rule_id}/activate", headers=headers)

    # Create a record first
    rec_resp = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records",
        json={"payload": {"note": "original"}},
        headers=headers,
    )
    record_id = rec_resp.json()["id"]

    mock_task = MagicMock()
    mock_task.id = "mock-task-456"

    with patch(
        "app.worker.tasks.sandbox.execute_rule.apply_async",
        return_value=mock_task,
    ) as mock_apply:
        patch_resp = await client.patch(
            f"/api/v1/apps/{app_id}/entities/{entity_id}/records/{record_id}",
            json={"payload": {"note": "updated"}},
            headers=headers,
        )
        assert patch_resp.status_code == 200, patch_resp.text
        assert mock_apply.call_count == 1
        ctx = mock_apply.call_args.kwargs["kwargs"]["context"]
        assert ctx["event"] == "record.updated"
        assert "note" in ctx["changed_fields"]
        assert ctx["record_id"] == record_id
