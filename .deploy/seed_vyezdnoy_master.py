"""
Seed script: creates "Выездной мастер" app with entities, fields,
relations, pages and sample catalog data.
Run with: python .deploy/seed_vyezdnoy_master.py
"""
import json, sys, time
import urllib.request, urllib.error

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
        body_text = e.read().decode()
        print(f"  ERROR {e.code} {method} {path}: {body_text[:400]}", file=sys.stderr)
        raise


# ── 1. Login ──────────────────────────────────────────────────────────
print("Logging in...")
tok = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD, "totp_code": None})
token = tok["access_token"]
print("  OK")

# ── 2. App ────────────────────────────────────────────────────────────
print("\nSetting up app...")
apps = req("GET", "/apps", token=token)
app_obj = next((a for a in apps["items"] if a["name"] == "Выездной мастер"), None)
if not app_obj:
    app_obj = req("POST", "/apps", {
        "name": "Выездной мастер",
        "slug": f"vyezdnoy-master-{int(time.time())}",
        "description": "Приложение для выездного мастера по замерам",
    }, token=token)
    print(f"  Created: {app_obj['id']}")
else:
    print(f"  Existing: {app_obj['id']}")
app_id = app_obj["id"]

# ── Helpers ───────────────────────────────────────────────────────────
entities_resp = req("GET", f"/apps/{app_id}/entities", token=token)
existing = {e["slug"]: e for e in entities_resp}


def get_or_create_entity(slug, display_name, plural, desc, icon, color):
    if slug in existing:
        print(f"  Entity '{slug}' already exists")
        return req("GET", f"/apps/{app_id}/entities/{existing[slug]['id']}", token=token)
    e = req("POST", f"/apps/{app_id}/entities", {
        "slug": slug, "display_name": display_name, "name_plural": plural,
        "description": desc, "icon": icon, "color": color,
    }, token=token)
    print(f"  Created entity '{slug}'")
    return e


def field_names(entity):
    return {f["name"] for f in entity.get("fields", [])}


def add_field(entity_id, name, display_name, ftype, required=False,
              choices=None, formula=None):
    opts = {}
    if choices:
        opts["choices"] = choices
    body = {
        "name": name, "display_name": display_name,
        "field_type": ftype, "is_required": required, "field_options": opts,
    }
    if formula:
        body["formula_definition"] = formula
    try:
        f = req("POST", f"/apps/{app_id}/entities/{entity_id}/fields", body, token=token)
        print(f"    + {name} ({ftype})")
        return f
    except urllib.error.HTTPError:
        print(f"    ~ {name} skipped")
        return None


def add_relation(from_id, to_id, rel_type, from_field, display_name):
    try:
        r = req("POST", f"/apps/{app_id}/relations", {
            "from_entity_id": from_id, "to_entity_id": to_id,
            "relation_type": rel_type, "from_field_name": from_field,
            "display_name": display_name,
        }, token=token)
        print(f"    + {display_name}")
        return r
    except urllib.error.HTTPError:
        print(f"    ~ relation '{display_name}' skipped")
        return None


def add_record(entity_id, payload):
    try:
        return req("POST", f"/apps/{app_id}/entities/{entity_id}/records",
                   {"payload": payload}, token=token)
    except urllib.error.HTTPError:
        return None


def add_page(slug, title, nav_order, entity_id, view_type, blocks):
    try:
        r = req("POST", f"/apps/{app_id}/pages", {
            "slug": slug, "title": title, "nav_order": nav_order,
            "layout": {"entity_id": entity_id, "view_type": view_type},
            "blocks": blocks,
        }, token=token)
        print(f"  ✓ {title}")
        return r
    except urllib.error.HTTPError:
        print(f"  ~ page '{title}' skipped")
        return None


# ── 3. Entities & fields ──────────────────────────────────────────────

# ── Клиенты ──────────────────────────────────────────────────────────
print("\n--- Клиенты ---")
klienty = get_or_create_entity(
    "klienty", "Клиенты", "Клиенты",
    "База клиентов выездного мастера", "users", "#35A7FF",
)
ef = field_names(klienty)
if "fio"           not in ef: add_field(klienty["id"], "fio",           "ФИО",          "text",    required=True)
if "telefon"       not in ef: add_field(klienty["id"], "telefon",       "Телефон",      "phone")
if "email"         not in ef: add_field(klienty["id"], "email",         "Email",        "email")
if "adres"         not in ef: add_field(klienty["id"], "adres",         "Адрес",        "text")
if "novyj_klient"  not in ef: add_field(klienty["id"], "novyj_klient",  "Новый клиент", "boolean")
if "skidka_proc"   not in ef: add_field(klienty["id"], "skidka_proc",   "Скидка %",     "number")

