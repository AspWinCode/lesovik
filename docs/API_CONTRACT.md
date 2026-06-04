# REST API — контракт MVP

> Спецификация REST API для разработки BE и FE параллельно. Базовая версия — `v1`. Документ описывает соглашения и реестр эндпоинтов; OpenAPI 3.0 YAML — генерируется автоматически из Pydantic-моделей FastAPI и доступен по `/api/v1/openapi.json`. Здесь — нормативная часть, на которую опирается код-ревью.

## Содержание

**Часть I — Принципы**
1. [Версионирование](#1-версионирование)
2. [Аутентификация](#2-аутентификация)
3. [Авторизация](#3-авторизация)
4. [Соглашения запросов и ответов](#4-соглашения-запросов-и-ответов)
5. [Пагинация](#5-пагинация)
6. [Фильтрация, сортировка, выбор полей](#6-фильтрация-сортировка-выбор-полей)
7. [Идемпотентность](#7-идемпотентность)
8. [Обработка ошибок](#8-обработка-ошибок)
9. [Rate limiting и квоты](#9-rate-limiting-и-квоты)
10. [Безопасные заголовки](#10-безопасные-заголовки)

**Часть II — Реестр endpoint'ов**
11. [Identity & Access](#11-identity--access)
12. [App Catalog](#12-app-catalog)
13. [Metamodel](#13-metamodel)
14. [UI Model](#14-ui-model)
15. [Rules](#15-rules)
16. [Workflow](#16-workflow)
17. [Records (runtime data)](#17-records-runtime-data)
18. [Files](#18-files)
19. [Document registrator](#19-document-registrator)
20. [Integrations](#20-integrations)
21. [Audit](#21-audit)
22. [Search и Metadata](#22-search-и-metadata)

**Часть III — Матрица прав**
23. [Каталог разрешений](#23-каталог-разрешений)
24. [Матрица Permission × Endpoint](#24-матрица-permission--endpoint)
25. [ABAC-сценарии](#25-abac-сценарии)

**Часть IV — Полные OpenAPI-фрагменты**
26. [Аутентификация (полный пример)](#26-аутентификация-полный-пример)
27. [Records (полный пример)](#27-records-полный-пример)
28. [Webhook events](#28-webhook-events)

---

# Часть I — Принципы

## 1. Версионирование

- Префикс URL: `/api/v1/...`. Major-версия в URL.
- Minor-изменения (новые поля, новые endpoint'ы) — без bump версии, добавляются обратно совместимо.
- Breaking changes (удаление поля, изменение типа, удаление endpoint'а) — новая major-версия (`/api/v2/...`), старая поддерживается ≥ 6 месяцев.
- Заголовок `API-Version: 1` возвращается в каждом ответе.
- Заголовок `Deprecation: true` + `Sunset: <date>` — для устаревших endpoint'ов.

---

## 2. Аутентификация

### 2.1 Сессионная (для UI)

Поток OAuth-подобный, но внутренний:

1. `POST /api/v1/auth/login` (email+password или OAuth Yandex ID) → возвращает `access_token` (короткий JWT) и `refresh_token`.
2. `Authorization: Bearer <access_token>` на каждый защищённый запрос.
3. `POST /api/v1/auth/refresh` с `refresh_token` → новый access + refresh (refresh ротируется).
4. `POST /api/v1/auth/logout` → инвалидация refresh в БД.

**access_token**:
- JWT RS256 (асимметричная, ключ ротируется раз в 90 дней).
- Время жизни: 15 минут.
- Claims: `sub` (user_id), `roles`, `groups`, `app_scope` (если ограничен приложением), `iat`, `exp`, `jti`.
- Не содержит ПДн (email/имя) — только id и роли.

**refresh_token**:
- Случайная строка 256 бит, хэш в `identity.session`.
- Время жизни: 30 дней.
- Привязан к `device_fingerprint` — попытка использовать с другим — детект кражи, инвалидация **всех** сессий пользователя + алерт.

**2FA TOTP**:
- При включённом 2FA первый шаг возвращает 401 с `error=mfa_required` и `mfa_session` (10 минут).
- `POST /api/v1/auth/mfa/verify` с `mfa_session` и `code` → access+refresh.

### 2.2 API-ключ (для машинных интеграций)

- Заголовок `X-API-Key: <prefix>.<secret>`.
- `prefix` (8 символов) индексируется в `identity.api_key.key_prefix`, `secret` хэшируется (SHA-256).
- В заголовке ответа: `X-API-Key-Last-Used: <ISO>`.
- Scope-ограничение: ключ имеет `scopes` — список разрешений (см. §23).

### 2.3 OAuth (внешние IdP)

- `GET /api/v1/auth/yandex/authorize` → редирект на Яндекс ID.
- `GET /api/v1/auth/yandex/callback?code=...` → exchange + access+refresh.
- LDAP/AD — очередь 2, не в MVP.

---

## 3. Авторизация

### 3.1 Двухуровневая модель

1. **RBAC** (грубая): набор ролей пользователя → набор permission'ов. Решение: `allow` / `deny` / `not_applicable`.
2. **ABAC** (тонкая): условие на конкретной записи (например, «свой отдел»). Срабатывает только если RBAC = `allow`.

### 3.2 PolicyEngine на каждом запросе

Middleware FastAPI:
```python
@app.middleware("http")
async def policy_middleware(request, call_next):
    user = await resolve_user(request)
    request.state.policy = PolicyEngine(user)
    return await call_next(request)
```

В каждом сервисном методе:
```python
def get_record(record_id, ctx):
    record = repo.get(record_id)
    ctx.policy.require("record.read", resource=record)  # raises 403
    return record
```

Никаких обходных путей. Раз в спринт — тест-матрица «каждая роль × каждый endpoint».

---

## 4. Соглашения запросов и ответов

### 4.1 Content-Type

- Запросы: `application/json; charset=utf-8` (если не загрузка файла).
- Загрузка файлов: `multipart/form-data`.
- Ответы: `application/json; charset=utf-8` (по умолчанию). Экспорт — `application/octet-stream` с `Content-Disposition: attachment`.

### 4.2 Поля ответа

Каждый ответ-объект содержит как минимум:
```json
{
  "id": "uuid",
  "created_at": "2026-05-15T10:30:00Z",
  "updated_at": "2026-05-15T11:00:00Z",
  "version": 3
}
```

Эти поля — системные, автоматические. Не дублируются в `payload` пользовательских сущностей.

### 4.3 Список (коллекция)

```json
{
  "items": [ {...}, {...} ],
  "page": { "cursor_next": "eyJ...", "cursor_prev": null, "total_estimated": 1247 }
}
```

---

## 5. Пагинация

Только **cursor-based**, не offset.

- `?cursor=<base64>` — указатель на следующую страницу.
- `?limit=50` — по умолчанию 50, максимум 200.
- Cursor — `base64(json({"v":1,"k":"created_at|id","val":"2026-...|uuid","dir":"asc"}))`.
- `cursor_prev` поддерживается только если в системном UI нужен «назад» — рассчитывается симметрично.

**Почему не offset**: на 1М записей `OFFSET 999000` — это перебор миллиона строк. Cursor использует индекс.

**`total_estimated`** — приблизительная оценка из `pg_class.reltuples`, не точная (точный count на 1М — недопустимо дорого). UI показывает «≈ 1 247», не «1 247».

---

## 6. Фильтрация, сортировка, выбор полей

### 6.1 Фильтр (упрощённая запись)

```
GET /api/v1/applications/{app_id}/entities/{entity_code}/records
    ?filter=status:eq:active,amount:gt:10000
    &sort=-created_at,name
    &fields=id,payload.name,payload.amount
```

| Оператор | Описание |
|---|---|
| `eq`, `ne` | равно / не равно |
| `gt`, `ge`, `lt`, `le` | сравнение |
| `in:v1\|v2\|v3` | один из |
| `like:abc*` | подстрока |
| `between:a..b` | диапазон |
| `isnull`, `notnull` | NULL |

### 6.2 Безопасность

- `filter` парсится в AST → передаётся в QueryBuilder, который строит **параметризованный** SQL.
- Имя поля валидируется по `metamodel.field.code` целевой сущности (whitelist). Несуществующее поле → `400`.
- Невозможно отфильтровать по системному полю, для которого нет разрешения (например, `created_by`, если у пользователя нет права видеть автора).
- Никаких `OR` в синтаксисе MVP — только `AND` (отсекает класс атак на «обход условий»). Сложные условия — через `POST /search` с JSON-телом (см. §22).

### 6.3 Сортировка

`?sort=-created_at,name` — DESC по `created_at`, ASC по `name`. Максимум 3 ключа. Только по полям с `is_indexed=true` или системным.

### 6.4 Выбор полей

`?fields=id,payload.name` — экономит трафик. По умолчанию возвращаются **все поля, видимые роли** (после применения `is_masked` и ABAC).

---

## 7. Идемпотентность

Все запросы, которые **меняют состояние** (POST, PATCH, DELETE, переходы workflow, импорт), поддерживают заголовок:

```
Idempotency-Key: <uuid-v4>
```

Сервер:
- Хранит `(key, user_id, endpoint, response, expires_at)` в `integration.idempotency_key` 24 часа.
- Повторный запрос с тем же ключом → возвращает закешированный ответ (тот же HTTP-статус и тело).
- Разные тела с одним ключом → 409 Conflict (защита от ошибки клиента).

Обязательно для: создания записей, переходов workflow, импортов, экспортов, загрузки файлов.

---

## 8. Обработка ошибок

**Формат — RFC 7807 (Problem Details for HTTP APIs)**:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.platform.ru/errors/rule_validation_failed",
  "title": "Правило сохранения не выполнено",
  "status": 422,
  "detail": "Сумма превышает лимит бюджета",
  "instance": "/api/v1/records/expense_request/c8f...",
  "code": "rule_validation_failed",
  "rule": "expense.over_budget",
  "field": "amount",
  "trace_id": "abc123def456"
}
```

### Карта HTTP-кодов

| Код | Когда |
|---|---|
| `200 OK` | Успех с телом |
| `201 Created` | Создание (Location-заголовок с URL ресурса) |
| `202 Accepted` | Запрос принят, обработка асинхронна (импорт, экспорт) — возвращается `job_id` |
| `204 No Content` | Успех без тела (PATCH/DELETE) |
| `400 Bad Request` | Ошибка валидации запроса (Pydantic) |
| `401 Unauthorized` | Нет токена / истёк / невалидный |
| `403 Forbidden` | Авторизация: роль или ABAC отвергли |
| `404 Not Found` | Ресурс не существует / удалён |
| `409 Conflict` | Версия устарела / уже занято (edit_lock) / IdempotencyKey conflict |
| `410 Gone` | Endpoint deprecated и удалён |
| `413 Payload Too Large` | Файл >100 МБ / запрос > лимита |
| `415 Unsupported Media Type` | Неверный Content-Type |
| `422 Unprocessable Entity` | Бизнес-правило / валидатор отверг |
| `423 Locked` | Приложение редактируется другим пользователем (см. §3.2.1 ТЗ) |
| `429 Too Many Requests` | Rate limit |
| `500 Internal Server Error` | Невосстановимая ошибка (не показывать internals!) |
| `503 Service Unavailable` | Downstream (ClamAV, S3) недоступен |
| `504 Gateway Timeout` | Тайм-аут операции (113 сек на правило / 30 сек на отчёт) |

### Что НЕ возвращаем в ошибках

- Stack trace (только в логах с trace_id).
- SQL-запросы (даже частично).
- Существование ресурса при 403: «нет доступа» — но не «такая запись существует, у вас нет прав».
  - Универсальный паттерн: если ABAC отвергает чтение — возвращаем `404 Not Found`, не `403`. Так атакующий не сможет различить «не существует» и «нет прав» (защита от enumeration attacks).
  - `403` оставляем только для случаев, где сам факт права отказан, но ресурс публично известен (например, попытка opa изменения роли).

---

## 9. Rate limiting и квоты

Реализация — `slowapi` поверх Redis.

| Endpoint | Лимит | На уровне |
|---|---|---|
| `POST /auth/login` | 5/мин, 10/час | IP + email |
| `POST /auth/refresh` | 60/мин | user |
| `POST /auth/mfa/verify` | 5/мин | user |
| Чтение (GET) | 600/мин | user |
| Запись (POST/PATCH/DELETE) | 120/мин | user |
| `POST /imports` | 5/час | user |
| `POST /exports` | 10/час, не более 10К строк за запрос | user |
| `POST /api-keys/{id}/use` (внешний API) | 1000/мин | api_key |
| `POST /search/cross-entity` | 30/мин | user |
| `GET /files/{id}` (download) | 100/мин | user |

При превышении: `429 Too Many Requests` + `Retry-After: <seconds>`. На `auth/login` — также `audit.suspicious_activity` после 3 превышений.

Заголовки в каждом ответе:
- `X-RateLimit-Limit: 600`
- `X-RateLimit-Remaining: 487`
- `X-RateLimit-Reset: 1684155600`

---

## 10. Безопасные заголовки

Любой ответ:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; ...   (только для HTML-роутов)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
Cache-Control: no-store                              (для приватных данных)
```

CORS:
- В MVP — same-origin, CORS отключён.
- Для внешнего API (по API-Key) — отдельный домен `api.platform.ru` с allow-list origins.

---

# Часть II — Реестр endpoint'ов

Формат: `METHOD /path` — действие, типовые параметры, требуемое право.

## 11. Identity & Access

| Endpoint | Описание | Permission |
|---|---|---|
| `POST /auth/login` | Логин email+password | — (публичный) |
| `POST /auth/mfa/verify` | Подтверждение TOTP | — (после login) |
| `POST /auth/refresh` | Обновление токена | — |
| `POST /auth/logout` | Инвалидация сессии | — |
| `GET /auth/yandex/authorize` | OAuth redirect | — |
| `GET /auth/yandex/callback` | OAuth callback | — |
| `GET /me` | Профиль текущего пользователя | — |
| `PATCH /me` | Изменение профиля (имя, локаль, TZ) | — |
| `POST /me/change-password` | Смена пароля | — |
| `POST /me/2fa/enable` | Включить 2FA | — |
| `POST /me/2fa/disable` | Выключить 2FA (с подтверждением) | — |
| `GET /me/sessions` | Активные сессии | — |
| `DELETE /me/sessions/{id}` | Завершить сессию | — |
| `GET /users` | Список пользователей | `user.read` |
| `POST /users` | Пригласить пользователя | `user.invite` |
| `GET /users/{id}` | Профиль пользователя | `user.read` |
| `PATCH /users/{id}` | Изменение | `user.write` |
| `POST /users/{id}/deactivate` | Деактивация | `user.admin` |
| `POST /users/{id}/lock` | Блокировка | `user.admin` |
| `DELETE /users/{id}` | Soft-delete | `user.admin` |
| `POST /users/{id}/sessions/revoke` | Принудительно завершить сессии | `user.admin` |
| `GET /groups` | Группы | `group.read` |
| `POST /groups` | Создание | `group.write` |
| `PATCH /groups/{id}` | Изменение | `group.write` |
| `DELETE /groups/{id}` | Soft-delete | `group.admin` |
| `POST /groups/{id}/members` | Добавить участника | `group.write` |
| `DELETE /groups/{id}/members/{user_id}` | Убрать | `group.write` |
| `GET /roles` | Список ролей | `role.read` |
| `POST /roles` | Создание роли | `role.admin` |
| `PATCH /roles/{id}` | Изменение | `role.admin` |
| `GET /roles/{id}/permissions` | Права роли | `role.read` |
| `PUT /roles/{id}/permissions` | Назначение прав | `role.admin` |
| `POST /users/{id}/roles` | Выдать роль | `role.assign` |
| `DELETE /users/{id}/roles/{role_id}` | Отозвать | `role.assign` |
| `GET /api-keys` | Список ключей | `api_key.read` |
| `POST /api-keys` | Создание (возвращает секрет один раз!) | `api_key.write` |
| `POST /api-keys/{id}/revoke` | Отзыв | `api_key.write` |
| `GET /abac-policies` | Политики ABAC | `policy.read` |
| `POST /abac-policies` | Создание | `policy.admin` |
| `PATCH /abac-policies/{id}` | Изменение | `policy.admin` |

---

## 12. App Catalog

| Endpoint | Описание | Permission |
|---|---|---|
| `GET /modules` | Каталог модулей | `module.read` |
| `GET /modules/{code}` | Информация о модуле | `module.read` |
| `GET /modules/{code}/versions` | Версии | `module.read` |
| `GET /app-templates` | Шаблоны приложений | `app.read` |
| `GET /applications` | Список приложений | `app.read` |
| `POST /applications` | Создать (с нуля / шаблон / модули) | `app.create` |
| `GET /applications/{id}` | Детали | `app.read` |
| `PATCH /applications/{id}` | Изменение метаданных | `app.write` |
| `DELETE /applications/{id}` | Soft-delete | `app.admin` |
| `POST /applications/{id}/install-module` | Установить модуль | `app.write` |
| `POST /applications/{id}/install-module/preview` | Проверить конфликты | `app.write` |
| `POST /applications/{id}/publish` | Опубликовать (создаёт version) | `app.publish` |
| `POST /applications/{id}/archive` | Архив | `app.admin` |
| `POST /applications/{id}/clone` | Клонировать | `app.create` |
| `GET /applications/{id}/versions` | Список версий | `app.read` |
| `GET /applications/{id}/versions/{no}` | Snapshot версии | `app.read` |
| `POST /applications/{id}/versions/{no}/rollback` | Откат | `app.publish` |
| `POST /applications/{id}/lock` | Захватить блокировку редактора | `app.write` |
| `POST /applications/{id}/lock/heartbeat` | Продление | `app.write` |
| `DELETE /applications/{id}/lock` | Снять блокировку | `app.write` (свою) или `app.admin` (чужую) |
| `POST /applications/{id}/preview` | Режим preview (ТЗ 3.11.1) | `app.read` |
| `POST /applications/{id}/validate` | Проверка целостности | `app.write` |

---

## 13. Metamodel

| Endpoint | Описание | Permission |
|---|---|---|
| `GET /applications/{app_id}/entities` | Сущности приложения | `entity.read@app` |
| `POST /applications/{app_id}/entities` | Создание | `entity.write@app` |
| `GET /applications/{app_id}/entities/{code}` | Детали | `entity.read@app` |
| `PATCH /applications/{app_id}/entities/{code}` | Изменение | `entity.write@app` |
| `DELETE /applications/{app_id}/entities/{code}` | Удаление (если нет записей) | `entity.admin@app` |
| `GET /entities/{id}/fields` | Поля | `entity.read@app` |
| `POST /entities/{id}/fields` | Добавить поле | `entity.write@app` |
| `PATCH /fields/{id}` | Изменить | `entity.write@app` |
| `DELETE /fields/{id}` | Удалить (если нет данных в этом поле) | `entity.write@app` |
| `GET /entities/{id}/relations` | Связи | `entity.read@app` |
| `POST /entities/{id}/relations` | Создать связь | `entity.write@app` |
| `GET /applications/{app_id}/metamodel` | Полная метамодель (для FE) | `entity.read@app` |

---

## 14. UI Model

| Endpoint | Описание | Permission |
|---|---|---|
| `GET /applications/{app_id}/pages` | Страницы | `page.read@app` |
| `POST /applications/{app_id}/pages` | Создание | `page.write@app` |
| `GET /pages/{id}` | Детали | `page.read@app` |
| `PATCH /pages/{id}` | Изменение | `page.write@app` |
| `DELETE /pages/{id}` | Удаление | `page.write@app` |
| `GET /pages/{id}/blocks` | Блоки страницы | `page.read@app` |
| `POST /pages/{id}/blocks` | Добавить блок | `page.write@app` |
| `PATCH /blocks/{id}` | Изменить | `page.write@app` |
| `DELETE /blocks/{id}` | Удалить | `page.write@app` |
| `PUT /pages/{id}/layout` | Сохранить весь grid-layout одним запросом (для drag-and-drop) | `page.write@app` |
| `GET /applications/{app_id}/navigation` | Меню | `page.read@app` |
| `PUT /applications/{app_id}/navigation` | Сохранить меню | `page.write@app` |

---

## 15. Rules

| Endpoint | Описание | Permission |
|---|---|---|
| `GET /applications/{app_id}/rules` | Список | `rule.read@app` |
| `POST /applications/{app_id}/rules` | Создание | `rule.write@app` |
| `GET /rules/{id}` | Детали | `rule.read@app` |
| `PATCH /rules/{id}` | Изменение | `rule.write@app` |
| `DELETE /rules/{id}` | Удаление | `rule.write@app` |
| `POST /rules/{id}/activate` | Активация | `rule.publish@app` |
| `POST /rules/{id}/deactivate` | Деактивация | `rule.publish@app` |
| `POST /rules/{id}/test` | Тестовый прогон с фиктивными данными | `rule.read@app` |
| `GET /rules/{id}/executions` | Журнал выполнения | `rule.read@app` |
| `GET /rules/{id}/conflicts` | Конфликты | `rule.read@app` |
| `POST /applications/{app_id}/rules/validate-cycles` | Проверка циклов перед публикацией | `app.publish` |

---

## 16. Workflow

| Endpoint | Описание | Permission |
|---|---|---|
| `GET /applications/{app_id}/processes` | Определения процессов | `process.read@app` |
| `POST /applications/{app_id}/processes` | Создание | `process.write@app` |
| `GET /processes/{id}` | Детали | `process.read@app` |
| `PATCH /processes/{id}` | Изменение | `process.write@app` |
| `DELETE /processes/{id}` | Удаление | `process.write@app` |
| `POST /processes/{id}/activate` | Активация | `process.publish@app` |
| `POST /records/{id}/processes/start` | Запустить процесс на записи | `record.write@entity` + `process.execute@app` |
| `GET /process-instances` | Активные экземпляры (мои/команды/все) | `process_instance.read` |
| `GET /process-instances/{id}` | Детали | `process_instance.read` |
| `GET /process-instances/{id}/history` | История переходов | `process_instance.read` |
| `POST /process-instances/{id}/transitions/{code}` | Выполнить переход | `process_instance.transition` (по правилам assignee) |
| `POST /process-instances/{id}/cancel` | Отменить | инициатор или `process_instance.admin` |
| `GET /me/tasks` | Мои задачи (где я assignee) | — |
| `GET /process-instances/{id}/timers` | Таймеры (debug) | `process_instance.admin` |

---

## 17. Records (runtime data)

**Сердце runtime**. URL включает сущность.

| Endpoint | Описание | Permission |
|---|---|---|
| `GET /apps/{app}/entities/{entity}/records` | Список (с фильтрами, см. §6) | `record.read@entity` |
| `POST /apps/{app}/entities/{entity}/records` | Создание | `record.create@entity` |
| `GET /apps/{app}/entities/{entity}/records/{id}` | Детали | `record.read@entity` |
| `PATCH /apps/{app}/entities/{entity}/records/{id}` | Изменение | `record.write@entity` |
| `DELETE /apps/{app}/entities/{entity}/records/{id}` | Soft-delete | `record.delete@entity` |
| `POST /apps/{app}/entities/{entity}/records/{id}/restore` | Из корзины | `record.delete@entity` |
| `GET /apps/{app}/entities/{entity}/records/{id}/versions` | История версий | `record.read@entity` |
| `GET /apps/{app}/entities/{entity}/records/{id}/versions/{no}` | Конкретная версия | `record.read@entity` |
| `POST /apps/{app}/entities/{entity}/records/bulk` | Массовое создание | `record.create@entity` + rate-limit |
| `PATCH /apps/{app}/entities/{entity}/records/bulk` | Массовое обновление по фильтру | `record.write@entity` + rate-limit |
| `GET /apps/{app}/entities/{entity}/recycle-bin` | Корзина по сущности | `record.delete@entity` |
| `GET /apps/{app}/recycle-bin` | Корзина по приложению | `record.delete@app` |
| `POST /apps/{app}/recycle-bin/purge` | Физическое удаление (152-ФЗ) | `record.purge` (только admin) |

### 17.1 Особенности

- `PATCH` принимает **частичный** payload (JSON Merge Patch).
- Конкурентность: запрос содержит `If-Match: <version>` (ETag). Несовпадение → `409 Conflict` с актуальной версией. Альтернатива: тело содержит `expected_version`.
- При `DELETE` запись помечается, реальные данные сохраняются. Каскад — по `metamodel.entity.soft_delete_on_cascade`.

---

## 18. Files

| Endpoint | Описание | Permission |
|---|---|---|
| `POST /files` | Загрузка (multipart). Возвращает `id` + статус `av_pending` | `file.upload` |
| `GET /files/{id}` | Метаданные | `file.read@record` (по связанному record) |
| `GET /files/{id}/content` | Скачивание (presigned URL S3, TTL 15 мин) | `file.read@record` |
| `DELETE /files/{id}` | Soft-delete файла | `file.write@record` |
| `GET /files/{id}/versions` | Версии | `file.read@record` |
| `POST /files/{id}/scan-status` | Получить AV-статус (для polling после загрузки) | `file.read@record` |

### 18.1 Загрузка

Body: `multipart/form-data`:
```
file: <binary>
record_id: <uuid|null>
field_id: <uuid|null>
```

Сервер:
1. Проверяет размер (≤100 МБ).
2. Определяет MIME через libmagic (не доверяет Content-Type).
3. Проверяет MIME по whitelist форматов сущности/поля.
4. Стримит в S3 (multipart upload).
5. Возвращает `201 Created` с `id` и `av_status: "pending"`.
6. Фоновый воркер запускает ClamAV → обновляет `av_status: "clean"|"infected"`.
7. Файл становится **доступен для скачивания только после `av_status="clean"`**.

---

## 19. Document registrator (ТЗ 3.10)

| Endpoint | Описание | Permission |
|---|---|---|
| `POST /document-registrations` | Зарегистрировать документ (получить номер) | `doc.register@type` |
| `GET /document-registrations` | Журнал регистрации | `doc.read` |
| `GET /document-registrations/{id}` | Детали | `doc.read` |
| `GET /filing-nomenclature` | Номенклатура дел (дерево) | `doc.read` |
| `POST /filing-nomenclature` | Создать дело | `doc.write` |
| `PATCH /filing-nomenclature/{id}` | Изменить | `doc.write` |
| `POST /filing-nomenclature/{id}/close` | Закрыть дело | `doc.admin` |
| `GET /filing-nomenclature/export` | Экспорт в Excel | `doc.read` |

---

## 20. Integrations

| Endpoint | Описание | Permission |
|---|---|---|
| `POST /imports` | Запуск импорта (асинхронно, 202) | `entity.write@target` |
| `GET /imports/{job_id}` | Статус | `entity.write@target` |
| `POST /imports/{job_id}/cancel` | Отмена | `entity.write@target` |
| `GET /imports/{job_id}/report` | Отчёт об ошибках | `entity.write@target` |
| `POST /exports` | Запуск экспорта (202) | `entity.read@source` |
| `GET /exports/{job_id}` | Статус (со ссылкой на результат) | `entity.read@source` |
| `GET /notification-templates` | Шаблоны | `notification.read` |
| `POST /notification-templates` | Создание | `notification.write` |
| `GET /notification-outbox` | Журнал отправок (фильтры) | `notification.read` |
| `POST /notification-outbox/{id}/retry` | Перезапуск failed/dlq | `notification.admin` |
| `GET /webhooks` | Webhook targets | `webhook.read` |
| `POST /webhooks` | Создание | `webhook.write` |
| `PATCH /webhooks/{id}` | Изменение (нельзя поменять secret) | `webhook.write` |
| `POST /webhooks/{id}/rotate-secret` | Ротация секрета | `webhook.admin` |
| `POST /webhooks/{id}/test` | Тестовый вызов | `webhook.write` |

---

## 21. Audit

| Endpoint | Описание | Permission |
|---|---|---|
| `GET /audit/log` | Поиск с фильтрами (action, actor, resource, period) | `audit.read` |
| `GET /audit/log/{id}` | Детали записи | `audit.read` |
| `GET /audit/pii-access` | Журнал доступа к ПДн (152-ФЗ) | `audit.pii.read` (только DPO/admin) |
| `GET /audit/suspicious` | Подозрительная активность | `audit.security.read` |
| `POST /audit/suspicious/{id}/acknowledge` | Подтверждение | `audit.security.read` |
| `GET /audit/integrity-check` | Проверка хэш-цепочки за период | `audit.security.read` |
| `GET /audit/export` | Экспорт за период (асинхронно, для регуляторов) | `audit.admin` |

---

## 22. Search и Metadata

| Endpoint | Описание | Permission |
|---|---|---|
| `GET /search?q=...` | Глобальный полнотекстовый поиск (по сущностям, доступным пользователю) | — (фильтрация по правам внутри) |
| `POST /search/cross-entity` | Сложный поиск с JSON-условием (`OR`, вложенные группы) | — (фильтрация по правам) |
| `GET /metadata/health` | Liveness | — (публичный) |
| `GET /metadata/version` | Версия приложения | — |
| `GET /metadata/openapi.json` | OpenAPI спецификация | — |
| `GET /metadata/permissions` | Каталог разрешений | `app.read` |

---

# Часть III — Матрица прав

## 23. Каталог разрешений

Permission code: `<resource>.<action>[@scope]`.

| Permission | Действие | Scope |
|---|---|---|
| `user.read` / `user.invite` / `user.write` / `user.admin` | Управление пользователями | глобальный |
| `group.read` / `group.write` / `group.admin` | Группы | глобальный |
| `role.read` / `role.admin` / `role.assign` | Роли | глобальный |
| `policy.read` / `policy.admin` | ABAC-политики | глобальный |
| `api_key.read` / `api_key.write` | API-ключи | глобальный |
| `module.read` | Каталог модулей | глобальный |
| `app.read` / `app.create` / `app.write` / `app.publish` / `app.admin` | Приложения | глобальный или per-app |
| `entity.read` / `entity.write` / `entity.admin` | Метамодель | per-app |
| `page.read` / `page.write` | UI-модель | per-app |
| `rule.read` / `rule.write` / `rule.publish` | Правила | per-app |
| `process.read` / `process.write` / `process.publish` | Определения процессов | per-app |
| `process_instance.read` / `process_instance.transition` / `process_instance.admin` | Экземпляры | per-instance (по assignee) |
| `record.read` / `record.create` / `record.write` / `record.delete` | CRUD записей | per-entity (с ABAC) |
| `record.purge` | Физическое удаление (152-ФЗ) | глобальный (только DPO) |
| `file.upload` / `file.read` / `file.write` | Файлы | per-record |
| `doc.read` / `doc.register@type` / `doc.write` / `doc.admin` | Документооборот | глобальный или per-type |
| `notification.read` / `notification.write` / `notification.admin` | Уведомления | глобальный |
| `webhook.read` / `webhook.write` / `webhook.admin` | Webhooks | глобальный |
| `audit.read` / `audit.security.read` / `audit.pii.read` / `audit.admin` | Аудит | глобальный |

### 23.1 Преднастроенные роли MVP

| Роль | Назначение | Permissions (укрупнённо) |
|---|---|---|
| `system_admin` | Платформенный администратор | все `*.admin`, `audit.admin`, `record.purge` |
| `app_admin` | Администратор приложения | `app.*`, `entity.*`, `page.*`, `rule.*`, `process.*` |
| `app_editor` | Конструктор без публикации | `app.read`, `entity.write`, `page.write`, `rule.write`, `process.write` |
| `data_manager` | Управление данными | `record.*`, `file.*`, `import/export` |
| `data_user` | Рядовой пользователь | `record.read`, `record.create`, `record.write` (через ABAC — только свои), `file.upload`, `process_instance.transition` |
| `viewer` | Только чтение | `*.read` (с ABAC) |
| `dpo` (Data Protection Officer) | Соответствие 152-ФЗ | `audit.pii.read`, `record.purge`, `policy.read` |
| `security_officer` | Безопасность | `audit.security.read`, `audit.read`, `user.admin` |
| `external_user` | Приглашённый (подрядчик) | минимальные — только конкретные приложения через ABAC |

---

## 24. Матрица Permission × Endpoint

Полная матрица (фрагмент — основа для тест-фикстур):

| Endpoint | system_admin | app_admin | app_editor | data_manager | data_user | viewer | external | dpo | security |
|---|---|---|---|---|---|---|---|---|---|
| `GET /users` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /users` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `GET /applications` | ✅ | ✅ | ✅ | ✅ | ABAC | ABAC | ABAC | ❌ | ❌ |
| `POST /applications` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /applications/{id}/publish` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /applications/{id}/entities` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /rules` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /rules/{id}/activate` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET .../records` | ✅ | ✅ | ✅ | ✅ | ABAC | ABAC | ABAC | ABAC | ❌ |
| `POST .../records` | ✅ | ✅ | ❌ | ✅ | ABAC | ❌ | ABAC | ❌ | ❌ |
| `DELETE .../records/{id}` | ✅ | ✅ | ❌ | ✅ | ABAC | ❌ | ❌ | ❌ | ❌ |
| `POST /recycle-bin/purge` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `POST /imports` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /exports` | ✅ | ✅ | ❌ | ✅ | ABAC + quota | ❌ | ABAC + quota | ❌ | ❌ |
| `POST /process-instances/{id}/transitions/{code}` | ✅ | ✅ | ❌ | ABAC | ABAC | ❌ | ABAC | ❌ | ❌ |
| `GET /audit/log` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `GET /audit/pii-access` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `GET /audit/suspicious` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**ABAC** = разрешение зависит от ABAC-политики (например, «свой отдел»). Конкретная проверка — на уровне сервиса с PolicyEngine, не на уровне роута.

Эта матрица — **источник правды для тест-генератора авторизации** (см. `RULES_AND_WORKFLOW.md` §21 и `ARCHITECTURE.md` §7).

---

## 25. ABAC-сценарии

Типовые ABAC-условия, поддерживаемые `condition_ast`:

| Сценарий | Условие (псевдо-DSL) |
|---|---|
| «Свои записи» | `record.created_by == user.id` |
| «Записи моего отдела» | `record.payload.department_id == user.department_id` |
| «Записи моих подчинённых» | `record.payload.assignee.manager_id == user.id` |
| «Только не закрытые» | `record.payload.status != 'closed'` |
| «Сумма ниже моего лимита подписания» | `record.payload.amount <= user.signing_limit` |
| «Регион из моего списка» | `record.payload.region in user.regions` |
| «Read-only после закрытия периода» | `record.payload.period_status != 'closed' OR action == 'read'` |

ABAC-политика хранится в `identity.abac_policy` с `condition_ast` (тот же AST, что и Rules Engine). Это **намеренно**: один интерпретатор, один валидатор, один тест-комплект, общая безопасность.

---

# Часть IV — Полные OpenAPI-фрагменты

## 26. Аутентификация (полный пример)

```yaml
openapi: 3.0.3
info:
  title: No-Code Platform API
  version: 1.0.0
  description: Контракт REST API MVP

servers:
  - url: https://api.platform.ru/api/v1
    description: Production
  - url: https://staging-api.platform.ru/api/v1
    description: Staging

paths:
  /auth/login:
    post:
      summary: Логин по email и паролю
      operationId: auth_login
      tags: [Auth]
      security: []   # публичный
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Успешный вход (без 2FA)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '401':
          description: Неверный email/пароль ИЛИ требуется 2FA
          content:
            application/problem+json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/ProblemDetails'
                  - $ref: '#/components/schemas/MfaRequiredResponse'
        '429':
          $ref: '#/components/responses/TooManyRequests'

  /auth/mfa/verify:
    post:
      summary: Подтверждение TOTP-кода
      operationId: auth_mfa_verify
      tags: [Auth]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [mfa_session, code]
              properties:
                mfa_session: { type: string, format: uuid }
                code: { type: string, pattern: '^\d{6}$' }
      responses:
        '200': { $ref: '#/components/responses/LoginSuccess' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '429': { $ref: '#/components/responses/TooManyRequests' }

  /auth/refresh:
    post:
      summary: Обновление пары токенов
      operationId: auth_refresh
      tags: [Auth]
      security:
        - refreshToken: []
      responses:
        '200': { $ref: '#/components/responses/LoginSuccess' }
        '401': { $ref: '#/components/responses/Unauthorized' }

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
    refreshToken:
      type: apiKey
      in: cookie
      name: refresh_token

  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:      { type: string, format: email, maxLength: 254 }
        password:   { type: string, minLength: 8, maxLength: 128 }
        device_fingerprint: { type: string, maxLength: 128 }

    LoginResponse:
      type: object
      required: [access_token, refresh_token, expires_in, user]
      properties:
        access_token:  { type: string }
        refresh_token: { type: string }
        token_type:    { type: string, enum: [Bearer] }
        expires_in:    { type: integer, description: "Срок access_token в секундах" }
        user:          { $ref: '#/components/schemas/UserMe' }

    MfaRequiredResponse:
      type: object
      required: [error, mfa_session]
      properties:
        error:       { type: string, enum: [mfa_required] }
        mfa_session: { type: string, format: uuid }
        expires_at:  { type: string, format: date-time }

    UserMe:
      type: object
      required: [id, email, full_name, roles]
      properties:
        id:         { type: string, format: uuid }
        email:      { type: string, format: email }
        full_name:  { type: string }
        roles:      { type: array, items: { type: string } }
        groups:     { type: array, items: { type: string } }
        locale:     { type: string }
        timezone:   { type: string }
        two_factor_enabled: { type: boolean }

    ProblemDetails:
      type: object
      required: [type, title, status]
      properties:
        type:    { type: string, format: uri }
        title:   { type: string }
        status:  { type: integer }
        detail:  { type: string }
        instance:{ type: string }
        code:    { type: string }
        trace_id:{ type: string }

  responses:
    LoginSuccess:
      description: Успешный вход
      content:
        application/json:
          schema: { $ref: '#/components/schemas/LoginResponse' }

    Unauthorized:
      description: Не авторизован
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/ProblemDetails' }

    TooManyRequests:
      description: Превышен rate limit
      headers:
        Retry-After: { schema: { type: integer } }
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/ProblemDetails' }
```

---

## 27. Records (полный пример)

```yaml
paths:
  /apps/{app}/entities/{entity}/records:
    parameters:
      - $ref: '#/components/parameters/AppCode'
      - $ref: '#/components/parameters/EntityCode'
    get:
      summary: Список записей сущности
      operationId: records_list
      tags: [Records]
      security:
        - bearerAuth: []
        - apiKey: []
      parameters:
        - in: query
          name: filter
          schema: { type: string }
          example: "status:eq:active,amount:gt:10000"
        - in: query
          name: sort
          schema: { type: string }
          example: "-created_at,name"
        - in: query
          name: fields
          schema: { type: string }
        - in: query
          name: cursor
          schema: { type: string }
        - in: query
          name: limit
          schema: { type: integer, minimum: 1, maximum: 200, default: 50 }
        - in: query
          name: include_deleted
          schema: { type: boolean, default: false }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                required: [items, page]
                properties:
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/Record' }
                  page: { $ref: '#/components/schemas/Pagination' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404':
          description: |
            Приложение или сущность не найдены — ИЛИ нет права читать
            (возвращаем единый код для защиты от enumeration).

    post:
      summary: Создать запись
      operationId: records_create
      tags: [Records]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [payload]
              properties:
                payload: { type: object, additionalProperties: true }
      responses:
        '201':
          description: Создано
          headers:
            Location: { schema: { type: string } }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Record' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '409': { $ref: '#/components/responses/Conflict' }
        '422': { $ref: '#/components/responses/UnprocessableEntity' }

  /apps/{app}/entities/{entity}/records/{id}:
    parameters:
      - $ref: '#/components/parameters/AppCode'
      - $ref: '#/components/parameters/EntityCode'
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
    get:
      summary: Получить запись
      operationId: records_get
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Record' }
        '404': { $ref: '#/components/responses/NotFound' }
    patch:
      summary: Изменить запись
      operationId: records_update
      parameters:
        - in: header
          name: If-Match
          schema: { type: integer, description: "Ожидаемая текущая версия (optimistic lock)" }
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                payload: { type: object }
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Record' }
        '409': { $ref: '#/components/responses/Conflict' }
        '422': { $ref: '#/components/responses/UnprocessableEntity' }
    delete:
      summary: Soft-delete записи
      operationId: records_delete
      responses:
        '204': { description: Удалено }
        '404': { $ref: '#/components/responses/NotFound' }
        '422': { $ref: '#/components/responses/UnprocessableEntity' }

components:
  parameters:
    AppCode:
      in: path
      name: app
      required: true
      schema: { type: string, maxLength: 64 }
    EntityCode:
      in: path
      name: entity
      required: true
      schema: { type: string, maxLength: 64 }
    IdempotencyKey:
      in: header
      name: Idempotency-Key
      required: false
      schema: { type: string, format: uuid }
      description: "Обязательно для запросов, изменяющих состояние"

  schemas:
    Record:
      type: object
      required: [id, entity_id, application_id, payload, version, created_at, updated_at]
      properties:
        id:             { type: string, format: uuid }
        entity_id:      { type: string, format: uuid }
        application_id: { type: string, format: uuid }
        payload:        { type: object, additionalProperties: true }
        status:         { type: string, nullable: true }
        is_deleted:     { type: boolean }
        deleted_at:     { type: string, format: date-time, nullable: true }
        version:        { type: integer }
        created_at:     { type: string, format: date-time }
        created_by:     { type: string, format: uuid, nullable: true }
        updated_at:     { type: string, format: date-time }
        updated_by:     { type: string, format: uuid, nullable: true }

    Pagination:
      type: object
      properties:
        cursor_next:     { type: string, nullable: true }
        cursor_prev:     { type: string, nullable: true }
        total_estimated: { type: integer, description: "Приблизительный счёт" }
```

---

## 28. Webhook events

Исходящие webhook (см. ТЗ 3.14.2, очередь 2). Формат payload — общий для всех событий:

```json
{
  "event": "record.created",
  "event_id": "uuid",
  "occurred_at": "2026-05-15T10:30:00Z",
  "delivery_attempt": 1,
  "application_id": "uuid",
  "entity_code": "expense_request",
  "data": {
    "record": { /* объект Record */ },
    "actor": { "user_id": "uuid", "type": "user" }
  }
}
```

Заголовки исходящего POST:
```
Content-Type: application/json
User-Agent: NoCodePlatform-Webhook/1.0
X-Webhook-Event: record.created
X-Webhook-Signature: sha256=<hmac-hex>
X-Webhook-Delivery-Id: <uuid>
```

`X-Webhook-Signature` = `HMAC-SHA256(secret, raw_body)`. Получатель валидирует.

### 28.1 Каталог событий

| Событие | Когда |
|---|---|
| `record.created` | Запись создана |
| `record.updated` | Запись изменена (diff в `data.changes`) |
| `record.deleted` | Soft-delete |
| `record.restored` | Восстановление из корзины |
| `process.started` | Запущен процесс на записи |
| `process.transitioned` | Переход в процессе (data: from/to stage) |
| `process.completed` | Процесс завершён |
| `process.cancelled` | Отменён |
| `process.sla_breached` | SLA нарушено |
| `file.uploaded` | Файл загружен и прошёл AV |
| `user.invited` | Пригласили нового пользователя |
| `user.deactivated` | Деактивирован |
| `suspicious.detected` | Подозрительная активность |

### 28.2 Гарантии доставки

- At-least-once (через outbox).
- Подписчик обязан быть идемпотентным по `X-Webhook-Delivery-Id`.
- Ретраи: 4 попытки с экспоненциальным backoff (1м, 5м, 30м, 4ч). После — DLQ + alert.
- Тайм-аут запроса: 10 сек. HTTP 2xx — успех; иначе — ретрай.

---

## Что дальше

После приёмки этой спецификации — последний шаг маршрута: **список вопросов к Figma** (какие сценарии в дизайне нужны в первую очередь, чтобы не блокировать спринт 2).
