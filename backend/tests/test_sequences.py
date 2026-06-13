"""Tests for SequenceService and /sequences endpoint."""
import uuid
import pytest
from httpx import AsyncClient


# ── helpers ──────────────────────────────────────────────────────────────────

def _app_url(app_id: str) -> str:
    return f"/api/v1/apps/{app_id}"


def _seq_url(app_id: str, entity_id: str) -> str:
    return f"/api/v1/apps/{app_id}/entities/{entity_id}/sequences"


# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
async def app_and_entity(client: AsyncClient, admin_token: str):
    """Create a throwaway app + entity and return (app_id, entity_id)."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    slug = f"seq-test-{uuid.uuid4().hex[:8]}"
    app_r = await client.post(
        "/api/v1/apps/",
        json={"name": "Seq Test App", "slug": slug, "description": ""},
        headers=headers,
    )
    assert app_r.status_code == 201, app_r.text
    app_id = app_r.json()["id"]

    ent_r = await client.post(
        f"/api/v1/apps/{app_id}/entities/",
        json={"name": "orders", "display_name": "Orders", "description": ""},
        headers=headers,
    )
    assert ent_r.status_code == 201, ent_r.text
    entity_id = ent_r.json()["id"]

    # Add an autonumber field
    await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/fields/",
        json={"name": "order_no", "display_name": "Order #", "field_type": "autonumber", "is_required": False},
        headers=headers,
    )

    return app_id, entity_id, headers


# ── CRUD tests ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_sequence(client: AsyncClient, app_and_entity):
    app_id, entity_id, headers = app_and_entity
    url = _seq_url(app_id, entity_id)

    r = await client.post(
        url,
        json={"field_name": "order_no", "prefix": "ORD-", "padding": 5, "step": 1},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["prefix"] == "ORD-"
    assert data["padding"] == 5
    assert data["next_value"] == 1


@pytest.mark.asyncio
async def test_list_sequences(client: AsyncClient, app_and_entity):
    app_id, entity_id, headers = app_and_entity
    url = _seq_url(app_id, entity_id)

    await client.post(url, json={"field_name": "order_no", "prefix": "X-"}, headers=headers)
    r = await client.get(url, headers=headers)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 1


@pytest.mark.asyncio
async def test_update_sequence(client: AsyncClient, app_and_entity):
    app_id, entity_id, headers = app_and_entity
    url = _seq_url(app_id, entity_id)

    create_r = await client.post(url, json={"field_name": "order_no", "prefix": "A-"}, headers=headers)
    seq_id = create_r.json()["id"]

    patch_r = await client.patch(
        f"{url}/{seq_id}",
        json={"prefix": "B-", "padding": 3},
        headers=headers,
    )
    assert patch_r.status_code == 200, patch_r.text
    assert patch_r.json()["prefix"] == "B-"
    assert patch_r.json()["padding"] == 3


@pytest.mark.asyncio
async def test_next_value_increments(client: AsyncClient, app_and_entity):
    app_id, entity_id, headers = app_and_entity
    url = _seq_url(app_id, entity_id)

    create_r = await client.post(
        url,
        json={"field_name": "order_no", "prefix": "ORD-", "padding": 4, "step": 1},
        headers=headers,
    )
    seq_id = create_r.json()["id"]

    r1 = await client.post(f"{url}/{seq_id}/next", headers=headers)
    r2 = await client.post(f"{url}/{seq_id}/next", headers=headers)

    assert r1.status_code == 200, r1.text
    assert r2.status_code == 200, r2.text
    assert r1.json()["value"] == "ORD-0001"
    assert r2.json()["value"] == "ORD-0002"


@pytest.mark.asyncio
async def test_next_value_step(client: AsyncClient, app_and_entity):
    app_id, entity_id, headers = app_and_entity
    url = _seq_url(app_id, entity_id)

    create_r = await client.post(
        url,
        json={"field_name": "order_no", "prefix": "S", "padding": 0, "step": 10},
        headers=headers,
    )
    seq_id = create_r.json()["id"]

    r1 = await client.post(f"{url}/{seq_id}/next", headers=headers)
    r2 = await client.post(f"{url}/{seq_id}/next", headers=headers)
    assert r1.json()["value"] == "S1"
    assert r2.json()["value"] == "S11"


@pytest.mark.asyncio
async def test_delete_sequence(client: AsyncClient, app_and_entity):
    app_id, entity_id, headers = app_and_entity
    url = _seq_url(app_id, entity_id)

    create_r = await client.post(url, json={"field_name": "order_no"}, headers=headers)
    seq_id = create_r.json()["id"]

    del_r = await client.delete(f"{url}/{seq_id}", headers=headers)
    assert del_r.status_code == 204, del_r.text

    get_r = await client.get(f"{url}/{seq_id}", headers=headers)
    assert get_r.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_field_name_rejected(client: AsyncClient, app_and_entity):
    app_id, entity_id, headers = app_and_entity
    url = _seq_url(app_id, entity_id)

    await client.post(url, json={"field_name": "order_no"}, headers=headers)
    r2 = await client.post(url, json={"field_name": "order_no"}, headers=headers)
    assert r2.status_code == 409, r2.text