# ── Товары и услуги ───────────────────────────────────────────────────
print("\n--- Товары и услуги ---")
tovary = get_or_create_entity(
    "tovary_uslugi", "Товары и услуги", "Товары и услуги",
    "Каталог: окна, подоконники, материалы, монтаж, доставка", "package", "#10B981",
)
ef = field_names(tovary)
if "nazvanie"  not in ef: add_field(tovary["id"], "nazvanie",  "Название",    "text", required=True)
if "kategoriya" not in ef:
    add_field(tovary["id"], "kategoriya", "Категория", "select", choices=[
        {"value": "okno",       "label": "Окно"},
        {"value": "podokonnik", "label": "Подоконник"},
        {"value": "material",   "label": "Материал"},
        {"value": "montazh",    "label": "Монтаж"},
        {"value": "ustanovka",  "label": "Установка"},
        {"value": "dostavka",   "label": "Доставка"},
    ])
if "cena"    not in ef: add_field(tovary["id"], "cena",    "Цена (руб.)", "currency")
if "edinica" not in ef:
    add_field(tovary["id"], "edinica", "Единица", "select", choices=[
        {"value": "sht", "label": "шт"},
        {"value": "m2",  "label": "м²"},
        {"value": "mp",  "label": "м.п."},
        {"value": "usl", "label": "усл."},
    ])
if "aktiven" not in ef: add_field(tovary["id"], "aktiven", "Активен", "boolean")

# ── Заказы ────────────────────────────────────────────────────────────
print("\n--- Заказы ---")
zakazy = get_or_create_entity(
    "zakazy", "Заказы", "Заказы",
    "Заказы, создаваемые мастером на выезде", "clipboard", "#F59E0B",
)
ef = field_names(zakazy)
if "nomer_zakaza"     not in ef: add_field(zakazy["id"], "nomer_zakaza",     "Номер заказа",        "text")
if "data_sozdaniya"   not in ef: add_field(zakazy["id"], "data_sozdaniya",   "Дата создания",       "datetime")
if "adres_obekta"     not in ef: add_field(zakazy["id"], "adres_obekta",     "Адрес объекта",       "text")
if "status"           not in ef:
    add_field(zakazy["id"], "status", "Статус", "select", choices=[
        {"value": "novyj",     "label": "Новый"},
        {"value": "v_rabote",  "label": "В работе"},
        {"value": "zavershen", "label": "Завершён"},
        {"value": "otmenen",   "label": "Отменён"},
    ])
if "skidka_proc"      not in ef: add_field(zakazy["id"], "skidka_proc",      "Скидка %",            "number")
if "skidka_primenena" not in ef: add_field(zakazy["id"], "skidka_primenena", "Скидка применена",    "boolean")
if "summa_tovarov"    not in ef: add_field(zakazy["id"], "summa_tovarov",    "Сумма товаров",       "currency")
if "itogo"            not in ef: add_field(zakazy["id"], "itogo",            "Итого (со скидкой)",  "currency")
if "kommentarij"      not in ef: add_field(zakazy["id"], "kommentarij",      "Комментарий",         "long_text")

# ── Позиции заказа ────────────────────────────────────────────────────
print("\n--- Позиции заказа ---")
pozicii = get_or_create_entity(
    "pozicii_zakaza", "Позиции заказа", "Позиции заказа",
    "Строки заказа: товар, количество, цена, сумма", "list", "#8B5CF6",
)
ef = field_names(pozicii)
if "nazvanie_tovara" not in ef: add_field(pozicii["id"], "nazvanie_tovara", "Товар / Услуга",   "text")
if "kategoriya"      not in ef:
    add_field(pozicii["id"], "kategoriya", "Категория", "select", choices=[
        {"value": "okno",       "label": "Окно"},
        {"value": "podokonnik", "label": "Подоконник"},
        {"value": "material",   "label": "Материал"},
        {"value": "montazh",    "label": "Монтаж"},
        {"value": "ustanovka",  "label": "Установка"},
        {"value": "dostavka",   "label": "Доставка"},
    ])
