"""Upload and run fix_admin_pw script inside the backend container."""
import os, sys, paramiko

HOST = "155.212.164.251"
USER = "root"
PASS = "Vjq_Ytdthjznysq_Gjhjkm1448"

SCRIPT = os.path.join(os.path.dirname(__file__), "fix_admin_pw_inner.py")

# write the inner script locally
inner = r"""
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
"""

with open(SCRIPT, "w") as f:
    f.write(inner)

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=30)

sftp = cli.open_sftp()
sftp.put(SCRIPT, "/tmp/fix_admin_pw_inner.py")
sftp.close()
print("Script uploaded.")

cmd = (
    "docker cp /tmp/fix_admin_pw_inner.py lesovik-backend:/tmp/fix_admin_pw_inner.py && "
    "docker exec lesovik-backend python /tmp/fix_admin_pw_inner.py"
)
stdin, stdout, stderr = cli.exec_command(cmd, timeout=60)
out = stdout.read().decode(errors="replace")
err = stderr.read().decode(errors="replace")
code = stdout.channel.recv_exit_status()
sys.stdout.write(out)
if err.strip():
    sys.stderr.write("\n--- STDERR ---\n" + err)
print(f"\n--- EXIT {code} ---")
cli.close()
sys.exit(code)
