"""
Seed script: creates a "Чат-бот помощник" app with entities and sample data.
Runs inside the backend container where the API is at http://localhost:8000
"""
import json, sys
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
        print(f"  ERROR {e.code} {method} {path}: {body_text[:300]}", file=sys.stderr)
        raise

# ── 1. Login ──
print("Logging in...")
tok = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD, "totp_code": None})
token = tok["access_token"]
print("  OK, token acquired")

# ── 2. Get or create app ──
print("Getting apps...")
apps = req("GET", "/apps", token=token)
bot_app = next((a for a in apps["items"] if a["name"] == "Чат-бот помощник"), None)
if not bot_app:
    print("Creating app...")
    bot_app = req("POST", "/apps", {
        "name": "Чат-бот помощник",
        "slug": "chatbot-assistant",
        "description": "Приложение для управления базой знаний и диалогами чат-бота"
    }, token=token)
    print(f"  Created app {bot_app['id']}")
else:
    print(f"  Using existing app {bot_app['id']}")

app_id = bot_app["id"]

# ── 3. Get existing entities ──
entities_list = req("GET", f"/apps/{app_id}/entities", token=token)
existing = {e["slug"]: e for e in entities_list}
print(f"  Existing entities: {list(existing.keys())}")

def get_or_create_entity(slug, display_name, plural, desc, icon, color):
    if slug in existing:
        e = existing[slug]
        print(f"  Entity '{slug}' already exists ({e['id']})")
        return e
    e = req("POST", f"/apps/{app_id}/entities", {
        "slug": slug,
        "display_name": display_name,
        "name_plural": plural,
        "description": desc,
        "icon": icon,
        "color": color,
    }, token=token)
    print(f"  Created entity '{slug}' -> {e['id']}")
    return e

def create_field(entity_id, name, display_name, ftype, required=False, choices=None):
    """name must match ^[a-z][a-z0-9_]*$, ftype from FieldType enum"""
    field_options = {}
    if choices:
        field_options["choices"] = choices
    body = {
        "name": name,
        "display_name": display_name,
        "field_type": ftype,
        "is_required": required,
        "field_options": field_options,
    }
    try:
        f = req("POST", f"/apps/{app_id}/entities/{entity_id}/fields", body, token=token)
        print(f"    + field '{name}' ({ftype})")
        return f
    except urllib.error.HTTPError:
        print(f"    ~ field '{name}' skipped (exists or error)")
        return None

def create_record(entity_id, payload):
    try:
        r = req("POST", f"/apps/{app_id}/entities/{entity_id}/records",
                {"payload": payload}, token=token)
        return r
    except urllib.error.HTTPError:
        return None

# ──────────────────────────────────────────────────────────────
# 4. FAQ entity
# ──────────────────────────────────────────────────────────────
print("\n--- FAQ ---")
faq = get_or_create_entity("faq", "FAQ", "FAQ записи",
                           "База часто задаваемых вопросов", "chat", "#35A7FF")
faq_fields = [f["name"] for f in faq.get("fields", [])]

if "question" not in faq_fields:
    create_field(faq["id"], "question", "Вопрос", "text", required=True)
if "answer" not in faq_fields:
    create_field(faq["id"], "answer", "Ответ", "long_text", required=True)
if "category" not in faq_fields:
    create_field(faq["id"], "category", "Категория", "select", choices=[
        {"value": "general",  "label": "Общие"},
        {"value": "pricing",  "label": "Цены"},
        {"value": "support",  "label": "Поддержка"},
        {"value": "features", "label": "Функционал"},
    ])
if "is_active" not in faq_fields:
    create_field(faq["id"], "is_active", "Активен", "boolean")

# Re-fetch entity to confirm fields
faq = req("GET", f"/apps/{app_id}/entities/{faq['id']}", token=token)
print(f"  Fields: {[f['name'] for f in faq.get('fields', [])]}")

