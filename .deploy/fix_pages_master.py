"""Add missing pages and remove duplicate entities for Выездной мастер."""
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
        print(f"  ERROR {e.code} {method} {path}: {e.read().decode()[:200]}", file=sys.stderr)
        raise

tok = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD, "totp_code": None})
token = tok["access_token"]
print("Logged in OK")

apps = req("GET", "/apps", token=token)
app = next(a for a in apps["items"] if "Выезд" in a["name"] or "master" in a["name"].lower())
app_id = app["id"]
print(f"App: {app['name']} ({app_id})")

entities = {e["slug"]: e for e in req("GET", f"/apps/{app_id}/entities", token=token)}
pages    = {p["title"]: p for p in req("GET", f"/apps/{app_id}/pages", token=token)}
print("Existing pages:", list(pages.keys()))

kl  = entities["klienty"]["id"]
zak = entities["zakazy"]["id"]
tov = entities["tovary_uslugi"]["id"]
poz = entities["pozicii_zakaza"]["id"]

def add_page(slug, title, nav_order, entity_id, view_type, blocks):
    if title in pages:
        print(f"  ~ page '{title}' already exists")
        return
    try:
        req("POST", f"/apps/{app_id}/pages", {
            "slug": slug, "title": title, "nav_order": nav_order,
            "layout": {"entity_id": entity_id, "view_type": view_type},
            "blocks": blocks,
        }, token=token)
        print(f"  + page '{title}'")
    except urllib.error.HTTPError:
        print(f"  ~ page '{title}' skipped")

# Page: Create order (main workflow for master)
add_page("sozdat-zakaz", "Создать заказ", 1, zak, "form", [
    {"id":"b-lookup","type":"lookup","title":"Клиент","config":{"label":"Выбрать клиента","entity_id":kl,"display_field":"fio","multiple":False}},
    {"id":"b-div1","type":"divider","title":None,"config":{}},
    {"id":"b-new","type":"toggle","title":"Новый клиент","config":{"label":"Новый клиент (создать)","default_value":False}},
    {"id":"b-fio","type":"text_field","title":"ФИО","config":{"label":"ФИО нового клиента","placeholder":"Иванов Иван Иванович","required":False}},
    {"id":"b-tel","type":"text_field","title":"Телефон","config":{"label":"Телефон","placeholder":"+7 (___) ___-__-__","required":False}},
    {"id":"b-disc","type":"toggle","title":"Скидка","config":{"label":"Скидка новому клиенту","default_value":False}},
    {"id":"b-discpct","type":"number_field","title":"Скидка %","config":{"label":"Скидка %","format":"number","min":"0","max":"100","unit":"%","required":False}},
    {"id":"b-adres","type":"text_field","title":"Адрес","config":{"label":"Адрес объекта","placeholder":"ул. Примерная, д.1, кв.5","required":False}},
    {"id":"b-div2","type":"divider","title":None,"config":{}},
    {"id":"b-tbl","type":"table","title":"Позиции заказа","config":{"entity_id":poz,"label":"Позиции заказа"}},
    {"id":"b-tot","type":"metric","title":"Итого","config":{"label":"Итого (руб.)","value":"0","width":"third"}},
    {"id":"b-save","type":"button","title":"Сохранить","config":{"label":"Сохранить заказ","width":"half","actionType":"url","href":""}},
])

# Page: Catalog
add_page("katalog", "Каталог", 10, tov, "table", [
    {"id":"b-cat","type":"table","title":"Товары и услуги","config":{"entity_id":tov,"label":"Каталог"}},
])

print("Done.")
'''

SCRIPT = os.path.join(os.path.dirname(__file__), "_fix_pages_inner.py")
with open(SCRIPT, "w", encoding="utf-8") as f:
    f.write(inner)

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = cli.open_sftp()
sftp.put(SCRIPT, "/tmp/_fix_pages_inner.py")
sftp.close()
print("Uploaded.")
cmd = ("docker cp /tmp/_fix_pages_inner.py lesovik-backend:/tmp/_fix_pages_inner.py && "
       "docker exec lesovik-backend python /tmp/_fix_pages_inner.py")
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
