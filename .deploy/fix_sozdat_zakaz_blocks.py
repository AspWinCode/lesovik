"""Fix 'Создать заказ' page blocks: lookup field_name + pre_create for new client."""
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
print(f"App: {app['name']} ({app_id})")

pages = req("GET", f"/apps/{app_id}/pages", token=token)
page = next((p for p in pages if p["title"] == "Создать заказ"), None)
if not page:
    print("ERROR: page 'Создать заказ' not found!", file=sys.stderr)
    sys.exit(1)
print(f"Page: {page['title']} ({page['id']})")

entities_list = req("GET", f"/apps/{app_id}/entities", token=token)
entities = {e["slug"]: e for e in entities_list}
zak = entities["zakazy"]["id"]
kl  = entities["klienty"]["id"]

# Get pages for navigation after save
list_page = next((p for p in pages if p["title"] == "Список заказов"), None)
list_page_id = list_page["id"] if list_page else ""

blocks = page.get("blocks") or []
print(f"Current blocks ({len(blocks)}):", [b.get("id") for b in blocks])

# Update each block's config with field_name
field_name_map = {
    # IDs from seed_vyezdnoy_master.py (original)
    "b-adres":            "adres_obekta",
    "b-discount-pct":     "skidka_proc",
    "b-toggle-discount":  "skidka_primenena",
    "b-lookup-client":    "klient_id",
    "b-toggle-new":       "novyj_klient",
    "b-fio-new":          "fio_klienta",
    "b-phone-new":        "telefon_klienta",
    # IDs from fix_pages_master.py (may differ)
    "b-adres":            "adres_obekta",
    "b-disc":             "skidka_primenena",
    "b-discpct":          "skidka_proc",
    "b-lookup":           "klient_id",
    "b-new":              "novyj_klient",
    "b-fio":              "fio_klienta",
    "b-tel":              "telefon_klienta",
}

updated = 0
for b in blocks:
    bid = b.get("id", "")
    cfg = b.get("config") or {}

    # Add field_name where missing
    fn = field_name_map.get(bid)
    if fn and "field_name" not in cfg:
        cfg["field_name"] = fn
        b["config"] = cfg
        updated += 1
        print(f"  + field_name={fn!r} to block {bid!r}")

    # Fix save button
    if bid == "b-save":
        if cfg.get("actionType") != "save":
            cfg["actionType"] = "save"
            cfg["href"] = ""
            cfg["targetPageId"] = list_page_id
            b["config"] = cfg
            updated += 1
            print(f"  ~ button {bid!r}: actionType=save, targetPageId={list_page_id!r}")

    # Fix "Новый заказ" button on Список заказов
    if bid == "b-new-zakaz-btn":
        if cfg.get("actionType") == "url":
            sozdat_page = next((p for p in pages if p["title"] == "Создать заказ"), None)
            if sozdat_page:
                cfg["actionType"] = "page"
                cfg["targetPageId"] = sozdat_page["id"]
                cfg["href"] = ""
                b["config"] = cfg
                updated += 1
                print(f"  ~ button {bid!r}: actionType=page → Создать заказ")

if updated == 0:
    print("Nothing to update.")
else:
    result = req("PATCH", f"/apps/{app_id}/pages/{page['id']}", {
        "blocks": blocks,
    }, token=token)
    print(f"Saved page. {updated} block(s) updated.")

# Also fix "Новый заказ" button on Список заказов page
list_p = next((p for p in pages if p["title"] == "Список заказов"), None)
if list_p:
    lb = list_p.get("blocks") or []
    lu = 0
    sozdat_p = next((p for p in pages if p["title"] == "Создать заказ"), None)
    for b in lb:
        cfg = b.get("config") or {}
        if b.get("id") == "b-new-zakaz-btn" and cfg.get("actionType") != "page":
            cfg["actionType"] = "page"
            cfg["targetPageId"] = sozdat_p["id"] if sozdat_p else ""
            cfg["href"] = ""
            b["config"] = cfg
            lu += 1
            print(f"  ~ fixed 'Новый заказ' button → Создать заказ page")
    if lu:
        req("PATCH", f"/apps/{app_id}/pages/{list_p['id']}", {
            "blocks": lb,
        }, token=token)
        print("Saved Список заказов page.")

print("Done.")
'''

SCRIPT = os.path.join(os.path.dirname(__file__), "_fix_sozdat_zakaz_inner.py")
with open(SCRIPT, "w", encoding="utf-8") as f:
    f.write(inner)

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = cli.open_sftp()
sftp.put(SCRIPT, "/tmp/_fix_sozdat_zakaz_inner.py")
sftp.close()
print("Uploaded.")
cmd = ("docker cp /tmp/_fix_sozdat_zakaz_inner.py lesovik-backend:/tmp/_fix_sozdat_zakaz_inner.py && "
       "docker exec lesovik-backend python /tmp/_fix_sozdat_zakaz_inner.py")
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
