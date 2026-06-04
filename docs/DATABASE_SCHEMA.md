# Схема базы данных — No-Code платформа

> Базовый DDL для PostgreSQL 16. Документ — спецификация для Alembic-миграций, не сам файл миграции. Команда BE генерирует миграции по этой схеме поэтапно (по спринтам — см. `../ARCHITECTURE.md` §8).

## Содержание

1. [Соглашения](#1-соглашения)
2. [Схемы (PostgreSQL schemas)](#2-схемы-postgresql-schemas)
3. [Identity & Access](#3-identity--access)
4. [App Catalog](#4-app-catalog)
5. [Metamodel](#5-metamodel)
6. [UI Model](#6-ui-model)
7. [Logic — Rules](#7-logic--rules)
8. [Logic — Workflow](#8-logic--workflow)
9. [Runtime Data](#9-runtime-data)
10. [Integrations & Delivery](#10-integrations--delivery)
11. [Audit & Governance](#11-audit--governance)
12. [Партиционирование и масштабирование](#12-партиционирование-и-масштабирование)
13. [Row-Level Security (RLS)](#13-row-level-security-rls)
14. [Шифрование чувствительных колонок](#14-шифрование-чувствительных-колонок)
15. [Стратегия бэкапов](#15-стратегия-бэкапов)
16. [Оценка размеров и нагрузка](#16-оценка-размеров-и-нагрузка)

---

## 1. Соглашения

| Тема | Правило |
|---|---|
| Идентификаторы | `UUID v4` (`gen_random_uuid()` из `pgcrypto`) для всех PK |
| Имена таблиц/колонок | `snake_case`, без префикса схемы в имени таблицы |
| Время | Хранение: `TIMESTAMPTZ` (UTC). Отображение — на клиенте по таймзоне пользователя |
| Деньги | `NUMERIC(18, 4)` — соответствует Приложению B ТЗ |
| Удаление | Soft: `is_deleted BOOLEAN`, `deleted_at TIMESTAMPTZ`, `deleted_by UUID`. Никакого `DELETE` из приложения — только `UPDATE`. Физическое удаление — отдельная админ-процедура |
| Аудит-поля | `created_at`, `updated_at`, `created_by`, `updated_by` — везде, проставляются триггерами |
| Оптимистическая блокировка | Колонка `version INT DEFAULT 1` на изменяемых сущностях, инкремент в `BEFORE UPDATE` |
| Внешние ключи | `ON DELETE RESTRICT` по умолчанию; `ON DELETE CASCADE` — только для технических связей (versions, history) |
| Имена ограничений | `pk_<table>`, `fk_<table>__<ref>`, `uq_<table>__<cols>`, `ix_<table>__<cols>`, `chk_<table>__<rule>` |
| Расширения PG | `pgcrypto` (UUID, crypt), `pg_trgm` (поиск по подстроке), `btree_gin` (комбинированные индексы) |

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
```

---

## 2. Схемы (PostgreSQL schemas)

Логическое разделение по контекстам — упрощает права доступа, бэкап-стратегию и навигацию.

```sql
CREATE SCHEMA identity;     -- пользователи, роли, права, сессии
CREATE SCHEMA catalog;      -- модули, приложения, шаблоны, версии
CREATE SCHEMA metamodel;    -- сущности, поля, связи
CREATE SCHEMA ui;           -- страницы, блоки, навигация
CREATE SCHEMA logic;        -- правила, процессы
CREATE SCHEMA data;         -- runtime data (записи, файлы)
CREATE SCHEMA integration;  -- уведомления, outbox, jobs
CREATE SCHEMA audit;        -- аудит, логи, ретеншн
```

**База приложения работает под ролью `app_user`** с привилегиями `USAGE` на все схемы и `SELECT/INSERT/UPDATE` на конкретные таблицы. **Запрет `DELETE`** на уровне роли — единственное исключение `app_admin` для админ-процедур.

```sql
CREATE ROLE app_user LOGIN PASSWORD :'app_user_pwd' NOINHERIT;
CREATE ROLE app_admin LOGIN PASSWORD :'app_admin_pwd' NOINHERIT;
CREATE ROLE app_readonly LOGIN PASSWORD :'app_readonly_pwd' NOINHERIT;

GRANT USAGE ON SCHEMA identity, catalog, metamodel, ui, logic, data, integration, audit TO app_user;
```

---

## 3. Identity & Access

### 3.1 `identity.user`

```sql
CREATE TABLE identity.user (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT          NOT NULL,
    full_name       VARCHAR(255)    NOT NULL,
    password_hash   VARCHAR(255),                       -- bcrypt; NULL для SSO-only
    password_changed_at TIMESTAMPTZ,
    must_change_password BOOLEAN     NOT NULL DEFAULT false,
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    is_locked       BOOLEAN         NOT NULL DEFAULT false,
    locked_until    TIMESTAMPTZ,
    failed_login_count INT          NOT NULL DEFAULT 0,
    last_login_at   TIMESTAMPTZ,
    last_login_ip   INET,
    locale          VARCHAR(8)      NOT NULL DEFAULT 'ru',
    timezone        VARCHAR(64)     NOT NULL DEFAULT 'Europe/Moscow',
    two_factor_enabled BOOLEAN      NOT NULL DEFAULT false,
    two_factor_secret_encrypted BYTEA,                  -- pgp_sym_encrypt
    external_idp    VARCHAR(32),                        -- 'yandex_id', 'ldap', 'gosuslugi'
    external_id     VARCHAR(255),
    is_deleted      BOOLEAN         NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version         INT             NOT NULL DEFAULT 1,
    CONSTRAINT uq_user__email_active UNIQUE (email) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT chk_user__password_or_external CHECK (
        password_hash IS NOT NULL OR external_idp IS NOT NULL
    )
);
CREATE UNIQUE INDEX ix_user__external ON identity.user (external_idp, external_id) WHERE external_idp IS NOT NULL;
CREATE INDEX ix_user__active ON identity.user (is_active, is_deleted);
```

**Заметки**: `CITEXT` для email — поиск без учёта регистра без `LOWER()`. `two_factor_secret_encrypted` — зашифрован через `pgp_sym_encrypt` (см. §14). Внешние пользователи (без password_hash) — приглашённые подрядчики/аудиторы с обязательным SSO.

### 3.2 `identity.group` и `identity.group_member`

```sql
CREATE TABLE identity.group (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    is_system       BOOLEAN         NOT NULL DEFAULT false,
    is_deleted      BOOLEAN         NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID,
    updated_by      UUID
);

CREATE TABLE identity.group_member (
    group_id        UUID            NOT NULL REFERENCES identity.group(id) ON DELETE CASCADE,
    user_id         UUID            NOT NULL REFERENCES identity.user(id) ON DELETE CASCADE,
    added_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    added_by        UUID,
    PRIMARY KEY (group_id, user_id)
);
CREATE INDEX ix_group_member__user ON identity.group_member (user_id);
```

### 3.3 `identity.role` и `identity.user_role`

```sql
CREATE TABLE identity.role (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    is_system       BOOLEAN         NOT NULL DEFAULT false,   -- системные роли: admin, viewer, editor
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- роль может быть назначена пользователю или группе
CREATE TABLE identity.user_role (
    user_id         UUID            NOT NULL REFERENCES identity.user(id) ON DELETE CASCADE,
    role_id         UUID            NOT NULL REFERENCES identity.role(id) ON DELETE CASCADE,
    scope_app_id    UUID,                                   -- NULL = глобально, иначе область приложения
    granted_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    granted_by      UUID,
    PRIMARY KEY (user_id, role_id, scope_app_id)
);
CREATE INDEX ix_user_role__role ON identity.user_role (role_id);
```

### 3.4 `identity.permission` и `identity.role_permission`

Модель: `(action, resource_pattern)` — атомарные права, привязываются к роли.

```sql
CREATE TABLE identity.permission (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(128)    NOT NULL UNIQUE,        -- 'app.create', 'entity.crm.lead.read'
    action          VARCHAR(32)     NOT NULL,               -- 'read'|'write'|'delete'|'execute'|'admin'
    resource_pattern VARCHAR(255)   NOT NULL,               -- 'app.*' или 'entity.<app>.<entity>'
    description     TEXT,
    is_system       BOOLEAN         NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE identity.role_permission (
    role_id         UUID            NOT NULL REFERENCES identity.role(id) ON DELETE CASCADE,
    permission_id   UUID            NOT NULL REFERENCES identity.permission(id) ON DELETE CASCADE,
    effect          VARCHAR(8)      NOT NULL DEFAULT 'allow' CHECK (effect IN ('allow','deny')),
    PRIMARY KEY (role_id, permission_id)
);
```

### 3.5 `identity.abac_policy` — атрибутивный доступ

```sql
CREATE TABLE identity.abac_policy (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(128)    NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    target_entity   VARCHAR(128)    NOT NULL,               -- 'entity.crm.lead'
    action          VARCHAR(32)     NOT NULL,
    -- условие в JSON-AST (тот же DSL, что и Rules Engine)
    condition_ast   JSONB           NOT NULL,
    effect          VARCHAR(8)      NOT NULL DEFAULT 'allow' CHECK (effect IN ('allow','deny')),
    priority        INT             NOT NULL DEFAULT 100,
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID
);
CREATE INDEX ix_abac__target_action ON identity.abac_policy (target_entity, action, is_active);
```

**Пример `condition_ast`**: `{"op":"eq","args":[{"field":"record.payload.department_id"},{"context":"user.department_id"}]}` — «пользователь видит только записи своего отдела» (типовой сценарий из ТЗ 3.1.4).

### 3.6 `identity.session`

```sql
CREATE TABLE identity.session (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES identity.user(id) ON DELETE CASCADE,
    refresh_token_hash CHAR(64)     NOT NULL UNIQUE,       -- SHA-256 hex
    device_fingerprint VARCHAR(128),
    ip_address      INET,
    user_agent      VARCHAR(512),
    issued_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ     NOT NULL,
    revoked_at      TIMESTAMPTZ,
    revoke_reason   VARCHAR(64)
);
CREATE INDEX ix_session__user_active ON identity.session (user_id) WHERE revoked_at IS NULL;
CREATE INDEX ix_session__expires ON identity.session (expires_at) WHERE revoked_at IS NULL;
```

### 3.7 `identity.api_key`

Для внешних интеграций (REST API, ТЗ 3.14.1).

```sql
CREATE TABLE identity.api_key (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)    NOT NULL,
    key_prefix      CHAR(8)         NOT NULL,                 -- видимая часть, для UX
    key_hash        CHAR(64)        NOT NULL UNIQUE,          -- SHA-256
    owner_user_id   UUID            NOT NULL REFERENCES identity.user(id),
    scopes          TEXT[]          NOT NULL DEFAULT '{}',    -- ['read:entities','write:records']
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ
);
CREATE INDEX ix_api_key__owner ON identity.api_key (owner_user_id) WHERE is_active = true;
```

### 3.8 `identity.password_history` — для политики паролей

```sql
CREATE TABLE identity.password_history (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES identity.user(id) ON DELETE CASCADE,
    password_hash   VARCHAR(255)    NOT NULL,
    changed_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX ix_pwd_history__user_time ON identity.password_history (user_id, changed_at DESC);
```

---

## 4. App Catalog

### 4.1 `catalog.module`

```sql
CREATE TABLE catalog.module (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64)     NOT NULL UNIQUE,        -- 'enterprise', 'docflow', 'tasks'
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    icon            VARCHAR(64),
    is_base         BOOLEAN         NOT NULL DEFAULT false, -- базовый модуль (Предприятие)
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE catalog.module_version (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID            NOT NULL REFERENCES catalog.module(id) ON DELETE CASCADE,
    version         VARCHAR(32)     NOT NULL,               -- SemVer: '1.2.3'
    manifest        JSONB           NOT NULL,               -- полный manifest.yaml в JSON
    changelog       TEXT,
    is_current      BOOLEAN         NOT NULL DEFAULT false,
    released_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    released_by     UUID,
    UNIQUE (module_id, version)
);
CREATE UNIQUE INDEX ix_module_version__current ON catalog.module_version (module_id) WHERE is_current = true;

CREATE TABLE catalog.module_dependency (
    module_id       UUID            NOT NULL REFERENCES catalog.module(id) ON DELETE CASCADE,
    depends_on_id   UUID            NOT NULL REFERENCES catalog.module(id),
    min_version     VARCHAR(32),
    PRIMARY KEY (module_id, depends_on_id),
    CHECK (module_id <> depends_on_id)
);
```

### 4.2 `catalog.application`

```sql
CREATE TABLE catalog.application (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    icon            VARCHAR(64),
    color           VARCHAR(16),
    category        VARCHAR(64),
    status          VARCHAR(16)     NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','archived')),
    current_version_id UUID,                                 -- FK добавим после создания application_version
    is_deleted      BOOLEAN         NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID,
    updated_by      UUID,
    version         INT             NOT NULL DEFAULT 1
);

CREATE TABLE catalog.application_module (
    application_id  UUID            NOT NULL REFERENCES catalog.application(id) ON DELETE CASCADE,
    module_id       UUID            NOT NULL REFERENCES catalog.module(id),
    module_version  VARCHAR(32)     NOT NULL,
    installed_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (application_id, module_id)
);

CREATE TABLE catalog.application_version (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID            NOT NULL REFERENCES catalog.application(id) ON DELETE CASCADE,
    version_no      INT             NOT NULL,
    snapshot        JSONB           NOT NULL,                -- полный JSON: entities, pages, blocks, rules, processes
    snapshot_hash   CHAR(64)        NOT NULL,                -- SHA-256(snapshot) — для дедупликации/целостности
    published_at    TIMESTAMPTZ,
    published_by    UUID,
    is_published    BOOLEAN         NOT NULL DEFAULT false,
    notes           TEXT,
    UNIQUE (application_id, version_no)
);
CREATE UNIQUE INDEX ix_app_version__published ON catalog.application_version (application_id) WHERE is_published = true;

ALTER TABLE catalog.application
    ADD CONSTRAINT fk_app__current_version
    FOREIGN KEY (current_version_id) REFERENCES catalog.application_version(id);
```

**Заметка**: одновременно опубликована только одна версия приложения (уникальный частичный индекс). Откат = создание новой версии из snapshot прошлой. Опубликованная версия редактированию не подлежит — только клонирование в новую черновую.

### 4.3 `catalog.app_template`

```sql
CREATE TABLE catalog.app_template (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64)     NOT NULL UNIQUE,    -- 'trading_company', 'service_company'
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    icon            VARCHAR(64),
    -- список модулей в шаблоне
    modules         JSONB           NOT NULL,           -- [{"code":"enterprise","min_version":"1.0.0"}, ...]
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
```

### 4.4 `catalog.editor_lock` — пессимистическая блокировка редактора

```sql
CREATE TABLE catalog.editor_lock (
    application_id  UUID            PRIMARY KEY REFERENCES catalog.application(id) ON DELETE CASCADE,
    locked_by       UUID            NOT NULL REFERENCES identity.user(id),
    locked_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    heartbeat_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ     NOT NULL
);
CREATE INDEX ix_editor_lock__expires ON catalog.editor_lock (expires_at);
```

Hot path — Redis (`editor_lock:app:<id>`), эта таблица — fallback и аудит.

---

## 5. Metamodel

Структура пользовательских сущностей. Это **не данные**, а описание формы данных.

### 5.1 `metamodel.entity`

```sql
CREATE TABLE metamodel.entity (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID            NOT NULL REFERENCES catalog.application(id) ON DELETE CASCADE,
    module_id       UUID            REFERENCES catalog.module(id),  -- NULL для user-defined
    code            VARCHAR(64)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    icon            VARCHAR(64),
    is_system       BOOLEAN         NOT NULL DEFAULT false,
    soft_delete_on_cascade BOOLEAN  NOT NULL DEFAULT false,  -- что делать при удалении родителя
    retention_days  INT,                                       -- ТЗ 3.9.2 (NULL = бессрочно)
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID,
    version         INT             NOT NULL DEFAULT 1,
    UNIQUE (application_id, code)
);
CREATE INDEX ix_entity__app ON metamodel.entity (application_id) WHERE is_active = true;
```

### 5.2 `metamodel.field`

```sql
CREATE TABLE metamodel.field (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID            NOT NULL REFERENCES metamodel.entity(id) ON DELETE CASCADE,
    code            VARCHAR(64)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    field_type      VARCHAR(32)     NOT NULL
                    CHECK (field_type IN (
                        'text','number','decimal','date','datetime','boolean',
                        'enum','file','relation','formula','currency','signature'
                    )),
    is_required     BOOLEAN         NOT NULL DEFAULT false,
    is_unique       BOOLEAN         NOT NULL DEFAULT false,
    is_indexed      BOOLEAN         NOT NULL DEFAULT false,  -- решает: создавать ли expression-index на payload
    is_searchable   BOOLEAN         NOT NULL DEFAULT false,  -- участвует в FTS
    is_pii          BOOLEAN         NOT NULL DEFAULT false,  -- маркировка ПДн (ТЗ 3.13)
    is_masked       BOOLEAN         NOT NULL DEFAULT false,  -- маскировать в UI/экспорте
    is_system       BOOLEAN         NOT NULL DEFAULT false,  -- id/created_at и т.п.
    -- параметры по типу
    default_value   JSONB,
    options         JSONB,                                    -- для enum, валидаторов, decimal scale, etc.
    ref_entity_id   UUID            REFERENCES metamodel.entity(id),  -- для relation
    relation_kind   VARCHAR(16)     CHECK (relation_kind IN ('one_to_one','many_to_one','many_to_many')),
    formula_ast     JSONB,                                    -- для formula-полей
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (entity_id, code),
    CHECK (field_type <> 'relation' OR ref_entity_id IS NOT NULL),
    CHECK (field_type <> 'formula'  OR formula_ast IS NOT NULL)
);
CREATE INDEX ix_field__entity_order ON metamodel.field (entity_id, display_order);
CREATE INDEX ix_field__pii ON metamodel.field (is_pii) WHERE is_pii = true;
```

### 5.3 `metamodel.relation`

Сложные relation (many-to-many с атрибутами) или явные «таблицы связи». one-to-many моделируется через `field.ref_entity_id`.

```sql
CREATE TABLE metamodel.relation (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id  UUID            NOT NULL REFERENCES metamodel.entity(id) ON DELETE CASCADE,
    to_entity_id    UUID            NOT NULL REFERENCES metamodel.entity(id),
    code            VARCHAR(64)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    on_delete       VARCHAR(16)     NOT NULL DEFAULT 'restrict'
                    CHECK (on_delete IN ('restrict','cascade','set_null')),
    UNIQUE (from_entity_id, code)
);
```

### 5.4 `metamodel.field_validator`

Валидаторы помимо обязательности/уникальности. **Один валидатор-тип на поле** (ТЗ 3.5.2 — модель 1:1, см. также §7).

```sql
CREATE TABLE metamodel.field_validator (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id        UUID            NOT NULL REFERENCES metamodel.field(id) ON DELETE CASCADE,
    validator_type  VARCHAR(32)     NOT NULL                  -- 'regex','range','length','mask'
                    CHECK (validator_type IN ('regex','range','length','mask','custom')),
    params          JSONB           NOT NULL,                 -- {"pattern": "^\\d{10}$"} и т.п.
    error_message   TEXT,
    UNIQUE (field_id, validator_type)
);
```

---

## 6. UI Model

### 6.1 `ui.page`

```sql
CREATE TABLE ui.page (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID            NOT NULL REFERENCES catalog.application(id) ON DELETE CASCADE,
    code            VARCHAR(64)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    path            VARCHAR(255)    NOT NULL,                  -- '/customers'
    icon            VARCHAR(64),
    layout          VARCHAR(16)     NOT NULL DEFAULT 'grid'
                    CHECK (layout IN ('grid','flex','single')),
    is_home         BOOLEAN         NOT NULL DEFAULT false,
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    -- роли, которым видна страница
    visible_to_roles UUID[]         NOT NULL DEFAULT '{}',
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (application_id, code),
    UNIQUE (application_id, path)
);
CREATE UNIQUE INDEX ix_page__home ON ui.page (application_id) WHERE is_home = true AND is_active = true;
```

### 6.2 `ui.block`

```sql
CREATE TABLE ui.block (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID            NOT NULL REFERENCES ui.page(id) ON DELETE CASCADE,
    parent_block_id UUID            REFERENCES ui.block(id) ON DELETE CASCADE,  -- для контейнеров
    block_type      VARCHAR(32)     NOT NULL,                  -- 'form','table','chart','kpi','button','tabs',...
    code            VARCHAR(64)     NOT NULL,
    -- bind на сущность (если применимо)
    bound_entity_id UUID            REFERENCES metamodel.entity(id),
    -- параметры блока: какие поля показывать, фильтры, заголовки, цвета и т.д.
    config          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    -- сетка: координаты в редакторе
    grid_x          INT             NOT NULL DEFAULT 0,
    grid_y          INT             NOT NULL DEFAULT 0,
    grid_w          INT             NOT NULL DEFAULT 12,
    grid_h          INT             NOT NULL DEFAULT 4,
    -- адаптивная вёрстка для мобильного — отдельный layout
    mobile_config   JSONB,
    is_visible      BOOLEAN         NOT NULL DEFAULT true,
    visibility_rule_id UUID,                                   -- FK на logic.rule (видимость), добавим ниже
    visible_to_roles UUID[]         NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (page_id, code)
);
CREATE INDEX ix_block__page ON ui.block (page_id);
CREATE INDEX ix_block__entity ON ui.block (bound_entity_id) WHERE bound_entity_id IS NOT NULL;
```

### 6.3 `ui.navigation`

```sql
CREATE TABLE ui.navigation (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID            NOT NULL REFERENCES catalog.application(id) ON DELETE CASCADE,
    parent_id       UUID            REFERENCES ui.navigation(id) ON DELETE CASCADE,
    page_id         UUID            REFERENCES ui.page(id),
    label           VARCHAR(255)    NOT NULL,
    icon            VARCHAR(64),
    display_order   INT             NOT NULL DEFAULT 0,
    visible_to_roles UUID[]         NOT NULL DEFAULT '{}'
);
CREATE INDEX ix_nav__app_parent ON ui.navigation (application_id, parent_id);
```

---

## 7. Logic — Rules

### 7.1 `logic.rule`

```sql
CREATE TABLE logic.rule (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID            NOT NULL REFERENCES catalog.application(id) ON DELETE CASCADE,
    entity_id       UUID            REFERENCES metamodel.entity(id),
    field_id        UUID            REFERENCES metamodel.field(id),  -- для правил, привязанных к полю
    code            VARCHAR(64)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    rule_type       VARCHAR(32)     NOT NULL
                    CHECK (rule_type IN (
                        'validation','autofill','visibility','trigger',
                        'routing','access','calc','notification'
                    )),
    -- AST в JSON (ИФ/ТО/ИНАЧЕ, И/ИЛИ/НЕ)
    condition_ast   JSONB           NOT NULL,                 -- {"op":"gt","args":[...]}
    action_ast      JSONB           NOT NULL,                 -- что делать
    priority        INT             NOT NULL DEFAULT 100,     -- меньше = выше, ТЗ 3.5.4
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    timeout_ms      INT             NOT NULL DEFAULT 113000   -- ТЗ 3.5.3
                    CHECK (timeout_ms > 0 AND timeout_ms <= 113000),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID,
    version         INT             NOT NULL DEFAULT 1,
    UNIQUE (application_id, code)
);

-- Модель 1:1 (ТЗ 3.5.2): для трёх типов правил — не более одного на поле
CREATE UNIQUE INDEX ix_rule__one_per_field
    ON logic.rule (field_id, rule_type)
    WHERE rule_type IN ('validation','autofill','visibility') AND field_id IS NOT NULL AND is_active = true;

CREATE INDEX ix_rule__entity_active ON logic.rule (entity_id, is_active);
CREATE INDEX ix_rule__priority ON logic.rule (application_id, priority);
```

### 7.2 `logic.rule_dependency` — граф зависимостей

Для обнаружения циклов (ТЗ 3.5.3) и определения порядка применения.

```sql
CREATE TABLE logic.rule_dependency (
    rule_id         UUID            NOT NULL REFERENCES logic.rule(id) ON DELETE CASCADE,
    depends_on_field_id UUID        NOT NULL REFERENCES metamodel.field(id) ON DELETE CASCADE,
    PRIMARY KEY (rule_id, depends_on_field_id)
);
```

Циклы детектируются на этапе публикации приложения через рекурсивный CTE по этой таблице + полям, в которые правило **записывает**.

### 7.3 `logic.rule_conflict_log`

```sql
CREATE TABLE logic.rule_conflict_log (
    id              BIGSERIAL       PRIMARY KEY,
    occurred_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    record_id       UUID,
    entity_id       UUID,
    field_id        UUID,
    rule_id_winner  UUID            NOT NULL,
    rule_ids_losers UUID[]          NOT NULL,
    value_winner    JSONB,
    values_losers   JSONB
);
CREATE INDEX ix_rule_conflict__time ON logic.rule_conflict_log (occurred_at DESC);
CREATE INDEX ix_rule_conflict__record ON logic.rule_conflict_log (record_id);
```

### 7.4 `logic.rule_execution_log`

Журнал выполнения правил в production (ТЗ 3.11.2).

```sql
CREATE TABLE logic.rule_execution_log (
    id              BIGSERIAL       PRIMARY KEY,
    rule_id         UUID            NOT NULL,
    record_id       UUID,
    user_id         UUID,
    started_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    duration_ms     INT,
    status          VARCHAR(16)     NOT NULL                  -- 'success','error','timeout','rolled_back'
                    CHECK (status IN ('success','error','timeout','rolled_back')),
    error_stage     VARCHAR(64),
    error_message   TEXT,
    context         JSONB                                       -- срез данных для отладки
) PARTITION BY RANGE (started_at);

-- начальные партиции (создавать каждый месяц через миграцию)
CREATE TABLE logic.rule_execution_log_2026_05 PARTITION OF logic.rule_execution_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX ix_rule_exec__rule_time ON logic.rule_execution_log (rule_id, started_at DESC);
CREATE INDEX ix_rule_exec__status_time ON logic.rule_execution_log (status, started_at DESC) WHERE status <> 'success';
```

### 7.5 FK назад из `ui.block.visibility_rule_id`

```sql
ALTER TABLE ui.block
    ADD CONSTRAINT fk_block__visibility_rule
    FOREIGN KEY (visibility_rule_id) REFERENCES logic.rule(id) ON DELETE SET NULL;
```

---

## 8. Logic — Workflow

### 8.1 `logic.process_definition`

```sql
CREATE TABLE logic.process_definition (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID            NOT NULL REFERENCES catalog.application(id) ON DELETE CASCADE,
    entity_id       UUID            NOT NULL REFERENCES metamodel.entity(id),
    code            VARCHAR(64)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    -- DSL процесса целиком (этапы, переходы, SLA, эскалации)
    definition      JSONB           NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version         INT             NOT NULL DEFAULT 1,
    UNIQUE (application_id, code)
);

CREATE TABLE logic.process_stage (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    process_definition_id UUID      NOT NULL REFERENCES logic.process_definition(id) ON DELETE CASCADE,
    code            VARCHAR(64)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    stage_type      VARCHAR(16)     NOT NULL DEFAULT 'task'
                    CHECK (stage_type IN ('task','approval','automation','start','end')),
    -- ответственный: либо user_id, либо группа, либо роль, либо поле записи
    assignee_kind   VARCHAR(16)     NOT NULL CHECK (assignee_kind IN ('user','group','role','field')),
    assignee_ref    VARCHAR(255)    NOT NULL,                -- user_id|group_id|role_id|field_code
    sla_minutes     INT,                                       -- SLA на этап
    -- эскалация
    escalation_l1_minutes INT,
    escalation_l2_minutes INT,
    auto_change_assignee_on_sla BOOLEAN NOT NULL DEFAULT false,
    display_order   INT             NOT NULL DEFAULT 0,
    UNIQUE (process_definition_id, code)
);

CREATE TABLE logic.process_transition (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    process_definition_id UUID      NOT NULL REFERENCES logic.process_definition(id) ON DELETE CASCADE,
    from_stage_id   UUID            NOT NULL REFERENCES logic.process_stage(id) ON DELETE CASCADE,
    to_stage_id     UUID            NOT NULL REFERENCES logic.process_stage(id),
    code            VARCHAR(64)     NOT NULL,                -- 'approve','reject','start_review'
    label           VARCHAR(255)    NOT NULL,
    condition_ast   JSONB,                                     -- опциональное условие перехода
    UNIQUE (process_definition_id, from_stage_id, code)
);
```

### 8.2 `logic.process_instance`

```sql
CREATE TABLE logic.process_instance (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    process_definition_id UUID      NOT NULL REFERENCES logic.process_definition(id),
    record_id       UUID            NOT NULL,                  -- ссылка на data.record
    current_stage_id UUID           REFERENCES logic.process_stage(id),
    status          VARCHAR(16)     NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','completed','cancelled','error')),
    initiated_by    UUID            NOT NULL,
    started_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    cancel_reason   TEXT
);
-- Только один активный процесс на запись
CREATE UNIQUE INDEX ix_proc_inst__one_active_per_record
    ON logic.process_instance (record_id)
    WHERE status = 'running';
CREATE INDEX ix_proc_inst__definition_status ON logic.process_instance (process_definition_id, status);
CREATE INDEX ix_proc_inst__current_stage ON logic.process_instance (current_stage_id) WHERE status = 'running';
```

### 8.3 `logic.process_history`

```sql
CREATE TABLE logic.process_history (
    id              BIGSERIAL       PRIMARY KEY,
    process_instance_id UUID        NOT NULL REFERENCES logic.process_instance(id) ON DELETE CASCADE,
    from_stage_id   UUID,
    to_stage_id     UUID,
    transition_id   UUID,
    actor_user_id   UUID,
    occurred_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    comment         TEXT,
    payload         JSONB                                       -- доп. данные перехода
);
CREATE INDEX ix_proc_history__instance ON logic.process_history (process_instance_id, occurred_at);
```

### 8.4 `logic.process_timer`

Таймеры SLA и эскалаций. Celery beat сканирует каждую минуту.

```sql
CREATE TABLE logic.process_timer (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    process_instance_id UUID        NOT NULL REFERENCES logic.process_instance(id) ON DELETE CASCADE,
    stage_id        UUID            NOT NULL REFERENCES logic.process_stage(id),
    timer_kind      VARCHAR(32)     NOT NULL
                    CHECK (timer_kind IN ('sla','escalation_l1','escalation_l2','auto_reassign')),
    fires_at        TIMESTAMPTZ     NOT NULL,
    fired_at        TIMESTAMPTZ,
    is_cancelled    BOOLEAN         NOT NULL DEFAULT false
);
CREATE INDEX ix_timer__due ON logic.process_timer (fires_at) WHERE fired_at IS NULL AND is_cancelled = false;
```

---

## 9. Runtime Data

Это **сердце системы** — здесь хранятся реальные данные пользовательских сущностей.

### 9.1 `data.record` — главная таблица

```sql
CREATE TABLE data.record (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    entity_id       UUID            NOT NULL REFERENCES metamodel.entity(id),
    tenant_id       UUID,                                      -- задел на multi-tenant (всегда NULL в MVP)
    application_id  UUID            NOT NULL REFERENCES catalog.application(id),
    payload         JSONB           NOT NULL DEFAULT '{}'::jsonb,
    status          VARCHAR(32),                                -- системный статус записи (если есть workflow)
    -- soft delete
    is_deleted      BOOLEAN         NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,
    -- ретеншн: дата, после которой запись попадает в архив (рассчитывается по metamodel.entity.retention_days)
    expires_at      TIMESTAMPTZ,
    -- аудит
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      UUID,
    version         INT             NOT NULL DEFAULT 1,
    PRIMARY KEY (entity_id, id)                                 -- partition key first
) PARTITION BY HASH (entity_id);

-- 16 партиций по умолчанию; при росте — пересоздаём с большим числом или переходим на LIST по entity_id
CREATE TABLE data.record_p00 PARTITION OF data.record FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE data.record_p01 PARTITION OF data.record FOR VALUES WITH (MODULUS 16, REMAINDER 1);
-- ... p02..p15
```

**Базовые индексы** (создаются глобально на партиционированной таблице):

```sql
CREATE INDEX ix_record__entity_not_deleted
    ON data.record (entity_id, created_at DESC)
    WHERE is_deleted = false;

CREATE INDEX ix_record__entity_deleted
    ON data.record (entity_id, deleted_at DESC)
    WHERE is_deleted = true;

-- GIN на payload для поиска по любым полям JSONB
CREATE INDEX ix_record__payload_gin
    ON data.record USING GIN (payload jsonb_path_ops);

-- частичные expression-индексы создаём динамически на is_indexed-поля метамодели
-- пример (генерируется миграцией модуля при is_indexed=true для поля 'status'):
-- CREATE INDEX ix_record__entity_<id>_status
--     ON data.record ((payload->>'status'))
--     WHERE entity_id = '<entity_id>' AND is_deleted = false;

CREATE INDEX ix_record__expires
    ON data.record (expires_at)
    WHERE is_deleted = false AND expires_at IS NOT NULL;
```

**Заметка о производительности**: GIN на JSONB даёт хорошее покрытие, но точные предикаты (`payload->>'field' = 'value'`) на горячих полях должны иметь **expression-индексы** (создаются генератором при `field.is_indexed = true`). Это компромисс между гибкостью no-code и скоростью SQL.

### 9.2 `data.record_version` — версии записей

```sql
CREATE TABLE data.record_version (
    id              BIGSERIAL       PRIMARY KEY,
    record_id       UUID            NOT NULL,
    entity_id       UUID            NOT NULL,
    version_no      INT             NOT NULL,
    payload_diff    JSONB           NOT NULL,                  -- diff от предыдущей версии
    changed_by      UUID,
    changed_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    operation       VARCHAR(16)     NOT NULL CHECK (operation IN ('create','update','soft_delete','restore'))
) PARTITION BY RANGE (changed_at);

-- партиции по месяцам
CREATE TABLE data.record_version_2026_05 PARTITION OF data.record_version
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX ix_record_ver__record ON data.record_version (record_id, version_no DESC);
```

**Хранение diff, не полной копии**: на 1М записей с активным редактированием полные snapshot'ы раздуют БД в разы. Diff восстанавливается рекурсивно от последней целой версии (snapshot раз в N изменений).

### 9.3 `data.file` и `data.file_version`

```sql
CREATE TABLE data.file (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id       UUID,                                      -- может быть прикреплён к записи
    field_id        UUID            REFERENCES metamodel.field(id),
    original_name   VARCHAR(512)    NOT NULL,
    mime_type       VARCHAR(128)    NOT NULL,
    size_bytes      BIGINT          NOT NULL,
    storage_key     VARCHAR(512)    NOT NULL UNIQUE,           -- ключ в S3
    checksum_sha256 CHAR(64)        NOT NULL,
    av_status       VARCHAR(16)     NOT NULL DEFAULT 'pending' -- ClamAV
                    CHECK (av_status IN ('pending','clean','infected','error')),
    av_scanned_at   TIMESTAMPTZ,
    av_signature    VARCHAR(255),
    uploaded_by     UUID            NOT NULL,
    uploaded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    is_deleted      BOOLEAN         NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,
    -- частичные индексы по статусу AV
    CONSTRAINT chk_file__size CHECK (size_bytes > 0)
);
CREATE INDEX ix_file__record ON data.file (record_id) WHERE is_deleted = false;
CREATE INDEX ix_file__av_pending ON data.file (av_status, uploaded_at) WHERE av_status = 'pending';

CREATE TABLE data.file_version (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id         UUID            NOT NULL REFERENCES data.file(id) ON DELETE CASCADE,
    version_no      INT             NOT NULL,
    storage_key     VARCHAR(512)    NOT NULL,
    size_bytes      BIGINT          NOT NULL,
    checksum_sha256 CHAR(64)        NOT NULL,
    created_by      UUID,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (file_id, version_no)
);
```

**Важно**: файлы в БД **не хранятся** — только метаданные. Бинарь — в S3 (managed) или MinIO. Доступ — только через подписанные URL с TTL 15 мин (ТЗ 3.7.1).

### 9.4 `data.document_registration` — встроенный регистратор (ТЗ 3.10)

```sql
CREATE TABLE data.document_registration (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id       UUID            NOT NULL,                  -- ссылка на data.record (документ)
    doc_type        VARCHAR(16)     NOT NULL                   -- 'incoming','outgoing','internal'
                    CHECK (doc_type IN ('incoming','outgoing','internal')),
    registration_no VARCHAR(64)     NOT NULL,
    department_code VARCHAR(32),
    filing_id       UUID            REFERENCES data.filing_nomenclature(id),
    registered_at   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    registered_by   UUID,
    UNIQUE (doc_type, registration_no)
);
CREATE INDEX ix_doc_reg__filing ON data.document_registration (filing_id);

-- Счётчики номеров (атомарно растущие)
CREATE TABLE data.registration_counter (
    doc_type        VARCHAR(16)     NOT NULL,
    department_code VARCHAR(32)     NOT NULL DEFAULT '',
    year            INT             NOT NULL,
    month           INT             NOT NULL DEFAULT 0,
    next_value      BIGINT          NOT NULL DEFAULT 1,
    PRIMARY KEY (doc_type, department_code, year, month)
);
```

Получение номера — через `UPDATE ... RETURNING` для атомарности.

### 9.5 `data.filing_nomenclature` — номенклатура дел

```sql
CREATE TABLE data.filing_nomenclature (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       UUID            REFERENCES data.filing_nomenclature(id) ON DELETE RESTRICT,
    index_code      VARCHAR(64)     NOT NULL,                  -- '01-05'
    title           VARCHAR(512)    NOT NULL,
    retention_years INT,                                        -- срок хранения дела
    storage_location VARCHAR(255),
    status          VARCHAR(16)     NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','closed','archived')),
    closed_at       TIMESTAMPTZ,
    responsible_user_id UUID,
    UNIQUE (parent_id, index_code)
);
CREATE INDEX ix_filing__parent ON data.filing_nomenclature (parent_id, status);
```

### 9.6 `data.recycle_bin` — индекс корзины

Корзина — это `data.record WHERE is_deleted = true`, но для быстрого UI корзины (один список по всем сущностям) полезен материализованный view.

```sql
CREATE MATERIALIZED VIEW data.recycle_bin AS
SELECT
    r.id AS record_id,
    r.entity_id,
    e.application_id,
    e.code AS entity_code,
    e.name AS entity_name,
    r.payload->>'name' AS display_name,
    r.deleted_at,
    r.deleted_by,
    r.expires_at
FROM data.record r
JOIN metamodel.entity e ON e.id = r.entity_id
WHERE r.is_deleted = true;

CREATE INDEX ix_recycle__deleted_at ON data.recycle_bin (deleted_at DESC);
CREATE INDEX ix_recycle__app ON data.recycle_bin (application_id);
-- REFRESH MATERIALIZED VIEW CONCURRENTLY data.recycle_bin; — раз в 5 мин Celery beat
```

---

## 10. Integrations & Delivery

### 10.1 `integration.notification_template`

```sql
CREATE TABLE integration.notification_template (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    channel         VARCHAR(16)     NOT NULL
                    CHECK (channel IN ('email','telegram','in_app','sms','webhook')),
    subject         VARCHAR(512),                              -- для email
    body            TEXT            NOT NULL,                  -- с плейсхолдерами {{var}}
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
```

### 10.2 `integration.notification_outbox` — гарантия доставки

```sql
CREATE TABLE integration.notification_outbox (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID            REFERENCES integration.notification_template(id),
    channel         VARCHAR(16)     NOT NULL,
    recipient_kind  VARCHAR(16)     NOT NULL CHECK (recipient_kind IN ('user','external','webhook')),
    recipient_ref   VARCHAR(512)    NOT NULL,                  -- user_id | email | URL
    subject         VARCHAR(512),
    body            TEXT            NOT NULL,                  -- уже отрендеренный
    payload         JSONB,                                       -- доп. данные (для webhook)
    status          VARCHAR(16)     NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sending','sent','failed','dlq')),
    attempt_count   INT             NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_error      TEXT,
    sent_at         TIMESTAMPTZ,
    -- для идемпотентности: одно и то же событие не дублируем
    dedup_key       VARCHAR(255)    UNIQUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX ix_outbox__due ON integration.notification_outbox (next_attempt_at)
    WHERE status IN ('pending','failed');
CREATE INDEX ix_outbox__recipient ON integration.notification_outbox (recipient_ref, sent_at DESC);
```

### 10.3 `integration.webhook_target`

```sql
CREATE TABLE integration.webhook_target (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    url             VARCHAR(1024)   NOT NULL,
    secret_encrypted BYTEA           NOT NULL,                  -- HMAC secret
    events          TEXT[]          NOT NULL DEFAULT '{}',     -- ['record.created','record.updated']
    headers         JSONB,
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    -- защита от SSRF: только URL из whitelist схем/доменов, валидация на уровне приложения
    CONSTRAINT chk_webhook__https CHECK (url ~* '^https://')
);
```

### 10.4 `integration.import_job` и `integration.export_job`

```sql
CREATE TABLE integration.import_job (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID            NOT NULL,
    entity_id       UUID            NOT NULL,
    source_file_id  UUID            REFERENCES data.file(id),
    mapping         JSONB           NOT NULL,                  -- {колонка_файла → код_поля}
    mode            VARCHAR(16)     NOT NULL DEFAULT 'skip_errors'
                    CHECK (mode IN ('skip_errors','abort_on_error','update_by_key')),
    update_key_field VARCHAR(64),
    status          VARCHAR(16)     NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','validating','running','completed','failed','cancelled')),
    total_rows      INT,
    imported_rows   INT             NOT NULL DEFAULT 0,
    skipped_rows    INT             NOT NULL DEFAULT 0,
    error_rows      INT             NOT NULL DEFAULT 0,
    error_report    JSONB,
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    initiated_by    UUID,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE integration.export_job (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID            NOT NULL,
    entity_id       UUID            NOT NULL,
    format          VARCHAR(16)     NOT NULL CHECK (format IN ('xlsx','csv','pdf','json')),
    filter_ast      JSONB,
    columns         TEXT[]          NOT NULL,
    apply_masking   BOOLEAN         NOT NULL DEFAULT true,     -- ТЗ 3.13
    status          VARCHAR(16)     NOT NULL DEFAULT 'pending',
    result_file_id  UUID            REFERENCES data.file(id),
    row_count       INT,
    initiated_by    UUID            NOT NULL,
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX ix_export__user_time ON integration.export_job (initiated_by, created_at DESC);
```

---

## 11. Audit & Governance

### 11.1 `audit.audit_log` — главный append-only журнал

```sql
CREATE TABLE audit.audit_log (
    id              BIGSERIAL       PRIMARY KEY,
    occurred_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    actor_user_id   UUID,
    actor_api_key_id UUID,
    actor_ip        INET,
    actor_user_agent VARCHAR(512),
    action          VARCHAR(64)     NOT NULL,                  -- 'auth.login','record.create','permission.grant'
    resource_type   VARCHAR(64),
    resource_id     UUID,
    application_id  UUID,
    entity_id       UUID,
    payload_before  JSONB,
    payload_after   JSONB,
    result          VARCHAR(16)     NOT NULL DEFAULT 'success'
                    CHECK (result IN ('success','failure','denied')),
    error_message   TEXT,
    -- hash-цепочка
    prev_hash       CHAR(64),
    row_hash        CHAR(64)        NOT NULL                  -- SHA-256(prev_hash || id || occurred_at || action || ...)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE audit.audit_log_2026_05 PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX ix_audit__actor_time ON audit.audit_log (actor_user_id, occurred_at DESC);
CREATE INDEX ix_audit__resource ON audit.audit_log (resource_type, resource_id);
CREATE INDEX ix_audit__action_time ON audit.audit_log (action, occurred_at DESC);

-- ЗАПРЕТ UPDATE и DELETE
CREATE OR REPLACE FUNCTION audit.deny_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit.audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit__no_update
    BEFORE UPDATE ON audit.audit_log
    FOR EACH ROW EXECUTE FUNCTION audit.deny_mutation();

CREATE TRIGGER trg_audit__no_delete
    BEFORE DELETE ON audit.audit_log
    FOR EACH ROW EXECUTE FUNCTION audit.deny_mutation();
```

**Замечание**: триггеры на партиционированной таблице нужно вешать на родителя и на каждую партицию (PG специфика). Это делает миграция при создании новых партиций.

### 11.2 `audit.pii_access_log` — для 152-ФЗ

Отдельный журнал доступа к ПДн. Хранение 3 года.

```sql
CREATE TABLE audit.pii_access_log (
    id              BIGSERIAL       PRIMARY KEY,
    occurred_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    actor_user_id   UUID            NOT NULL,
    subject_record_id UUID          NOT NULL,                  -- запись с ПДн
    entity_code     VARCHAR(64)     NOT NULL,
    fields_accessed TEXT[]          NOT NULL,                  -- ['passport_no','birth_date']
    purpose         VARCHAR(255),                                -- цель доступа
    actor_ip        INET
) PARTITION BY RANGE (occurred_at);

CREATE TABLE audit.pii_access_log_2026_05 PARTITION OF audit.pii_access_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX ix_pii__actor ON audit.pii_access_log (actor_user_id, occurred_at DESC);
CREATE INDEX ix_pii__subject ON audit.pii_access_log (subject_record_id, occurred_at DESC);

CREATE TRIGGER trg_pii__no_update BEFORE UPDATE ON audit.pii_access_log
    FOR EACH ROW EXECUTE FUNCTION audit.deny_mutation();
CREATE TRIGGER trg_pii__no_delete BEFORE DELETE ON audit.pii_access_log
    FOR EACH ROW EXECUTE FUNCTION audit.deny_mutation();
```

### 11.3 `audit.suspicious_activity` — события безопасности

```sql
CREATE TABLE audit.suspicious_activity (
    id              BIGSERIAL       PRIMARY KEY,
    detected_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    category        VARCHAR(32)     NOT NULL
                    CHECK (category IN (
                        'brute_force','mass_delete','bulk_export',
                        'new_geo','privilege_escalation','rule_loop','other'
                    )),
    severity        VARCHAR(8)      NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),
    actor_user_id   UUID,
    actor_ip        INET,
    details         JSONB           NOT NULL,
    is_acknowledged BOOLEAN         NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID
);
CREATE INDEX ix_susp__unack_severity ON audit.suspicious_activity (severity, detected_at DESC)
    WHERE is_acknowledged = false;
```

### 11.4 `audit.retention_policy`

```sql
CREATE TABLE audit.retention_policy (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID            REFERENCES metamodel.entity(id) ON DELETE CASCADE,
    active_days     INT,                                       -- ТЗ 3.9.2
    soft_deleted_days INT,                                      -- срок хранения в корзине
    expired_action  VARCHAR(16)     NOT NULL DEFAULT 'archive'
                    CHECK (expired_action IN ('archive','notify_admin')),
    warn_days_before INT             NOT NULL DEFAULT 14,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (entity_id)
);
```

---

## 12. Партиционирование и масштабирование

| Таблица | Стратегия | Размер триггер | Заметки |
|---|---|---|---|
| `data.record` | HASH по `entity_id`, 16 партиций | Сразу | Один тип = одна партиция в среднем; пересоздаём в LIST для горячих сущностей >5М записей |
| `data.record_version` | RANGE по `changed_at`, по месяцам | Сразу | Старые партиции (>2 года) — отдельно на холодное хранилище через `pg_partman` |
| `audit.audit_log` | RANGE по `occurred_at`, по месяцам | Сразу | Через 2 года — `DETACH` партиции + экспорт в WORM (S3 Object Lock) |
| `audit.pii_access_log` | RANGE по `occurred_at`, по месяцам | Сразу | Хранение 3 года, после — `DETACH` |
| `logic.rule_execution_log` | RANGE по `started_at`, по месяцам | Сразу | Хранение 6 мес (ТЗ не задаёт, разумный default) |

Новые партиции создаёт `pg_partman` (extension) или Celery beat-задача за 7 дней до начала следующего периода.

**Read-replica**: managed-провайдер настроит автоматически. На реплику направляем: отчёты, экспорт, аналитику дашбордов. Запись — только на primary.

**Connection pooling**: pgBouncer перед PG, режим `transaction`, не `session` (FastAPI асинхронный). Параметры — после нагрузочных тестов.

---

## 13. Row-Level Security (RLS)

RLS — **страховка от IDOR**, не основная защита. Основная — PolicyEngine на уровне приложения. Но если приложение обойдёт — RLS защитит.

### 13.1 Установка контекста

В начале каждого запроса приложение делает:

```sql
SET LOCAL app.current_user_id = '<user_uuid>';
SET LOCAL app.current_tenant_id = '<tenant_uuid_or_null>';
SET LOCAL app.role_codes = 'admin,editor';
```

### 13.2 Пример политики на `data.record`

```sql
ALTER TABLE data.record ENABLE ROW LEVEL SECURITY;

-- Администратор видит всё
CREATE POLICY p_record__admin ON data.record
    FOR ALL
    TO app_user
    USING (current_setting('app.role_codes', true) LIKE '%admin%')
    WITH CHECK (current_setting('app.role_codes', true) LIKE '%admin%');

-- Прочие — через ABAC-кэш (заполняется приложением в session-table или через GUC)
CREATE POLICY p_record__self ON data.record
    FOR SELECT
    TO app_user
    USING (
        NOT is_deleted
        AND (created_by = current_setting('app.current_user_id', true)::uuid
             OR EXISTS (
                 SELECT 1 FROM identity.abac_policy ap
                 WHERE ap.target_entity = 'record'
                 -- упрощено: реальная проверка ABAC — на уровне приложения
             ))
    );
```

**Замечание**: полноценный ABAC в RLS — это сложно и хрупко. В MVP RLS используем **только** для базового tenant-isolation (`tenant_id = current_setting('app.current_tenant_id')`), а ABAC — на уровне сервиса с unit-тестами по матрице. Это решение, осознанно принятое.

---

## 14. Шифрование чувствительных колонок

| Колонка | Алгоритм | Где ключ |
|---|---|---|
| `identity.user.password_hash` | bcrypt (cost 12) | — (hash, не шифр) |
| `identity.user.two_factor_secret_encrypted` | `pgp_sym_encrypt` (AES-256) | KMS облака / Vault |
| `identity.api_key.key_hash` | SHA-256 | — |
| `integration.webhook_target.secret_encrypted` | `pgp_sym_encrypt` (AES-256) | KMS облака / Vault |
| Поля `is_pii = true` в `data.record.payload` | На уровне диска (TDE managed-PG) + маскирование в API | — |

```sql
-- Запись:
INSERT INTO identity.user (..., two_factor_secret_encrypted)
VALUES (..., pgp_sym_encrypt('SECRET', current_setting('app.crypt_key')));

-- Чтение:
SELECT pgp_sym_decrypt(two_factor_secret_encrypted, current_setting('app.crypt_key'))
FROM identity.user WHERE id = ...;
```

Ключ `app.crypt_key` устанавливается из Vault при старте FastAPI-инстанса и пробрасывается через GUC.

---

## 15. Стратегия бэкапов

| Тип | Хранение | Реализация |
|---|---|---|
| WAL непрерывно | 7 дней | Managed PG → автоматический PITR |
| Полный ежедневный | 30 дней | Managed PG snapshot |
| Еженедельный | 6 месяцев | Cron-задача → snapshot + копия в отдельный bucket |
| Ежемесячный | 2 года | Cron-задача → snapshot + копия в холодное хранилище (Glacier-tier) |

**Тесты восстановления**: ежемесячное автоматическое восстановление произвольной партиции `data.record` в staging — если упало, алёрт админу. Без тестов бэкапы — это иллюзия безопасности.

**Что НЕ покрыто PG-бэкапом**: файлы в S3 (отдельный versioning + cross-region replication), Redis (эфемерное — не бэкапим, восстанавливаем из БД), конфиг приложения (хранится в git).

---

## 16. Оценка размеров и нагрузка

### Размер БД на 6 месяцев работы (ожидаемая нагрузка 50–200 одновременных)

| Таблица | Записей/мес | Размер строки | За 6 мес | Заметки |
|---|---|---|---|---|
| `data.record` | 100К | ~2 КБ | ~1.2 ГБ | Зависит от размера payload |
| `data.record_version` | 300К | ~500 Б | ~900 МБ | diff, не snapshot |
| `audit.audit_log` | 2М | ~700 Б | ~8 ГБ | Самая объёмная — разбита на партиции |
| `logic.rule_execution_log` | 5М | ~400 Б | ~12 ГБ | Хранение 6 мес → циклическая |
| `integration.notification_outbox` | 500К | ~1 КБ | ~3 ГБ | После `sent` через 30 дней — `DETACH` партиции |
| Остальные | — | — | ~500 МБ | Метамодель, UI, конфиг |
| **Итого** | | | **~25 ГБ** | На 6 мес для 200 пользователей |

### Целевые показатели нагрузки

| Операция | Target p99 | Откуда берём |
|---|---|---|
| `SELECT` по PK | 5 мс | ТЗ ≤500 мс p99 для API; БД должна быть в 100х быстрее |
| `SELECT` по entity + filter (1М записей, GIN) | 50 мс | На 200 RPS — горлышко не БД |
| `INSERT` record | 10 мс | + триггер аудита ~5 мс |
| Rule evaluation (без LOOKUP) | 5 мс | DSL-интерпретатор в Python |
| Rule evaluation с 3 LOOKUP | 20 мс | Кэш метамодели в Redis |
| Workflow timer scan (1000 активных таймеров) | 200 мс | Каждую минуту, не в hot path |

---

## Что дальше

После приёмки этой схемы — переходим к **§7 ARCHITECTURE.md / шаг 2**: модель Rules Engine + Workflow в деталях (DSL-грамматика, sandbox-спецификация, контракт интерпретатора, гонки и идемпотентность переходов в Workflow).