if "kolichestvo"     not in ef: add_field(pozicii["id"], "kolichestvo",     "Количество",       "decimal")
if "edinica"         not in ef: add_field(pozicii["id"], "edinica",         "Единица",          "text")
if "cena_za_ed"      not in ef: add_field(pozicii["id"], "cena_za_ed",      "Цена за единицу",  "currency")
if "summa"           not in ef:
    add_field(pozicii["id"], "summa", "Сумма", "formula", formula={
        "type": "math", "op": "multiply",
        "left":  {"type": "field_ref", "field": "kolichestvo"},
        "right": {"type": "field_ref", "field": "cena_za_ed"},
    })

# ── 4. Relations ──────────────────────────────────────────────────────
print("\n--- Связи ---")
existing_rels = req("GET", f"/apps/{app_id}/relations", token=token)
existing_rel_names = {r["display_name"] for r in existing_rels}

if "Заказ → Клиент"  not in existing_rel_names:
    add_relation(zakazy["id"],  klienty["id"],  "many_to_one",  "klient_id",  "Заказ → Клиент")
if "Заказ → Позиции" not in existing_rel_names:
    add_relation(zakazy["id"],  pozicii["id"],  "one_to_many",  "pozicii_id", "Заказ → Позиции")
if "Позиция → Товар" not in existing_rel_names:
    add_relation(pozicii["id"], tovary["id"],   "many_to_one",  "tovar_id",   "Позиция → Товар")

# ── 5. Sample catalog ─────────────────────────────────────────────────
print("\n--- Каталог товаров (образцы) ---")
check = req("GET", f"/apps/{app_id}/entities/{tovary['id']}/records?limit=1", token=token)
if len(check.get("items", [])) == 0:
    catalog = [
        # Окна
        {"nazvanie": "Окно ПВХ 1000×1400 одностворчатое", "kategoriya": "okno",       "cena": 8500,  "edinica": "sht", "aktiven": True},
        {"nazvanie": "Окно ПВХ 1200×1400 двустворчатое",  "kategoriya": "okno",       "cena": 12000, "edinica": "sht", "aktiven": True},
        {"nazvanie": "Окно ПВХ 1500×1800 трёхстворчатое", "kategoriya": "okno",       "cena": 18500, "edinica": "sht", "aktiven": True},
        {"nazvanie": "Окно ПВХ панорамное 2000×1800",      "kategoriya": "okno",       "cena": 28000, "edinica": "sht", "aktiven": True},
        # Подоконники
        {"nazvanie": "Подоконник ПВХ белый 250мм",         "kategoriya": "podokonnik", "cena": 350,   "edinica": "mp",  "aktiven": True},
        {"nazvanie": "Подоконник ПВХ белый 400мм",         "kategoriya": "podokonnik", "cena": 520,   "edinica": "mp",  "aktiven": True},
        {"nazvanie": "Подоконник мрамор 300мм",            "kategoriya": "podokonnik", "cena": 780,   "edinica": "mp",  "aktiven": True},
        # Материалы
        {"nazvanie": "Монтажная пена 750мл",               "kategoriya": "material",   "cena": 320,   "edinica": "sht", "aktiven": True},
        {"nazvanie": "Уплотнительная лента 6мм",           "kategoriya": "material",   "cena": 85,    "edinica": "mp",  "aktiven": True},
        {"nazvanie": "Анкерный болт М8×100",               "kategoriya": "material",   "cena": 15,    "edinica": "sht", "aktiven": True},
        # Монтаж
        {"nazvanie": "Монтаж окна ПВХ (стандарт)",         "kategoriya": "montazh",    "cena": 2500,  "edinica": "sht", "aktiven": True},
        {"nazvanie": "Монтаж балконного блока",            "kategoriya": "montazh",    "cena": 4500,  "edinica": "sht", "aktiven": True},
        # Установка
        {"nazvanie": "Установка подоконника",               "kategoriya": "ustanovka",  "cena": 800,   "edinica": "sht", "aktiven": True},
        {"nazvanie": "Установка откосов",                  "kategoriya": "ustanovka",  "cena": 1200,  "edinica": "sht", "aktiven": True},
        # Доставка
        {"nazvanie": "Доставка по городу",                 "kategoriya": "dostavka",   "cena": 1500,  "edinica": "usl", "aktiven": True},
        {"nazvanie": "Доставка за город (до 50 км)",       "kategoriya": "dostavka",   "cena": 3000,  "edinica": "usl", "aktiven": True},
    ]
    ok = sum(1 for item in catalog if add_record(tovary["id"], item))
    print(f"  {ok}/{len(catalog)} positions created")
