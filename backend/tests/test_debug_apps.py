"""Temporary debug test to inspect app creation response for tests 6-8."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.identity import Role, User, UserRole


@pytest.fixture()
async def builder_user(db_session: AsyncSession) -> User:
    for role_id in ("app_builder", "platform_admin"):
        existing = await db_session.get(Role, role_id)
        if not existing:
            db_session.add(Role(id=role_id, display_name=role_id.replace("_", " ").title(), is_system=True))

    user = User(
        email="builder@example.com",
        display_name="Builder",
        password_hash=hash_password("Builder1234!"),
    )
    db_session.add(user)
    await db_session.flush()
    db_session.add(UserRole(user_id=user.id, role_id="app_builder"))
    await db_session.flush()
    return user


@pytest.mark.integration
@pytest.mark.asyncio
async def test_debug_app_create_response(client: AsyncClient, builder_user: User) -> None:
    r = await client.post("/api/v1/auth/login", json={"email": builder_user.email, "password": "Builder1234!"})
    print(f"\nLOGIN: {r.status_code} {r.text}")
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    app = await client.post("/api/v1/apps", json={"slug": "field-app", "name": "F"}, headers=headers)
    print(f"\nAPP CREATE status={app.status_code}")
    print(f"APP CREATE body={app.text}")