# Check existing records
existing_faq = req("GET", f"/apps/{app_id}/entities/{faq['id']}/records?limit=1", token=token)
if len(existing_faq.get("items", [])) == 0:
    print("  Inserting FAQ records...")
    faq_records = [
        {"question": "Как зарегистрироваться в системе?",
         "answer": "Для регистрации обратитесь к администратору платформы. Он создаст вашу учётную запись и пришлёт данные для входа на почту.",
         "category": "general", "is_active": True},
        {"question": "Какие форматы данных поддерживаются?",
         "answer": "Платформа поддерживает текст, числа, даты, выпадающие списки, флажки, файлы (PDF, изображения до 50 МБ) и связи между сущностями.",
         "category": "features", "is_active": True},
        {"question": "Можно ли интегрировать с 1С?",
         "answer": "Да, через REST API и webhooks. Специальный коннектор для 1С находится в разработке и будет доступен в следующем обновлении.",
         "category": "features", "is_active": True},
        {"question": "Сколько пользователей можно добавить?",
         "answer": "В базовом тарифе — до 10 пользователей. В корпоративном тарифе количество пользователей не ограничено.",
         "category": "pricing", "is_active": True},
        {"question": "Как сбросить пароль?",
         "answer": "На странице входа нажмите 'Забыли пароль?' и введите email. Инструкция по сбросу придёт в течение 5 минут.",
         "category": "support", "is_active": True},
        {"question": "Есть ли мобильное приложение?",
         "answer": "Да, мобильное приложение доступно для iOS и Android. Оно автоматически синхронизируется с веб-версией.",
         "category": "general", "is_active": True},
        {"question": "Как создать чат-бота?",
         "answer": "Перейдите в раздел Интеллект, выберите модель ИИ и подключите базу знаний. Бот готов к работе сразу после сохранения настроек.",
         "category": "features", "is_active": True},
        {"question": "Где хранятся данные?",
         "answer": "Все данные хранятся на серверах в России (дата-центр Tier III). Резервные копии создаются ежечасно.",
         "category": "support", "is_active": True},
    ]
    ok = 0
    for rec in faq_records:
        r = create_record(faq["id"], rec)
        if r:
            ok += 1
            print(f"    + {rec['question'][:60]}")
    print(f"  {ok}/{len(faq_records)} records created")
else:
    print(f"  Records already exist ({existing_faq['total']}), skipping")

# ──────────────────────────────────────────────────────────────
# 5. Products entity
# ──────────────────────────────────────────────────────────────
print("\n--- Products ---")
products = get_or_create_entity("product", "Продукт", "Продукты",
                                "Каталог продуктов и услуг", "package", "#10B981")
prod_fields = [f["name"] for f in products.get("fields", [])]

if "name" not in prod_fields:
    create_field(products["id"], "name", "Название", "text", required=True)
if "description" not in prod_fields:
    create_field(products["id"], "description", "Описание", "long_text")
if "price" not in prod_fields:
    create_field(products["id"], "price", "Цена (руб.)", "number")
if "category" not in prod_fields:
    create_field(products["id"], "category", "Категория", "select", choices=[
        {"value": "platform",    "label": "Платформа"},
        {"value": "support",     "label": "Поддержка"},
        {"value": "integration", "label": "Интеграция"},
    ])
if "is_available" not in prod_fields:
    create_field(products["id"], "is_available", "Доступен", "boolean")

products = req("GET", f"/apps/{app_id}/entities/{products['id']}", token=token)
print(f"  Fields: {[f['name'] for f in products.get('fields', [])]}")

