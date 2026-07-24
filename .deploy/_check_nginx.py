import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "155.212.164.251"
KEY  = r"C:\Users\direc\.ssh\vps_key"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username="root", key_filename=KEY, timeout=30)

# Check nginx config inside container
_, out, _ = cli.exec_command('docker exec lesovik-frontend cat /etc/nginx/conf.d/default.conf', timeout=30)
print("=== nginx config ===")
print(out.read().decode(errors="replace"))

# Check if old JS file exists anywhere
_, out, _ = cli.exec_command('find /opt/lesovik -name "index-DBctODC1.js" 2>/dev/null || echo "not found on host"', timeout=30)
print("=== Old JS file on host ===")
print(out.read().decode(errors="replace"))

# Check all HTML files in container that reference the runtime index
_, out, _ = cli.exec_command('docker exec lesovik-frontend cat /usr/share/nginx/html/runtime/index.html', timeout=30)
print("=== runtime/index.html ===")
print(out.read().decode(errors="replace"))

cli.close()
