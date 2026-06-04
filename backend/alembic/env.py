import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.base import Base  # noqa: F401 — imports all model subclasses

# Alembic Config
config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Async URL
_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://", 1)


def include_schema(schema_name: str | None) -> bool:
    """Only track our schemas; skip pg_catalog, information_schema, etc."""
    managed = {
        "public", "identity", "catalog", "metamodel",
        "ui", "logic", "data", "integration", "audit",
    }
    return schema_name in managed


def run_migrations_offline() -> None:
    context.configure(
        url=_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        include_object=lambda obj, name, type_, reflected, compare_to: (
            include_schema(obj.schema if hasattr(obj, "schema") else None)
        ),
        compare_type=True,
        compare_server_default=True,
        render_as_batch=False,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: object) -> None:
    context.configure(
        connection=connection,  # type: ignore[arg-type]
        target_metadata=target_metadata,
        include_schemas=True,
        include_object=lambda obj, name, type_, reflected, compare_to: (
            include_schema(obj.schema if hasattr(obj, "schema") else None)
        ),
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    engine = create_async_engine(_url, poolclass=pool.NullPool)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
