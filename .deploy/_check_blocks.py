import json, sys, urllib.request, urllib.error

BASE = "http://155.212.164.251:8090/api/v1"
EMAIL = "admin@lesovik.app"
PASSWORD = "Lesovik!Admin2026"

def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())

tok = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD, "totp_code": None})
token = tok["access_token"]

apps = req("GET", "/apps", token=token)
app = next(a for a in apps["items"] if "Выезд" in a["name"])
app_id = app["id"]
print(f"App: {app['name']} ({app_id})")

pages = req("GET", f"/apps/{app_id}/pages", token=token)
sozdat = next(p for p in pages if p["title"] == "Создать заказ")
print(f"\nPage: {sozdat['title']} (nav_order={sozdat['nav_order']})")
print("Blocks:")
for b in sozdat.get("blocks", []):
    cfg = b.get("config", {})
    print(f"  [{b['id']}] type={b['type']!r:20} title={b.get('title','')!r:25} field_name={cfg.get('field_name','')!r}")
