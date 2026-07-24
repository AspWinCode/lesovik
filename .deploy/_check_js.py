import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "155.212.164.251"
KEY  = r"C:\Users\direc\.ssh\vps_key"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username="root", key_filename=KEY, timeout=30)

# Find JS files in the frontend container
_, out, _ = cli.exec_command('docker exec lesovik-frontend find /usr/share/nginx/html -name "*.js" | head -20', timeout=30)
print("=== JS files in container ===")
print(out.read().decode(errors="replace"))

# Check the runtime JS for "lookup"
_, out, _ = cli.exec_command('docker exec lesovik-frontend sh -c "grep -l lookup /usr/share/nginx/html/*/assets/*.js 2>/dev/null || echo none"', timeout=30)
print("=== Files with lookup ===")
print(out.read().decode(errors="replace"))

# Check which JS file is the runtime bundle (by size)
_, out, _ = cli.exec_command('docker exec lesovik-frontend sh -c "ls -lh /usr/share/nginx/html/*/assets/*.js 2>/dev/null"', timeout=30)
print("=== JS file sizes ===")
print(out.read().decode(errors="replace"))

cli.close()
