"""User CRUD endpoint tests."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.identity import Role, User, UserRole


@pytest.fixture()
async def admin_user(db_session: AsyncSession) -> User:
    role = Role(id="platform_admin", display_name="Platform Admin", is_system=True)
    db_session.add(role)
    user = User(
        email="admin@test.local",
        display_name="Admin",
        password_hash=hash_password("AdminPass1!"),
        is_superuser=True,
    )
    db_session.add(user)
    await db_session.flush()
    db_session.add(UserRole(user_id=user.id, role_id="platform_admin"))
    await db_session.flush()
    return user


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    return resp.json()["access_token"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_user_as_admin(client: AsyncClient, admin_user: User) -> None:
    token = await _login(client, admin_user.email, "AdminPass1!")
    resp = await client.post(
        "/api/v1/users",
        json={"email": "newuser@test.local", "display_name": "New User", "password": "NewPass12345!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newuser@test.local"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_user_duplicate_email(client: AsyncClient, admin_user: User) -> None:
    token = await _login(client, admin_user.email, "AdminPass1!")
    payload = {"email": "dup@test.local", "display_name": "Dup", "password": "DupPass12345!"}

    await client.post("/api/v1/users", json=payload, headers={"Authorization": f"Bearer {token}"})
    resp = await client.post("/api/v1/users", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 409


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_user_forbidden_for_non_admin(client: AsyncClient, db_session: AsyncSession) -> None:
    regular = User(
        email="regular@test.local",
        display_name="Regular",
        password_hash=hash_password("Regular12!"),
    )
    db_session.add(regular)
    await db_session.flush()

    token = await _login(client, "regular@test.local", "Regular12!")
    resp = await client.post(
        "/api/v1/users",
        json={"email": "x@test.local", "display_name": "X", "password": "Xxxx12345!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_users_requires_admin_or_auditor(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user = User(
        email="viewer@test.local",
        display_name="Viewer",
        password_hash=hash_password("Viewer123!"),
    )
    db_session.add(user)
    await db_session.flush()

    token = await _login(client, "viewer@test.local", "Viewer123!")
    resp = await client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
