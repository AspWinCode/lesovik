"""Seed initial pages for Чат-бот помощник app."""
import sys
import requests

BASE = "http://localhost:8000/api/v1"
EMAIL = "admin@lesovik.app"
PASSWORD = "Lesovik!Admin2026"

def main():
    # Auth
    r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Find app
    r = requests.get(f"{BASE}/apps", headers=headers)
    r.raise_for_status()
    apps = r.json()["items"]
    app = next((a for a in apps if a["name"] == "Чат-бот помощник"), None)
    if not app:
        print("App not found", file=sys.stderr)
        sys.exit(1)
    app_id = app["id"]
    print(f"App: {app['name']} ({app_id})")

    # Check existing pages
    r = requests.get(f"{BASE}/apps/{app_id}/pages", headers=headers)
    r.raise_for_status()
    existing = r.json()
    if len(existing) > 0:
        print(f"Pages already exist ({len(existing)}), skipping.")
        return

    # Get entities
    r = requests.get(f"{BASE}/apps/{app_id}/entities", headers=headers)
    r.raise_for_status()
    entities = {e["display_name"]: e["id"] for e in r.json()}
    print("Entities:", list(entities.keys()))

    pages = [
        {
            "slug": "faq-page",
            "title": "FAQ",
            "nav_order": 1,
            "layout": {"entity_id": entities.get("FAQ", ""), "view_type": "table"},
            "blocks": [
                {"id": "block-1", "type": "table", "title": "Список FAQ", "config": {}},
                {"id": "block-2", "type": "button", "title": "Добавить запись", "config": {}},
            ],
        },
        {
            "slug": "products-page",
            "title": "Продукты",
            "nav_order": 2,
            "layout": {"entity_id": entities.get("Продукт", ""), "view_type": "table"},
            "blocks": [
                {"id": "block-3", "type": "table", "title": "Каталог продуктов", "config": {}},
            ],
        },
        {
            "slug": "clients-page",
            "title": "Клиенты",
            "nav_order": 3,
            "layout": {"entity_id": entities.get("Клиент", ""), "view_type": "table"},
            "blocks": [
                {"id": "block-4", "type": "table", "title": "База клиентов", "config": {}},
                {"id": "block-5", "type": "form", "title": "Форма клиента", "config": {}},
            ],
        },
        {
            "slug": "dialogs-page",
            "title": "Диалоги",
            "nav_order": 4,
            "layout": {"entity_id": entities.get("Диалог бота", ""), "view_type": "table"},
            "blocks": [
                {"id": "block-6", "type": "table", "title": "История диалогов", "config": {}},
            ],
        },
    ]

    for page in pages:
        r = requests.post(f"{BASE}/apps/{app_id}/pages", json=page, headers=headers)
        if r.status_code in (200, 201):
            print(f"  ✓ Created: {page['title']}")
        else:
            print(f"  ✗ Failed {page['title']}: {r.status_code} {r.text[:200]}")

    print("Done.")

if __name__ == "__main__":
    main()
