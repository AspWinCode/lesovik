
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
        print(f"  ERROR {e.code} {method} {path}: {e.read().decode()[:400]}", file=sys.stderr)
        raise

tok = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD, "totp_code": None})
token = tok["access_token"]
print("Logged in OK")

apps = req("GET", "/apps", token=token)
app = next(a for a in apps["items"] if "Выезд" in a["name"])
app_id = app["id"]
print(f"App: {app_id}")

# Find the klienty entity (the one with novyj_klient and zakazy_ref fields)
entities = req("GET", f"/apps/{app_id}/entities", token=token)
klienty_entity = None
for e in entities:
    field_names = {f["name"] for f in e.get("fields", [])}
    if "novyj_klient" in field_names and "zakazy_ref" in field_names:
        klienty_entity = e
        break

if not klienty_entity:
    print("ERROR: klienty entity not found", file=sys.stderr)
    sys.exit(1)

klienty_id = klienty_entity["id"]
print(f"Klienty entity: {klienty_id}")

# Get pages
pages = req("GET", f"/apps/{app_id}/pages", token=token)
sozdat = next(p for p in pages if p["title"] == "Создать заказ")
list_page = next((p for p in pages if p["title"] == "Список заказов"), None)
list_page_id = list_page["id"] if list_page else ""

blocks = sozdat.get("blocks") or []
print(f"Blocks: {[b['id'] for b in blocks]}")

updated_blocks = []
for b in blocks:
    cfg = dict(b.get("config") or {})

    if b["id"] == "b-lookup":
        # Fix: field_name was klient_id but the actual zakazy field is klient (relation)
        cfg["field_name"] = "klient"
        cfg["entity_id"] = klienty_id
        print(f"  Fixed b-lookup: field_name=klient, entity_id={klienty_id}")

    if b["id"] == "b-save":
        cfg["actionType"] = "save"
        cfg["targetPageId"] = list_page_id
        cfg["pre_create"] = {
            "condition_field": "novyj_klient",
            "entity_id": klienty_id,
            "field_map": {
                "fio": "fio_klienta",
                "telefon": "telefon_klienta",
                "novyj_klient": "novyj_klient",
            },
            "result_field": "klient",
        }
        print(f"  Updated b-save: pre_create → klienty {klienty_id}")

    updated_blocks.append({**b, "config": cfg})

req("PATCH", f"/apps/{app_id}/pages/{sozdat['id']}", {"blocks": updated_blocks}, token=token)
print("Done. Blocks updated.")