else:
    print(f"  Catalog already populated, skipping")

# ── 6. Pages ──────────────────────────────────────────────────────────
print("\n--- Страницы ---")
existing_pages = req("GET", f"/apps/{app_id}/pages", token=token)
if existing_pages:
    print(f"  Pages exist ({len(existing_pages)}), skipping")
else:
    kl  = klienty["id"]
    zak = zakazy["id"]
    tov = tovary["id"]
    poz = pozicii["id"]

    # ── Page 1: Создать заказ ──────────────────────────────────────────
    add_page("sozdat-zakaz", "Создать заказ", 1, zak, "form", [
        {
            "id": "b-lookup-client", "type": "lookup", "title": "Клиент",
            "config": {"label": "Выбрать клиента", "entity_id": kl, "display_field": "fio", "multiple": False},
        },
        {
            "id": "b-divider-1", "type": "divider", "title": None,
            "config": {},
        },
        {
            "id": "b-toggle-new", "type": "toggle", "title": "Новый клиент",
            "config": {"label": "Новый клиент (создать)", "default_value": False},
        },
        {
            "id": "b-fio-new", "type": "text_field", "title": "ФИО",
            "config": {"label": "ФИО нового клиента", "placeholder": "Иванов Иван Иванович", "required": False},
        },
        {
            "id": "b-phone-new", "type": "text_field", "title": "Телефон",
            "config": {"label": "Телефон", "placeholder": "+7 (___) ___-__-__", "mask": "+7 (999) 999-99-99", "required": False},
        },
        {
            "id": "b-toggle-discount", "type": "toggle", "title": "Скидка новому клиенту",
            "config": {"label": "Скидка новому клиенту", "default_value": False},
        },
        {
            "id": "b-discount-pct", "type": "number_field", "title": "Скидка %",
            "config": {"label": "Скидка %", "format": "number", "min": "0", "max": "100", "unit": "%", "required": False},
        },
        {
            "id": "b-adres", "type": "text_field", "title": "Адрес объекта",
            "config": {"label": "Адрес объекта", "placeholder": "ул. Примерная, д.1, кв.5", "required": False},
        },
        {
            "id": "b-divider-2", "type": "divider", "title": None,
            "config": {},
        },
        {
            "id": "b-pozicii", "type": "table", "title": "Позиции заказа",
            "config": {"entity_id": poz, "label": "Позиции заказа"},
        },
        {
            "id": "b-metric-total", "type": "metric", "title": "Итого",
            "config": {"label": "Итого (руб.)", "value": "0", "width": "third"},
        },
        {
            "id": "b-save", "type": "button", "title": "Сохранить заказ",
            "config": {"label": "💾  Сохранить заказ", "width": "half", "actionType": "url", "href": ""},
        },
    ])

    # ── Page 2: Список заказов ─────────────────────────────────────────
    add_page("zakazy", "Список заказов", 2, zak, "table", [
        {
            "id": "b-zakazy-table", "type": "table", "title": "Заказы",
            "config": {"entity_id": zak, "label": "Все заказы"},
        },
        {
            "id": "b-new-zakaz-btn", "type": "button", "title": "Новый заказ",
            "config": {"label": "+ Новый заказ", "width": "half", "actionType": "url", "href": "/sozdat-zakaz"},
        },
    ])

    # ── Page 3: Клиенты ────────────────────────────────────────────────
    add_page("klienty", "Клиенты", 3, kl, "table", [
        {
            "id": "b-klienty-table", "type": "table", "title": "Клиенты",
            "config": {"entity_id": kl, "label": "База клиентов"},
        },
    ])

    # ── Page 4: Каталог ────────────────────────────────────────────────
    add_page("katalog", "Каталог", 4, tov, "table", [
        {
            "id": "b-katalog-table", "type": "table", "title": "Товары и услуги",
            "config": {"entity_id": tov, "label": "Каталог товаров и услуг"},
        },
    ])

print(f"\n✅  Готово! Откройте приложение «Выездной мастер» в платформе.")
print(f"   App ID: {app_id}")