existing_prod = req("GET", f"/apps/{app_id}/entities/{products['id']}/records?limit=1", token=token)
if len(existing_prod.get("items", [])) == 0:
    print("  Inserting Product records...")
    product_records = [
        {"name": "Базовый тариф",         "description": "До 10 пользователей, 5 приложений, 1 ГБ хранилища, поддержка по email",                              "price": 4900,  "category": "platform",    "is_available": True},
        {"name": "Профессиональный тариф","description": "До 50 пользователей, безлимит приложений, 20 ГБ, приоритетная поддержка, API доступ",               "price": 14900, "category": "platform",    "is_available": True},
        {"name": "Корпоративный тариф",   "description": "Безлимит пользователей, выделенный сервер, SLA 99.9%, персональный менеджер, кастомная интеграция",  "price": 49900, "category": "platform",    "is_available": True},
        {"name": "Техническая поддержка", "description": "Выделенный специалист, SLA 4 часа, ответ 24/7",                                                      "price": 9900,  "category": "support",     "is_available": True},
        {"name": "Интеграция с 1С",       "description": "Двунаправленная синхронизация с 1С:Предприятие, настройка маппинга полей",                          "price": 29900, "category": "integration", "is_available": True},
        {"name": "Интеграция с Bitrix24", "description": "Синхронизация сделок, контактов и задач с Bitrix24 CRM",                                             "price": 19900, "category": "integration", "is_available": True},
    ]
    ok = 0
    for rec in product_records:
        r = create_record(products["id"], rec)
        if r:
            ok += 1
            print(f"    + {rec['name']}")
    print(f"  {ok}/{len(product_records)} records created")
else:
    print(f"  Records already exist ({existing_prod['total']}), skipping")

# ──────────────────────────────────────────────────────────────
# 6. Clients entity
# ──────────────────────────────────────────────────────────────
print("\n--- Clients ---")
clients = get_or_create_entity("client", "Клиент", "Клиенты",
                               "База клиентов", "users", "#6366F1")
cli_fields = [f["name"] for f in clients.get("fields", [])]

if "full_name" not in cli_fields:
    create_field(clients["id"], "full_name", "ФИО", "text", required=True)
if "company" not in cli_fields:
    create_field(clients["id"], "company", "Компания", "text")
if "email" not in cli_fields:
    create_field(clients["id"], "email", "Email", "email")
if "phone" not in cli_fields:
    create_field(clients["id"], "phone", "Телефон", "phone")
if "tariff" not in cli_fields:
    create_field(clients["id"], "tariff", "Тариф", "select", choices=[
        {"value": "basic",      "label": "Базовый"},
        {"value": "pro",        "label": "Профессиональный"},
        {"value": "enterprise", "label": "Корпоративный"},
    ])
if "notes" not in cli_fields:
    create_field(clients["id"], "notes", "Заметки", "long_text")

clients = req("GET", f"/apps/{app_id}/entities/{clients['id']}", token=token)
print(f"  Fields: {[f['name'] for f in clients.get('fields', [])]}")

existing_cli = req("GET", f"/apps/{app_id}/entities/{clients['id']}/records?limit=1", token=token)
if len(existing_cli.get("items", [])) == 0:
    print("  Inserting Client records...")
    client_records = [
        {"full_name": "Иванов Алексей Сергеевич",   "company": "ООО Технологии", "email": "ivanov@tech.ru",      "phone": "+79001234567", "tariff": "pro",        "notes": "Интересуется интеграцией с 1С"},
        {"full_name": "Смирнова Екатерина Андреевна","company": "АО Горизонт",    "email": "smirnova@gorizont.ru","phone": "+79122345678", "tariff": "enterprise", "notes": "Ключевой клиент, сделка на год"},
        {"full_name": "Петров Дмитрий Николаевич",  "company": "ИП Петров",      "email": "petrov@mail.ru",      "phone": "+79033456789", "tariff": "basic",      "notes": "Тестирует платформу"},
        {"full_name": "Козлова Мария Викторовна",   "company": "ООО РусСофт",    "email": "kozlova@russoft.com", "phone": "+79164567890", "tariff": "pro",        "notes": "Нужна поддержка по API"},
        {"full_name": "Новиков Игорь Павлович",     "company": "ЗАО ФинТех",     "email": "novikov@fintech.ru",  "phone": "+79255678901", "tariff": "enterprise", "notes": "Запрос на выделенный сервер"},
    ]
    ok = 0
    for rec in client_records:
        r = create_record(clients["id"], rec)
        if r:
            ok += 1
            print(f"    + {rec['full_name']}")
    print(f"  {ok}/{len(client_records)} records created")
