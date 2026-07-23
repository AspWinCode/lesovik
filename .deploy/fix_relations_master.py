"""Fix missing many_to_one relations by creating them as one_to_many from the other side."""
import os, sys, paramiko, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HOST = "155.212.164.251"
USER = "root"
PASS = "Vjq_Ytdthjznysq_Gjhjkm1448"

inner = '''
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
app = next(a for a in apps["items"] if a["name"] == "Vyezdnoy Master" or "Выездной" in a["name"])
app_id = app["id"]
print(f"App: {app_id}")

entities = {e["slug"]: e for e in req("GET", f"/apps/{app_id}/entities", token=token)}
existing_rels = {r["display_name"] for r in req("GET", f"/apps/{app_id}/relations", token=token)}
print("Existing relations:", existing_rels)

kl  = entities["klienty"]["id"]
zak = entities["zakazy"]["id"]
tov = entities["tovary_uslugi"]["id"]
poz = entities["pozicii_zakaza"]["id"]

def add_rel(from_id, to_id, rel_type, from_field, display_name):
    if display_name in existing_rels:
        print(f"  ~ {display_name} already exists")
        return
    try:
        req("POST", f"/apps/{app_id}/relations", {
            "from_entity_id": from_id,
            "to_entity_id": to_id,
            "relation_type": rel_type,
            "from_field_name": from_field,
            "display_name": display_name,
        }, token=token)
        print(f"  + {display_name}")
    except urllib.error.HTTPError:
        print(f"  ~ {display_name} skipped (error)")

# one_to_many FROM klienty TO zakazy  (one client → many orders)
add_rel(kl,  zak, "one_to_many", "zakazy_ref",  "Клиент → Заказы")
# one_to_many FROM zakazy TO pozicii  (one order → many lines)
add_rel(zak, poz, "one_to_many", "pozicii_ref", "Заказ → Позиции")
# one_to_many FROM tovary TO pozicii  (one product → many lines)
add_rel(tov, poz, "one_to_many", "pozicii_tov", "Товар → Позиции")

print("Done.")
'''

SCRIPT = os.path.join(os.path.dirname(__file__), "_fix_rels_inner.py")
with open(SCRIPT, "w", encoding="utf-8") as f:
    f.write(inner)

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = cli.open_sftp()
sftp.put(SCRIPT, "/tmp/_fix_rels_inner.py")
sftp.close()
print("Uploaded.")
cmd = ("docker cp /tmp/_fix_rels_inner.py lesovik-backend:/tmp/_fix_rels_inner.py && "
       "docker exec lesovik-backend python /tmp/_fix_rels_inner.py")
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
