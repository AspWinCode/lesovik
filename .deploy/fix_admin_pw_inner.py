
import os, asyncio
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

ctx = CryptContext(schemes=["bcrypt"])
new_hash = ctx.hash("Lesovik!Admin2026")
print("Hash generated:", new_hash[:20], "...")

DB_URL = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://")

async def main():
    engine = create_async_engine(DB_URL)
    async with engine.begin() as conn:
        result = await conn.execute(
            text('UPDATE identity."user" SET password_hash=:h WHERE email=:e RETURNING email'),
            {"h": new_hash, "e": "admin@lesovik.app"},
        )
        row = result.fetchone()
        print("Updated row:", row)
    await engine.dispose()

asyncio.run(main())
