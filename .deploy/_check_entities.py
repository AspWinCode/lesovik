import json, sys, urllib.request

BASE = "http://155.212.164.251:8090/api/v1"
sys.stdout.reconfigure(encoding="utf-8")

def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())

tok = req("POST", "/auth/login", {"email": "admin@lesovik.app", "password": "Lesovik!Admin2026", "totp_code": None})
token = tok["access_token"]

apps = req("GET", "/apps", token=token)
app = next(a for a in apps["items"] if "Выезд" in a["name"])
app_id = app["id"]

entities = req("GET", f"/apps/{app_id}/entities", token=token)
print("Raw type:", type(entities), str(entities)[:200])
items = entities if isinstance(entities, list) else entities.get("items", [])
for e in items:
    print(f"\n=== {e.get('name','?')} / {e.get('display_name','?')} ({e.get('id','?')}) ===")
    for f in e.get("fields", []):
        if not f.get("is_system"):
            print(f"  {f['name']:30} {f.get('field_type','?'):15} display={f.get('display_name','?')}")
