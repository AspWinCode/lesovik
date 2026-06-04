"""
UI Builder tests — views, field configs, pages.

Unit: schema validators (slug pattern, field name uniqueness, widget types).
Integration: full CRUD for views + pages, set_default, field config bulk-replace,
             publish/unpublish, slug conflict.
"""
import uuid

import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.identity import Role, User, UserRole
from app.schemas.ui import (
    PageCreate,
    ViewCreate,
    ViewFieldConfigBulkUpdate,
    ViewFieldConfigItem,
    ViewType,
)


# ==================================================================
# Unit: schema validation
# ==================================================================

class TestPageCreateSchema:
    def test_valid_slug(self) -> None:
        p = PageCreate(slug="my-page-1", title="My Page")
        assert p.slug == "my-page-1"

    def test_invalid_slug_uppercase(self) -> None:
        with pytest.raises(ValidationError):
            PageCreate(slug="MyPage", title="T")

    def test_invalid_slug_spaces(self) -> None:
        with pytest.raises(ValidationError):
            PageCreate(slug="my page", title="T")

    def test_invalid_slug_underscores(self) -> None:
        with pytest.raises(ValidationError):
            PageCreate(slug="my_page", title="T")

    def test_blocks_max_50(self) -> None:
        blocks = [{"id": str(i), "type": "divider"} for i in range(51)]
        with pytest.raises(ValidationError):
            PageCreate(slug="s", title="T", blocks=blocks)

    def test_empty_title_invalid(self) -> None:
        with pytest.raises(ValidationError):
            PageCreate(slug="ok", title="")


class TestViewFieldConfigBulkUpdateSchema:
    def test_duplicate_field_names_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ViewFieldConfigBulkUpdate(fields=[
                ViewFieldConfigItem(field_name="email"),
                ViewFieldConfigItem(field_name="email"),
            ])

    def test_unique_field_names_accepted(self) -> None:
        body = ViewFieldConfigBulkUpdate(fields=[
            ViewFieldConfigItem(field_name="email"),
            ViewFieldConfigItem(field_name="name"),
        ])
        assert len(body.fields) == 2

    def test_width_bounds(self) -> None:
        with pytest.raises(ValidationError):
            ViewFieldConfigItem(field_name="x", width=10)   # below min 20

        with pytest.raises(ValidationError):
            ViewFieldConfigItem(field_name="x", width=3000)  # above max 2000

    def test_display_order_non_negative(self) -> None:
        with pytest.raises(ValidationError):
            ViewFieldConfigItem(field_name="x", display_order=-1)


class TestViewCreateSchema:
    def test_all_view_types_valid(self) -> None:
        for vt in ViewType:
            v = ViewCreate(name="Test", view_type=vt)
            assert v.view_type == vt

    def test_empty_name_invalid(self) -> None:
        with pytest.raises(ValidationError):
            ViewCreate(name="", view_type=ViewType.TABLE)


# ==================================================================
# Fixtures
# ==================================================================

