"""Upload seed_vyezdnoy_master.py to server and run it inside the backend container."""
import io, os, sys, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HOST = "155.212.164.251"
USER = "root"
PASS = "Vjq_Ytdthjznysq_Gjhjkm1448"

script_path = os.path.join(os.path.dirname(__file__), "seed_vyezdnoy_master.py")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=30, banner_timeout=30, auth_timeout=30)

sftp = cli.open_sftp()
sftp.put(script_path, "/tmp/seed_vyezdnoy_master.py")
sftp.close()
print("Script uploaded.")

cmd = (
    "docker cp /tmp/seed_vyezdnoy_master.py lesovik-backend:/tmp/seed_vyezdnoy_master.py && "
    "docker exec lesovik-backend python /tmp/seed_vyezdnoy_master.py"
)
print(f"Running in container...\n")
stdin, stdout, stderr = cli.exec_command(cmd, timeout=120)
out = stdout.read().decode(errors="replace")
err = stderr.read().decode(errors="replace")
code = stdout.channel.recv_exit_status()
sys.stdout.write(out)
if err.strip():
    sys.stderr.write("\n--- STDERR ---\n" + err)
print(f"\n--- EXIT {code} ---")
cli.close()
sys.exit(code)
