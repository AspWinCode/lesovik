"""Fix nav: hide 'позиции' from nav (mark system), make 'Создать заказ' first."""
import os, sys, paramiko, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HOST = "155.212.164.251"
USER = "root"
PASS = "Vjq_Ytdthjznysq_Gjhjkm1448"

inner = r'''
import json, sys, urllib.request, urllib.error

BASE = "http://localhost:8000/api/v1"
EMAIL = "admin@lesovik.app"
PASSWORD = "Lesovik!Admin2026"

def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code} {method} {path}: {e.read().decode()[:300]}", file=sys.stderr)
        raise

tok = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD, "totp_code": None})
token = tok["access_token"]
print("Logged in OK")

apps = req("GET", "/apps", token=token)
app = next(a for a in apps["items"] if "Выезд" in a["name"])
app_id = app["id"]

pages = req("GET", f"/apps/{app_id}/pages", token=token)

# Hide non-system 'позиции' page from nav by marking it as system
bad_pages = [p for p in pages
             if p["title"].lower() in ("позиции", "pozicii")
             and not (p.get("layout") or {}).get("is_system")]

for p in bad_pages:
    old_layout = p.get("layout") or {}
    new_layout = {**old_layout, "is_system": True, "system_type": "inline"}
    req("PATCH", f"/apps/{app_id}/pages/{p['id']}", {
        "blocks": [],
        "nav_order": 999,
        "layout": new_layout,
    }, token=token)
    print(f"Hidden from nav: {p['title']!r} ({p['id']})")

# Make 'Создать заказ' first
sozdat = next((p for p in pages if p["title"] == "Создать заказ"), None)
if sozdat:
    req("PATCH", f"/apps/{app_id}/pages/{sozdat['id']}", {"nav_order": 0}, token=token)
    print(f"nav_order=0 set for 'Создать заказ'")

# Fix nav order for other pages
order_map = {"Список заказов": 1, "Клиенты": 2, "Каталог": 3}
for p in pages:
    if p["title"] in order_map and p.get("nav_order") != order_map[p["title"]]:
        req("PATCH", f"/apps/{app_id}/pages/{p['id']}", {"nav_order": order_map[p["title"]]}, token=token)
        print(f"nav_order={order_map[p['title']]} for '{p['title']}'")

print("Done.")
'''

SCRIPT = os.path.join(os.path.dirname(__file__), "_fix_nav_order_inner.py")
with open(SCRIPT, "w", encoding="utf-8") as f:
    f.write(inner)

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = cli.open_sftp()
sftp.put(SCRIPT, "/tmp/_fix_nav_order_inner.py")
sftp.close()
print("Uploaded.")
cmd = ("docker cp /tmp/_fix_nav_order_inner.py lesovik-backend:/tmp/_fix_nav_order_inner.py && "
       "docker exec lesovik-backend python /tmp/_fix_nav_order_inner.py")
stdin, stdout, stderr = cli.exec_command(cmd, timeout=60)
out = stdout.read().decode(errors="replace")
err = stderr.read().decode(errors="replace")
code = stdout.channel.recv_exit_status()
sys.stdout.write(out)
if err.strip():
    sys.stderr.write("\n--- STDERR ---\n" + err)
print(f"--- EXIT {code} ---")
cli.close()
sys.exit(code)
