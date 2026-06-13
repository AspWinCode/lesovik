import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.main import app

# Disable rate limiting for the whole test session — the suite issues many
# logins/requests in quick succession that would otherwise trip the 20/min auth
# limit and fail with 429. Production behaviour is unaffected (conftest is
# pytest-only).
limiter.enabled = False

# Use a separate test DB URL (set TEST_DATABASE_URL in env)
import os

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://app_user:app_pass@localhost:5433/nocode_test",
)


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture()
async def test_engine():
    # Function-scoped on purpose: pytest-asyncio runs each test in its own event
    # loop, and an asyncpg engine/pool is bound to the loop it was created on. A
    # session-scoped engine would be created on the first test's loop and then
    # raise InterfaceError ("attached to a different loop") on every later test.
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    await engine.dispose()


@pytest.fixture()
async def db_session(test_engine) -> AsyncSession:
    factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with factory() as session:
        yield session
        await session.rollback()


@pytest.fixture()
async def client(db_session: AsyncSession) -> AsyncClient:
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()
