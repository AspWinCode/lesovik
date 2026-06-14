"""Upload seed_bot_data.py to server and run it inside the backend container."""
import os, sys, paramiko

HOST = "155.212.164.251"
USER = "root"
PASS = "Vjq_Ytdthjznysq_Gjhjkm1448"

script_path = os.path.join(os.path.dirname(__file__), "seed_bot_data.py")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=30, banner_timeout=30, auth_timeout=30)

# Upload script via SFTP
sftp = cli.open_sftp()
sftp.put(script_path, "/tmp/seed_bot_data.py")
sftp.close()
print("Script uploaded to /tmp/seed_bot_data.py")

# Copy into container and run
cmd = "docker cp /tmp/seed_bot_data.py lesovik-backend:/tmp/seed_bot_data.py && docker exec lesovik-backend python /tmp/seed_bot_data.py"
print(f"Running: {cmd}\n")
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