else:
    print(f"  Records already exist ({existing_cli['total']}), skipping")

# ──────────────────────────────────────────────────────────────
# 7. Bot dialogs entity
# ──────────────────────────────────────────────────────────────
print("\n--- Bot Dialogs ---")
dialogs = get_or_create_entity("bot_dialog", "Диалог бота", "Диалоги бота",
                               "История диалогов чат-бота с пользователями", "message-circle", "#F59E0B")
dlg_fields = [f["name"] for f in dialogs.get("fields", [])]

if "user_message" not in dlg_fields:
    create_field(dialogs["id"], "user_message", "Сообщение пользователя", "text", required=True)
if "bot_response" not in dlg_fields:
    create_field(dialogs["id"], "bot_response", "Ответ бота", "long_text")
if "status" not in dlg_fields:
    create_field(dialogs["id"], "status", "Статус", "select", choices=[
        {"value": "resolved",  "label": "Решено"},
        {"value": "escalated", "label": "Передано оператору"},
        {"value": "pending",   "label": "Ожидает ответа"},
    ])
if "satisfaction" not in dlg_fields:
    create_field(dialogs["id"], "satisfaction", "Оценка (1-5)", "number")

dialogs = req("GET", f"/apps/{app_id}/entities/{dialogs['id']}", token=token)
print(f"  Fields: {[f['name'] for f in dialogs.get('fields', [])]}")

existing_dlg = req("GET", f"/apps/{app_id}/entities/{dialogs['id']}/records?limit=1", token=token)
if len(existing_dlg.get("items", [])) == 0:
    print("  Inserting Dialog records...")
    dialog_records = [
        {"user_message": "Как добавить нового пользователя?",
         "bot_response": "Перейдите в Настройки → Пользователи → Пригласить. Введите email и выберите роль. Пользователь получит письмо с инструкцией.",
         "status": "resolved", "satisfaction": 5},
        {"user_message": "Не работает экспорт в Excel",
         "bot_response": "Проверьте: 1) браузер поддерживает загрузку файлов, 2) данных не более 10 000 строк. Если проблема сохраняется — создайте тикет в поддержку.",
         "status": "escalated", "satisfaction": 3},
        {"user_message": "Сколько стоит корпоративный тариф?",
         "bot_response": "Корпоративный тариф — 49 900 руб/мес. Включает безлимит пользователей, выделенный сервер, SLA 99.9% и персонального менеджера.",
         "status": "resolved", "satisfaction": 5},
        {"user_message": "Можно ли настроить права доступа по полям?",
         "bot_response": "Да, в разделе Безопасность → Права доступа можно настроить видимость полей по ролям и правила ABAC на уровне записей.",
         "status": "resolved", "satisfaction": 4},
        {"user_message": "Как подключить Telegram бота?",
         "bot_response": "Создайте бота через @BotFather, скопируйте токен и вставьте в Интеграции → Telegram. После сохранения бот начнёт отвечать на сообщения.",
         "status": "pending", "satisfaction": None},
    ]
    ok = 0
    for rec in dialog_records:
        payload = {k: v for k, v in rec.items() if v is not None}
        r = create_record(dialogs["id"], payload)
        if r:
            ok += 1
            print(f"    + {rec['user_message'][:60]}")
    print(f"  {ok}/{len(dialog_records)} records created")
else:
    print(f"  Records already exist ({existing_dlg['total']}), skipping")

# ──────────────────────────────────────────────────────────────
print(f"\n{'='*55}")
print("Seed complete!")
print(f"  App:      Чат-бот помощник ({app_id})")
print(f"  Entities: FAQ, Продукты, Клиенты, Диалоги бота")
print(f"  URL:      http://155.212.164.251:8090")
print(f"{'='*55}")
