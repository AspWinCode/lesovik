"""Record CRUD + filter engine integration tests."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.identity import Role, User, UserRole


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

@pytest.fixture()
async def builder(db_session: AsyncSession) -> User:
    for role_id in ("app_builder",):
        if not await db_session.get(Role, role_id):
            db_session.add(Role(id=role_id, display_name="App Builder", is_system=True))
    user = User(
        email="rec_builder@example.com",
        display_name="Builder",
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
    """Create an app + entity, return (app_id, entity_id)."""
    import uuid
    slug = f"rec-app-{uuid.uuid4().hex[:6]}"
    app = await client.post(
        "/api/v1/apps", json={"slug": slug, "name": "Record Test App"},
        headers={"Authorization": f"Bearer {token}"},
    )
    app_id = app.json()["id"]

    entity = await client.post(
        f"/api/v1/apps/{app_id}/entities",
        json={"slug": "invoice", "display_name": "Invoice"},
        headers={"Authorization": f"Bearer {token}"},
    )
    entity_id = entity.json()["id"]

    # Add a couple of custom fields
    for field in [
        {"name": "title", "display_name": "Title", "field_type": "text", "is_required": True},
        {"name": "amount", "display_name": "Amount", "field_type": "decimal"},
        {"name": "status", "display_name": "Status", "field_type": "select",
         "field_options": {"choices": [{"value": "draft"}, {"value": "paid"}]}},
    ]:
        await client.post(
            f"/api/v1/apps/{app_id}/entities/{entity_id}/fields",
            json=field,
            headers={"Authorization": f"Bearer {token}"},
        )

    return app_id, entity_id


# ------------------------------------------------------------------
# Record CRUD
# ------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_and_get_record(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records",
        json={"payload": {"title": "Invoice #1", "amount": 100.0, "status": "draft"}},
        headers=headers,
    )
    assert resp.status_code == 201
    rec = resp.json()
    assert rec["payload"]["title"] == "Invoice #1"
    assert rec["version"] == 1

    # GET
    get_resp = await client.get(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records/{rec['id']}",
        headers=headers,
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == rec["id"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_record_increments_version(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    create = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records",
        json={"payload": {"title": "Old title"}},
        headers=headers,
    )
    rec_id = create.json()["id"]

    update = await client.patch(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records/{rec_id}",
        json={"payload": {"title": "New title", "amount": 200.0}},
        headers=headers,
    )
    assert update.status_code == 200
    assert update.json()["version"] == 2
    assert update.json()["payload"]["title"] == "New title"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_soft_delete_hides_record(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    create = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records",
        json={"payload": {"title": "To delete"}},
        headers=headers,
    )
    rec_id = create.json()["id"]

    # Soft delete
    del_resp = await client.delete(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records/{rec_id}",
        headers=headers,
    )
    assert del_resp.status_code == 204

    # Should 404 on GET
    get_resp = await client.get(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records/{rec_id}",
        headers=headers,
    )
    assert get_resp.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_restore_deleted_record(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    create = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records",
        json={"payload": {"title": "Restorable"}},
        headers=headers,
    )
    rec_id = create.json()["id"]
    await client.delete(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records/{rec_id}", headers=headers
    )

    restore = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records/{rec_id}/restore",
        headers=headers,
    )
    assert restore.status_code == 200


# ------------------------------------------------------------------
# Filter engine
# ------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_eq(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/records"

    for title in ("Alpha", "Beta", "Gamma"):
        await client.post(base, json={"payload": {"title": title}}, headers=headers)

    resp = await client.get(f"{base}?filter=title:eq:Alpha", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["payload"]["title"] == "Alpha"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_icontains(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/records"

    for title in ("Invoice 001", "Invoice 002", "Receipt 001"):
        await client.post(base, json={"payload": {"title": title}}, headers=headers)

    resp = await client.get(f"{base}?filter=title:icontains:invoice", headers=headers)
    items = resp.json()["items"]
    assert len(items) == 2


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_gte_numeric(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/records"

    for amount in (10, 50, 100, 200):
        await client.post(
            base,
            json={"payload": {"title": f"Inv {amount}", "amount": amount}},
            headers=headers,
        )

    resp = await client.get(f"{base}?filter=amount:gte:100", headers=headers)
    items = resp.json()["items"]
    amounts = [i["payload"]["amount"] for i in items]
    assert all(float(a) >= 100 for a in amounts)
    assert len(items) == 2


@pytest.mark.integration
@pytest.mark.asyncio
async def test_required_field_validation(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    # 'title' is required; omitting it should fail
    resp = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records",
        json={"payload": {"amount": 99}},
        headers=headers,
    )
    assert resp.status_code == 422


@pytest.mark.integration
@pytest.mark.asyncio
async def test_unknown_field_validation(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/records",
        json={"payload": {"title": "Ok", "nonexistent_field": "x"}},
        headers=headers,
    )
    assert resp.status_code == 422


@pytest.mark.integration
@pytest.mark.asyncio
async def test_cursor_pagination(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/records"

    for i in range(7):
        await client.post(base, json={"payload": {"title": f"Record {i}"}}, headers=headers)

    page1 = await client.get(f"{base}?limit=4", headers=headers)
    assert page1.json()["has_more"] is True
    cursor = page1.json()["next_cursor"]

    page2 = await client.get(f"{base}?limit=4&cursor={cursor}", headers=headers)
    assert page2.status_code == 200
    assert len(page2.json()["items"]) == 3
    assert page2.json()["has_more"] is False