@pytest.fixture()
async def builder(db_session: AsyncSession) -> User:
    for role_id in ("app_builder",):
        if not await db_session.get(Role, role_id):
            db_session.add(Role(id=role_id, display_name="App Builder", is_system=True))
    user = User(
        email=f"ui_builder_{uuid.uuid4().hex[:6]}@test.local",
        display_name="UI Builder",
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


async def _setup_app_entity(
    client: AsyncClient, token: str
) -> tuple[str, str]:
    slug = f"ui-app-{uuid.uuid4().hex[:6]}"
    app_resp = await client.post(
        "/api/v1/apps",
        json={"slug": slug, "name": "UI Test App"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert app_resp.status_code == 201, app_resp.text
    app_id = app_resp.json()["id"]

    ent_resp = await client.post(
        f"/api/v1/apps/{app_id}/entities",
        json={"slug": "order", "display_name": "Order"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ent_resp.status_code == 201, ent_resp.text
    return app_id, ent_resp.json()["id"]


# ==================================================================
# Integration: Views
# ==================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_view(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/views",
        json={"name": "All Orders", "view_type": "table"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "All Orders"
    assert data["view_type"] == "table"
    assert data["is_default"] is False
    assert data["is_public"] is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_views(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/views"

    await client.post(base, json={"name": "Table", "view_type": "table"}, headers=headers)
    await client.post(base, json={"name": "Form", "view_type": "form"}, headers=headers)
    await client.post(base, json={"name": "Kanban", "view_type": "kanban"}, headers=headers)

    all_resp = await client.get(base, headers=headers)
    assert all_resp.status_code == 200
    assert len(all_resp.json()) == 3

    filtered = await client.get(f"{base}?view_type=form", headers=headers)
    assert len(filtered.json()) == 1
    assert filtered.json()[0]["view_type"] == "form"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_view(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/views"

    view = (await client.post(
        base, json={"name": "Old Name", "view_type": "table"}, headers=headers
    )).json()

    resp = await client.patch(
        f"{base}/{view['id']}",
        json={"name": "New Name", "config": {"row_height": "compact"}},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
    assert resp.json()["config"]["row_height"] == "compact"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_view(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/views"

    view = (await client.post(
        base, json={"name": "Temp", "view_type": "gallery"}, headers=headers
    )).json()

    assert (await client.delete(f"{base}/{view['id']}", headers=headers)).status_code == 204
    assert (await client.get(f"{base}/{view['id']}", headers=headers)).status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_set_default_view(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/views"

    v1 = (await client.post(base, json={"name": "V1", "view_type": "table"}, headers=headers)).json()
    v2 = (await client.post(base, json={"name": "V2", "view_type": "table"}, headers=headers)).json()

    # Set v1 as default
    r1 = await client.post(f"{base}/{v1['id']}/set_default", headers=headers)
    assert r1.status_code == 200
    assert r1.json()["is_default"] is True

    # Set v2 as default — v1 should be cleared
    r2 = await client.post(f"{base}/{v2['id']}/set_default", headers=headers)
    assert r2.status_code == 200
    assert r2.json()["is_default"] is True

    # Verify v1 no longer default
    v1_check = (await client.get(f"{base}/{v1['id']}", headers=headers)).json()
    assert v1_check["is_default"] is False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_view_not_found(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/views/{uuid.uuid4()}",
        headers=headers,
    )
    assert resp.status_code == 404


# ==================================================================
# Integration: ViewFieldConfig bulk-replace
# ==================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_replace_field_configs(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/views"

    view = (await client.post(
        base, json={"name": "Table", "view_type": "table"}, headers=headers
    )).json()
    view_id = view["id"]

    # First replacement
    fields = [
        {"field_name": "name",  "is_visible": True,  "display_order": 0, "width": 200},
        {"field_name": "email", "is_visible": True,  "display_order": 1},
        {"field_name": "phone", "is_visible": False, "display_order": 2},
    ]
    r1 = await client.put(f"{base}/{view_id}/fields", json={"fields": fields}, headers=headers)
    assert r1.status_code == 200
    assert len(r1.json()) == 3

    # Full replacement — different set
    r2 = await client.put(
        f"{base}/{view_id}/fields",
        json={"fields": [{"field_name": "amount", "display_order": 0}]},
        headers=headers,
    )
    assert r2.status_code == 200
    assert len(r2.json()) == 1
    assert r2.json()[0]["field_name"] == "amount"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_field_configs_empty_replace(client: AsyncClient, builder: User) -> None:
    """Replacing with empty list clears all configs."""
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/views"

    view = (await client.post(
        base, json={"name": "V", "view_type": "table"}, headers=headers
    )).json()
    view_id = view["id"]

    await client.put(
        f"{base}/{view_id}/fields",
        json={"fields": [{"field_name": "name"}]},
        headers=headers,
    )
    r = await client.put(f"{base}/{view_id}/fields", json={"fields": []}, headers=headers)
    assert r.status_code == 200
    assert r.json() == []

    list_r = await client.get(f"{base}/{view_id}/fields", headers=headers)
    assert list_r.json() == []


@pytest.mark.integration
@pytest.mark.asyncio
async def test_field_config_widget_type(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/entities/{entity_id}/views"

    view = (await client.post(
        base, json={"name": "Form View", "view_type": "form"}, headers=headers
    )).json()
    view_id = view["id"]

    r = await client.put(
        f"{base}/{view_id}/fields",
        json={"fields": [
            {"field_name": "bio", "widget_type": "rich_text",
             "widget_config": {"toolbar": "full"}},
        ]},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()[0]["widget_type"] == "rich_text"
    assert r.json()[0]["widget_config"]["toolbar"] == "full"


# ==================================================================
# Integration: Pages
# ==================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_page(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, _ = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        f"/api/v1/apps/{app_id}/pages",
        json={"slug": "dashboard", "title": "Dashboard", "nav_order": 0},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["slug"] == "dashboard"
    assert data["title"] == "Dashboard"
    assert data["is_published"] is False
    assert data["published_at"] is None


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_page_slug_conflict(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, _ = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    body = {"slug": "home", "title": "Home"}

    r1 = await client.post(f"/api/v1/apps/{app_id}/pages", json=body, headers=headers)
    assert r1.status_code == 201

    r2 = await client.post(f"/api/v1/apps/{app_id}/pages", json=body, headers=headers)
    assert r2.status_code == 409


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_pages_ordered_by_nav_order(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, _ = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/pages"

    await client.post(base, json={"slug": "settings", "title": "Settings", "nav_order": 2}, headers=headers)
    await client.post(base, json={"slug": "home",     "title": "Home",     "nav_order": 0}, headers=headers)
    await client.post(base, json={"slug": "reports",  "title": "Reports",  "nav_order": 1}, headers=headers)

    resp = await client.get(base, headers=headers)
    assert resp.status_code == 200
    slugs = [p["slug"] for p in resp.json()]
    assert slugs == ["home", "reports", "settings"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_page(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, _ = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/pages"

    page = (await client.post(
        base, json={"slug": "tasks", "title": "Tasks"}, headers=headers
    )).json()

    resp = await client.patch(
        f"{base}/{page['id']}",
        json={"title": "My Tasks", "icon": "check-square", "nav_order": 5},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "My Tasks"
    assert resp.json()["icon"] == "check-square"
    assert resp.json()["nav_order"] == 5


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_page_blocks(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, entity_id = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/pages"

    # Create a view to reference in block
    view = (await client.post(
        f"/api/v1/apps/{app_id}/entities/{entity_id}/views",
        json={"name": "Orders Table", "view_type": "table"},
        headers=headers,
    )).json()

    page = (await client.post(
        base, json={"slug": "orders-page", "title": "Orders"}, headers=headers
    )).json()

    blocks = [
        {"id": "b1", "type": "rich_text", "content": "<h1>Orders</h1>"},
        {"id": "b2", "type": "view", "view_id": view["id"], "title": "All Orders"},
        {"id": "b3", "type": "divider"},
    ]
    resp = await client.patch(
        f"{base}/{page['id']}", json={"blocks": blocks}, headers=headers
    )
    assert resp.status_code == 200
    assert len(resp.json()["blocks"]) == 3


@pytest.mark.integration
@pytest.mark.asyncio
async def test_publish_unpublish_page(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, _ = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/pages"

    page = (await client.post(
        base, json={"slug": "pub-test", "title": "Pub Test"}, headers=headers
    )).json()
    page_id = page["id"]

    pub = await client.post(f"{base}/{page_id}/publish", headers=headers)
    assert pub.status_code == 200
    assert pub.json()["is_published"] is True
    assert pub.json()["published_at"] is not None

    unpub = await client.post(f"{base}/{page_id}/unpublish", headers=headers)
    assert unpub.status_code == 200
    assert unpub.json()["is_published"] is False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_page(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, _ = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    base = f"/api/v1/apps/{app_id}/pages"

    page = (await client.post(
        base, json={"slug": "delete-me", "title": "Delete Me"}, headers=headers
    )).json()

    assert (await client.delete(f"{base}/{page['id']}", headers=headers)).status_code == 204
    assert (await client.get(f"{base}/{page['id']}", headers=headers)).status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_page_not_found(client: AsyncClient, builder: User) -> None:
    token = await _login(client, builder.email, "Build1234!")
    app_id, _ = await _setup_app_entity(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get(
        f"/api/v1/apps/{app_id}/pages/{uuid.uuid4()}", headers=headers
    )
    assert resp.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_same_slug_different_apps_allowed(client: AsyncClient, builder: User) -> None:
    """Slug uniqueness is scoped to app — same slug in two different apps is fine."""
    token = await _login(client, builder.email, "Build1234!")
    headers = {"Authorization": f"Bearer {token}"}

    app1_id, _ = await _setup_app_entity(client, token)
    app2_id, _ = await _setup_app_entity(client, token)

    r1 = await client.post(
        f"/api/v1/apps/{app1_id}/pages", json={"slug": "home", "title": "H1"}, headers=headers
    )
    r2 = await client.post(
        f"/api/v1/apps/{app2_id}/pages", json={"slug": "home", "title": "H2"}, headers=headers
    )
    assert r1.status_code == 201
    assert r2.status_code == 201
