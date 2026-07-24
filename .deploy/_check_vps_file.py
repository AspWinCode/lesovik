import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "155.212.164.251"
KEY  = r"C:\Users\direc\.ssh\vps_key"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username="root", key_filename=KEY, timeout=30)

# Check git log on VPS
_, out, _ = cli.exec_command("cd /opt/lesovik/repo && git log --oneline -5", timeout=30)
print("=== VPS git log ===")
print(out.read().decode(errors="replace"))

# Check if "lookup" exists in RuntimeApp.tsx on VPS
_, out, _ = cli.exec_command("grep -n 'lookup\\|text_field\\|number_field' /opt/lesovik/repo/frontend/src/runtime/RuntimeApp.tsx | head -20", timeout=30)
print("=== RuntimeApp.tsx grep on VPS ===")
print(out.read().decode(errors="replace"))

# Check the built JS for "lookup"
_, out, _ = cli.exec_command("grep -o 'lookup\\|text_field\\|number_field\\|toggle' /usr/share/nginx/html/runtime/assets/*.js 2>/dev/null | head -5", timeout=30)
print("=== Built JS check ===")
print(out.read().decode(errors="replace"))

# Check built JS inside container
_, out, _ = cli.exec_command('docker exec lesovik-frontend sh -c "grep -o \'lookup\\|text_field\' /usr/share/nginx/html/app/assets/*.js 2>&1 | head -5"', timeout=30)
print("=== Container JS check ===")
print(out.read().decode(errors="replace"))

cli.close()
