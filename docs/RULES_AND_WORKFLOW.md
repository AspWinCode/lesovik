# Rules Engine и Workflow Engine — детальная спецификация

> Технический контракт двух самых рискованных подсистем платформы. Они потребляют пользовательский «код» (правила и процессы) и обязаны быть **одновременно** гибкими, быстрыми, безопасными и предсказуемыми. На этом документе строится разработка спринтов 3–4 (см. `../ARCHITECTURE.md` §8).

## Содержание

**Часть I — Rules Engine**
1. [Обзор и принципы](#1-обзор-и-принципы)
2. [DSL — грамматика и AST](#2-dsl--грамматика-и-ast)
3. [Каталог операторов и функций](#3-каталог-операторов-и-функций)
4. [Интерпретатор — контракт и lifecycle](#4-интерпретатор--контракт-и-lifecycle)
5. [Sandbox — изоляция воркера](#5-sandbox--изоляция-воркера)
6. [Тайм-аут 113 сек и атомарность](#6-тайм-аут-113-сек-и-атомарность)
7. [Граф зависимостей и обнаружение циклов](#7-граф-зависимостей-и-обнаружение-циклов)
8. [Приоритеты и разрешение конфликтов](#8-приоритеты-и-разрешение-конфликтов)
9. [Журнал выполнения и отладка](#9-журнал-выполнения-и-отладка)
10. [End-to-end пример](#10-end-to-end-пример)

**Часть II — Workflow Engine**
11. [Обзор: state machine vs процессный движок](#11-обзор-state-machine-vs-процессный-движок)
12. [Метамодель процесса](#12-метамодель-процесса)
13. [Гонки переходов](#13-гонки-переходов)
14. [Идемпотентность переходов](#14-идемпотентность-переходов)
15. [SLA, эскалация, автореассайн](#15-sla-эскалация-автореассайн)
16. [Планировщик таймеров](#16-планировщик-таймеров)
17. [Отмена и компенсация процесса](#17-отмена-и-компенсация-процесса)
18. [Outbox-pattern уведомлений](#18-outbox-pattern-уведомлений)
19. [End-to-end пример](#19-end-to-end-пример)

**Часть III — Безопасность и тесты**
20. [Чек-лист безопасности](#20-чек-лист-безопасности)
21. [Тестовая матрица](#21-тестовая-матрица)

---

# Часть I — Rules Engine

## 1. Обзор и принципы

Rules Engine исполняет **пользовательскую логику** (правила, заданные через визуальный редактор). Сама логика — это **данные** (JSON-AST в `logic.rule.condition_ast`/`action_ast`), не код. Интерпретатор живёт в нашем процессе и интерпретирует AST.

### 1.1 Принципы (порядок важен — конфликты разруливаем сверху вниз)

1. **Безопасность важнее гибкости.** Лучше не дать пользователю операцию, чем дать дыру.
2. **Никакого `eval`, `exec`, динамической компиляции Python.** Только интерпретация декларативного AST.
3. **Никакого прямого SQL.** Все обращения к данным — через `EntityService`, `RecordService` — то есть через те же сервисы, что и API. PolicyEngine отрабатывает автоматически.
4. **Никакого ввода-вывода во внешний мир.** Сеть, файлы, процессы — запрещены. Уведомления — через outbox, не напрямую.
5. **Детерминизм.** На одних и тех же входных данных правило обязано возвращать один и тот же результат. Источник недетерминизма — функции типа `NOW()`, `RANDOM()` — используются ограниченно и при компиляции фиксируются.
6. **Лимит ресурсов жёсткий.** 113 секунд (ТЗ 3.5.3), 512 МБ памяти, 10 000 узлов AST на исполнение, 1 000 операций LOOKUP.
7. **Атомарность.** Любая ошибка в правиле = `ROLLBACK` всей транзакции, в которой оно работало.
8. **Аудит обязателен.** Каждое исполнение пишется в `logic.rule_execution_log` (см. §9).

### 1.2 Что НЕ делает Rules Engine

- Не вызывает внешние HTTP-сервисы. (Это — Workflow Action `webhook`, идёт через outbox.)
- Не отправляет email/Telegram напрямую. (Это — Action `notification`, через outbox.)
- Не создаёт долгоживущие задачи. Любое правило — синхронное, в рамках одной транзакции.
- Не управляет процессом workflow. Переходы запускаются Workflow Engine, а не Rules.

---

## 2. DSL — грамматика и AST

### 2.1 Уровни выражения

```
Rule
 ├─ when      : Condition  (опционально — без when правило применяется всегда при триггере)
 ├─ then      : Action[]   (что сделать при true)
 └─ otherwise : Action[]   (что сделать при false, опционально)

Condition  = Expression  (типа boolean)
Action     = одна из заранее определённых операций (см. §3.6)
Expression = Literal | FieldRef | ContextRef | Call(op, args)
```

### 2.2 EBNF (нормативная грамматика для парсера AST)

```ebnf
rule          ::= { "when"?: expression, "then": action_list, "otherwise"?: action_list }

expression    ::= literal
                | field_ref
                | context_ref
                | function_call

literal       ::= { "kind": "literal", "type": value_type, "value": json_value }
value_type    ::= "string" | "number" | "decimal" | "boolean" | "date" | "datetime" | "null" | "list"

field_ref     ::= { "kind": "field",   "path": dot_path }    (* поле текущей записи *)
context_ref   ::= { "kind": "context", "path": dot_path }    (* user, now, record_old, ... *)

function_call ::= { "kind": "call", "op": operator, "args": [ expression, ... ] }
operator      ::= "eq" | "ne" | "gt" | "ge" | "lt" | "le"
                | "and" | "or" | "not"
                | "in" | "between" | "match_regex"
                | "add" | "sub" | "mul" | "div" | "mod" | "neg"
                | "if" | "coalesce"
                | "sum" | "count" | "min" | "max" | "avg"
                | "concat" | "substring" | "lower" | "upper" | "trim" | "length"
                | "year" | "month" | "day" | "weekday" | "date_diff" | "date_add"
                | "lookup" | "exists"

action_list   ::= [ action, ... ]
action        ::= action_set_field
                | action_create_record
                | action_emit_notification
                | action_block_save
                | action_run_rule
                | action_call_webhook        (* идёт через outbox *)

action_set_field    ::= { "kind": "set_field",    "target": field_ref, "value": expression }
action_create_record::= { "kind": "create_record","entity": string, "payload": object_expr }
action_emit_notif   ::= { "kind": "notify",       "template": string, "recipient": expression, "channel"?: string }
action_block_save   ::= { "kind": "block_save",   "message": expression }
action_run_rule     ::= { "kind": "run_rule",     "rule_code": string }
action_call_webhook ::= { "kind": "webhook",      "target": string, "payload": object_expr }
```

### 2.3 Пример AST: «Сумма заявки не должна превышать лимит бюджета» (ТЗ 3.5.1)

```json
{
  "when": {
    "kind": "call",
    "op": "gt",
    "args": [
      { "kind": "field", "path": "amount" },
      { "kind": "call", "op": "lookup", "args": [
        { "kind": "literal", "type": "string", "value": "budget" },
        { "kind": "field", "path": "department_id" },
        { "kind": "literal", "type": "string", "value": "limit" }
      ]}
    ]
  },
  "then": [
    {
      "kind": "block_save",
      "message": {
        "kind": "call", "op": "concat", "args": [
          { "kind": "literal", "type": "string", "value": "Сумма " },
          { "kind": "field", "path": "amount" },
          { "kind": "literal", "type": "string", "value": " превышает лимит бюджета отдела" }
        ]
      }
    }
  ]
}
```

### 2.4 Типы и приведение

| Source → Target | string | number | decimal | boolean | date | datetime |
|---|---|---|---|---|---|---|
| string | ✅ | ⚠️ при строгом числе | ⚠️ | только "true"/"false" | ISO-8601 | ISO-8601 |
| number | ✅ | ✅ | ✅ | 0=false, иначе true | ❌ | ❌ |
| decimal | ✅ | ⚠️ потеря точности | ✅ | 0=false | ❌ | ❌ |
| boolean | "true"/"false" | 0/1 | 0/1 | ✅ | ❌ | ❌ |
| date | ISO | ❌ | ❌ | ❌ | ✅ | midnight UTC |
| datetime | ISO | ❌ | ❌ | ❌ | дата | ✅ |

⚠️ — допустимо, но требует явного оператора (`to_number`, `to_decimal`), молчаливо не приводится. ❌ — ошибка типа в правиле, ловится при публикации.

**Все денежные операции — только в `decimal`**. Внутри интерпретатора — Python `decimal.Decimal`, в БД — `NUMERIC(18,4)`. `number` (float) для денег запрещён правилом семантической проверки.

### 2.5 Семантическая валидация при сохранении правила

Перед записью `logic.rule.condition_ast`/`action_ast` в БД интерпретатор делает **типовой проход**:
- Каждое выражение должно иметь определённый тип. Если `gt` получает `string` и `number` — ошибка.
- `field_ref` валидируется по `metamodel.field` целевой сущности (whitelist, защита от опечаток и от SQLi через имена полей).
- `lookup` валидируется: первый аргумент — code сущности, существует ли, есть ли у текущего пользователя `read`-право (проверка на этапе публикации не обязательна, но **обязательна на этапе исполнения**).
- Глубина AST ≤ 32 (защита от подсунутой бесконечной структуры).
- Количество узлов ≤ 10 000 (см. §1.1).

Если что-то не сходится — `400 Bad Request` с понятным сообщением и подсветкой узла в UI редактора.

---

## 3. Каталог операторов и функций

### 3.1 Сравнение
| Op | Сигнатура | Заметки |
|---|---|---|
| `eq`, `ne` | `(any, any) → boolean` | Тип должен совпадать; `null` сравнивается только с `null` |
| `gt`, `ge`, `lt`, `le` | `(comparable, comparable) → boolean` | Числа, decimal, date, datetime, string (лексикографически) |
| `between` | `(comparable, comparable, comparable) → boolean` | Включающие границы |
| `in` | `(any, list) → boolean` | Линейный поиск, лимит длины списка — 1 000 |
| `match_regex` | `(string, string) → boolean` | RE2-совместимый pattern (без backreferences — защита от ReDoS); тайм-аут 100 мс |

### 3.2 Логика
| Op | Сигнатура | Заметки |
|---|---|---|
| `and`, `or` | `(boolean, boolean, ...) → boolean` | Short-circuit обязателен |
| `not` | `(boolean) → boolean` | |
| `if` | `(boolean, T, T) → T` | Тип ветвей должен совпадать |
| `coalesce` | `(T, T, ...) → T` | Возвращает первый не-`null` |

### 3.3 Арифметика
`add`, `sub`, `mul`, `div`, `mod`, `neg`. Для `decimal` округление — `ROUND_HALF_EVEN` до 4 знаков. Деление на ноль = ошибка правила (а не `Infinity`).

### 3.4 Агрегаты
`sum`, `count`, `min`, `max`, `avg` — работают только над **списками**, получаемыми из `lookup` (см. §3.6) или `field_ref` типа `list`. Лимит длины списка для агрегата — 100 000 элементов; если больше — ошибка.

### 3.5 Строковые / датовые
Стандартные. `date_diff(a, b, "days"|"hours"|"minutes")`. `date_add(date, n, unit)`.

### 3.6 Запросы к данным

```
lookup(entity_code, condition_or_id [, field_to_extract])
```

Семантика:
- **Один аргумент-id** → возвращает запись.
- **Условие** (например, `{"op":"eq","args":[...]}`) → возвращает **список** записей.
- **С `field_to_extract`** → возвращает значение этого поля (или список значений).

Реализация:
```python
def op_lookup(entity_code: str, cond_or_id, extract: str | None):
    if is_uuid(cond_or_id):
        rec = RecordService.get(entity_code, cond_or_id, ctx.policy)
        return rec.payload[extract] if extract else rec
    else:
        records = RecordService.find(entity_code, ast_to_filter(cond_or_id), ctx.policy, limit=10_000)
        return [r.payload[extract] for r in records] if extract else records
```

**Лимит**: 1 000 вызовов `lookup` за исполнение одного правила; вложенные `lookup` — глубина ≤ 3.

`exists(entity_code, condition)` — `boolean`, оптимизированная версия `count(lookup(...)) > 0`, делает `SELECT 1 ... LIMIT 1`.

### 3.7 Контекст

`context_ref` обращается к фиксированному набору значений (whitelist, никаких ENV/секретов):

| Path | Тип | Значение |
|---|---|---|
| `user.id` | uuid | текущий пользователь |
| `user.full_name` | string | |
| `user.role_codes` | list[string] | |
| `user.group_codes` | list[string] | |
| `user.department_id` | uuid | если установлено в профиле |
| `now` | datetime | UTC, фиксируется в начале исполнения |
| `today` | date | то же, дата |
| `record_old` | record | состояние записи до изменения (для триггеров на update) |
| `record_new` | record | состояние после изменения |
| `trigger.kind` | string | `"create"\|"update"\|"delete"\|"schedule"\|"manual"` |

`now` и `today` фиксируются на **старте исполнения** и одинаковы для всех узлов AST — это часть детерминизма.

### 3.8 Действия (Action)

| Kind | Что делает | Транзакционность |
|---|---|---|
| `set_field` | Меняет поле текущей записи | В той же транзакции |
| `create_record` | Создаёт новую запись (другая сущность) | В той же транзакции |
| `notify` | Кладёт сообщение в `integration.notification_outbox` | Транзакционно, отправка — асинхронно |
| `block_save` | Возвращает ошибку валидации с сообщением | Транзакция откатывается |
| `run_rule` | Запускает другое правило (рекурсия) | В той же транзакции, глубина ≤ 8 |
| `webhook` | Кладёт событие в outbox для исходящего webhook | Транзакционно, отправка — асинхронно |

---

## 4. Интерпретатор — контракт и lifecycle

### 4.1 Интерфейс

```python
class RuleExecutor:
    def __init__(self, ctx: ExecutionContext): ...

    def evaluate_condition(self, ast: dict) -> Any:
        """Чистая функция: интерпретирует выражение, возвращает значение.
        Не имеет side effects (за исключением чтения через lookup)."""

    def apply_actions(self, ast_list: list[dict]) -> ActionResult:
        """Применяет действия. Может иметь side effects через сервисы.
        Гарантия: либо все действия применены, либо ни одно (rollback)."""

    def execute_rule(self, rule_id: UUID, record: Record, trigger: Trigger) -> RuleExecutionResult: ...
```

### 4.2 ExecutionContext

```python
@dataclass
class ExecutionContext:
    user_id: UUID
    application_id: UUID
    policy_engine: PolicyEngine     # для проверки прав в lookup/set_field/create_record
    record_service: RecordService
    audit_service: AuditService
    notification_service: NotificationService
    deadline: datetime              # абсолютный дедлайн (started_at + timeout_ms)
    now: datetime                   # фиксированное значение
    depth: int = 0                  # для run_rule
    lookup_count: int = 0           # для квоты
```

### 4.3 Lifecycle одного исполнения

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Trigger fired (create/update/delete/manual/schedule)      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Resolve applicable rules (rule.entity_id, rule.trigger,   │
│    sorted by priority asc)                                   │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. BEGIN TRANSACTION (если ещё не открыта вызывающим)        │
│ 3a. INSERT row into logic.rule_execution_log (started_at)    │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. SET LOCAL statement_timeout = '113s';                     │
│    Python signal.SIGALRM at deadline (для длинных вычислений)│
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. evaluate_condition(rule.condition_ast)                    │
│    Если true → apply_actions(rule.then_ast)                  │
│    Иначе    → apply_actions(rule.otherwise_ast)              │
└──────────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
   ┌──────────────────┐     ┌──────────────────┐
   │ Успех            │     │ Ошибка/Timeout   │
   │ UPDATE rule_exec │     │ INSERT rule_exec │
   │ status=success   │     │ status=error|tmo │
   │ COMMIT           │     │ ROLLBACK         │
   └──────────────────┘     └──────────────────┘
              │                       │
              ▼                       ▼
   ┌──────────────────┐     ┌──────────────────┐
   │ Apply next rule  │     │ Bubble exception │
   │ (если есть)      │     │ to caller        │
   └──────────────────┘     └──────────────────┘
```

**Важно**: запись `rule_execution_log` со `status=error` делается **после** `ROLLBACK`, в новой короткой транзакции — иначе сама запись логирования откатится вместе с ошибкой.

---

## 5. Sandbox — изоляция воркера

Rules Engine исполняется в **отдельном Celery-воркере**, помеченном меткой `queue=sandbox`. Этот воркер:

### 5.1 Сетевая изоляция
- Запускается в Docker-контейнере с `network: none` (нет сетевого интерфейса вообще), либо в Linux network namespace без интерфейсов.
- Подключение к БД — через **Unix socket** или приватный сетевой namespace, в котором виден **только** PG и Redis. Никаких внешних адресов.
- DNS не сконфигурирован — попытка любого `socket.connect()` к внешнему адресу = `EHOSTUNREACH`.

### 5.2 Файловая система
- Контейнер запущен с `readOnlyRootFilesystem: true`.
- `emptyDir` (tmpfs) только на `/tmp` с лимитом 64 МБ.
- Никаких volume mount'ов с исходным кодом, secrets, ключами.

### 5.3 Лимиты ресурсов

| Ресурс | Лимит | Механизм |
|---|---|---|
| CPU | 2 core | cgroups `cpu.max` |
| RAM | 512 МБ | cgroups `memory.max` (hard limit, OOM kill при превышении) |
| Длительность задачи | 113 сек | Celery `time_limit=113`, `soft_time_limit=110` |
| Stack depth Python | 200 | `sys.setrecursionlimit(200)` |
| AST depth | 32 | проверка интерпретатора |
| AST nodes | 10 000 | проверка интерпретатора |
| `lookup` calls | 1 000 | счётчик в `ExecutionContext` |
| `run_rule` depth | 8 | счётчик в `ExecutionContext` |

### 5.4 Безопасный Python
- Запрещённые модули: `os`, `sys.modules`, `subprocess`, `socket`, `ctypes`, `pickle`, `importlib`. Реализуется через `ast.NodeVisitor`-валидатор на этапе **загрузки** AST правила — но это не Python-код, а JSON-AST, так что эти запреты — для серверного кода интерпретатора, не для пользовательского.
- Никакого `eval`, `exec`, `compile` в коде интерпретатора (ловится `bandit`).

### 5.5 Один процесс — одно правило

`worker_max_tasks_per_child=1` — после каждого правила воркер перезапускается. Это:
- Гарантирует отсутствие утечек памяти между исполнениями.
- Исключает случайный shared state между разными правилами.
- Стоимость: +50–100 мс на холодный старт. Приемлемо для 99% правил, исполняющихся 5–20 мс.

Для очень частых правил (validation на полях) — отдельная очередь `queue=rules_inline` с `worker_max_tasks_per_child=1000` и более жёстким white-list operators (без `webhook`, `notify`). Это компромисс для горячего пути.

### 5.6 Что делаем с правилом-«бомбой»

Сценарий: пользователь создал правило, которое каждое срабатывание держит CPU 113 сек.
- Тайм-аут останавливает конкретное исполнение.
- Если правило срабатывает повторно с тем же результатом — **circuit breaker**: после 3 таймаутов подряд правило **автоматически деактивируется**, администратору — алёрт в `audit.suspicious_activity` (category=`rule_loop`).
- Пользователь видит правило в статусе «приостановлено» с причиной.

---

## 6. Тайм-аут 113 сек и атомарность

### 6.1 Многоуровневая защита от долгих операций

| Уровень | Лимит | Что делает |
|---|---|---|
| PostgreSQL `statement_timeout` | 113 000 мс | Прерывает любой SQL-запрос |
| Python deadline | 113 сек wall clock | `signal.SIGALRM` (только на главном потоке) + проверка `deadline > now()` в горячих циклах |
| Celery `time_limit` | 113 сек | Шлёт `SoftTimeLimitExceeded`, при невыполнении — `SIGKILL` |
| cgroups CPU quota | 113 сек × 2 core | Жёсткий потолок |

### 6.2 Транзакционность

```python
with db.transaction():                          # БД-транзакция
    log_id = audit.log_started(rule_id, ...)    # в отдельной transaction (autocommit)
    try:
        result = executor.execute_rule(...)     # может ROLLBACK через exception
    except (RuleTimeout, RuleError, IntegrityError) as e:
        # БД откатит транзакцию автоматически
        audit.log_failed(log_id, error=e, status='timeout' or 'error')
        raise                                    # пробрасываем выше — caller решит
    else:
        audit.log_succeeded(log_id, duration_ms)
```

`audit.log_started` и `log_failed` пишут в `logic.rule_execution_log` через **отдельную короткую транзакцию** (autocommit). Это нужно, чтобы:
- При `ROLLBACK` основной транзакции запись о попытке исполнения **не потерялась**.
- Журнал отражал реальные попытки, а не только успешные.

### 6.3 Что НЕЛЬЗЯ делать в правиле под угрозой потери атомарности

- Отправлять email/Telegram **напрямую**. Это — outbox. (Если правило сделает HTTP-запрос напрямую и упадёт после, письмо уже ушло — атомарность нарушена.)
- Делать долгие синхронные операции (≥1 сек). Если массовая обработка нужна — это не правило, это импорт/процесс.
- Записывать файлы в S3 **синхронно**. Загрузка файла — отдельный API, правило только привязывает.

---

## 7. Граф зависимостей и обнаружение циклов

### 7.1 Что считаем циклом

Правило R1 пишет в поле F1. Правило R2 триггерится на изменении F1 и пишет в F2. Правило R3 триггерится на F2 и пишет в F1. Цикл: F1 → F2 → F1.

### 7.2 Извлечение зависимостей из AST

При сохранении правила интерпретатор обходит AST и собирает:
- `reads_fields`: все `field_ref`, использованные в `condition_ast`.
- `writes_fields`: все `field_ref` в `set_field.target` внутри `then`/`otherwise`.
- `triggers_on`: поля, изменения которых триггерят правило (либо явно указано — `field_id`, либо для триггеров — все поля сущности).

Запись в `logic.rule_dependency`: `(rule_id, depends_on_field_id)` — это все `triggers_on` ∪ `reads_fields`.

### 7.3 Алгоритм проверки цикла

Перед публикацией приложения строим граф:
- Узлы: `(entity_id, field_id)`.
- Рёбра: для каждого активного правила R с `triggers_on ⊇ {F1}` и `writes_fields ⊇ {F2}` — добавляем ребро `F1 → F2`.

Прогоняем **Tarjan's SCC** на этом графе. Если есть SCC размером > 1 — цикл. В отчёт о публикации записываем: «Цикл в правилах: F1 → F2 → F1, через правила R1, R2».

Реализация — рекурсивный CTE в PG для предварительной проверки + Python для финальной валидации (CTE даёт быстрый ответ на «есть ли цикл», Python даёт человекочитаемый список рёбер цикла).

```sql
-- быстрая проверка: есть ли вообще цикл (рекурсивный CTE с ограничением глубины)
WITH RECURSIVE walk AS (
    SELECT
        rd.depends_on_field_id AS start_field,
        rd.depends_on_field_id AS current_field,
        ARRAY[rd.depends_on_field_id] AS path,
        false AS cycled
    FROM logic.rule_dependency rd
    UNION ALL
    SELECT
        w.start_field,
        rd.depends_on_field_id,
        w.path || rd.depends_on_field_id,
        rd.depends_on_field_id = ANY(w.path)
    FROM walk w
    JOIN logic.rule r ON r.id = ANY(
        SELECT rd2.rule_id FROM logic.rule_dependency rd2 WHERE rd2.depends_on_field_id = w.current_field
    )
    -- упрощено: реальная версия учитывает writes_fields правила
    JOIN logic.rule_dependency rd ON rd.rule_id = r.id
    WHERE NOT w.cycled AND array_length(w.path, 1) < 50
)
SELECT * FROM walk WHERE cycled LIMIT 1;
```

### 7.4 Runtime защита

Даже если статический анализ пропустил цикл (например, через `lookup` цепочку), **во время исполнения** работает счётчик глубины `run_rule` (≤ 8) и общий тайм-аут 113 сек. Худший сценарий — один прервавшийся запрос, не падение системы.

---

## 8. Приоритеты и разрешение конфликтов

ТЗ 3.5.4: меньшее число — выше приоритет.

### 8.1 Когда возникает конфликт

Два правила одного типа (`autofill` или `calc`) пишут в одно и то же поле одной записи с **разными** значениями. Конфликт фиксируется, побеждает правило с меньшим `priority`.

### 8.2 Алгоритм

```python
def apply_writes_with_conflict_resolution(writes: list[Write], record: Record):
    # writes: список (rule_id, priority, field, new_value), отсортирован по priority asc
    applied: dict[field, (rule_id, value)] = {}
    conflicts: dict[field, list[(rule_id, value)]] = defaultdict(list)

    for w in sorted(writes, key=lambda x: x.priority):
        if w.field in applied:
            # уже был writer с более высоким приоритетом
            conflicts[w.field].append((w.rule_id, w.new_value))
        else:
            applied[w.field] = (w.rule_id, w.new_value)

    # фактическое применение
    for field, (rule_id, value) in applied.items():
        record.payload[field] = value

    # логирование конфликтов
    for field, losers in conflicts.items():
        winner_rule, winner_value = applied[field]
        log_conflict(record.id, field, winner_rule, winner_value, losers)
```

### 8.3 Что НЕ конфликтует

- Правило `validation` и правило `autofill` — разные типы, никогда не пересекаются.
- Правило, которое не сработало (`condition` = false) — write не происходит, конфликта нет.
- Правило `set_field` через `then` и через `otherwise` — выполняется одна из веток, не обе.

### 8.4 Предупреждение в редакторе

При сохранении правила UI проверяет: есть ли другие правила того же типа, пишущие в то же поле, и предупреждает: «Внимание: уже есть правило R1 (приоритет 50), пишущее в это поле». Это soft-warning, не блокировка.

---

## 9. Журнал выполнения и отладка

### 9.1 Что пишется в `logic.rule_execution_log`

| Поле | Когда заполняется |
|---|---|
| `rule_id` | На старте |
| `record_id` | На старте, если есть |
| `user_id` | На старте |
| `started_at` | На старте |
| `finished_at` | На завершении (успешном или нет) |
| `duration_ms` | `finished_at - started_at` |
| `status` | `success` \| `error` \| `timeout` \| `rolled_back` |
| `error_stage` | для ошибок: `parse`, `evaluate`, `apply_action`, `lookup` |
| `error_message` | человекочитаемое сообщение |
| `context` | срез: значения полей `reads_fields`, входные параметры, первые 10 узлов AST |

### 9.2 UI журнала (ТЗ 3.11.2)

Страница «Журнал правил» (только для admin):
- Фильтр по правилу, периоду, статусу.
- Клик по строке → детали: AST, context, stack trace интерпретатора.
- Кнопка «Воспроизвести» (debug mode) — выполняет правило в read-only режиме с записанным `context`. Полезно для отладки эпизодических ошибок.

### 9.3 Хранение

`logic.rule_execution_log` — партиционирована по месяцу (см. DATABASE_SCHEMA §7.4 и §12). По умолчанию хранение 6 месяцев, потом `DETACH PARTITION` и экспорт в холодное хранилище.

При нагрузке 5М исполнений/мес — это ~12 ГБ через 6 мес, удержимо.

---

## 10. End-to-end пример

### 10.1 Сценарий

Сущность `Заявка на расход` с полями: `amount` (decimal), `department_id` (relation→Department), `reason` (text), `status` (enum: draft|pending|approved|rejected).

Сущность `Бюджет отдела` с полями: `department_id` (relation→Department), `limit` (decimal), `period` (date).

**Бизнес-правило**: «При создании или обновлении заявки, если сумма превышает лимит бюджета отдела на текущий период — заблокировать сохранение и показать сообщение».

### 10.2 Создание правила (вход в редактор)

UI редактора в выражениях:
```
ЕСЛИ
    amount > LOOKUP("Бюджет отдела", department_id = заявка.department_id AND period = ТЕКУЩИЙ_МЕСЯЦ, "limit")
ТО
    БЛОКИРОВАТЬ_СОХРАНЕНИЕ "Сумма превышает лимит бюджета"
```

Сохраняется в `logic.rule`:
```sql
INSERT INTO logic.rule (
    application_id, entity_id, code, name, rule_type,
    condition_ast, action_ast, priority, timeout_ms
) VALUES (
    'app-finance', 'entity-expense-request', 'expense.over_budget',
    'Сумма превышает бюджет', 'validation',
    '<JSON AST condition>'::jsonb,
    '<JSON AST then>'::jsonb,
    50, 5000
);

INSERT INTO logic.rule_dependency (rule_id, depends_on_field_id) VALUES
    (rule_id, field_amount_id),
    (rule_id, field_department_id);
```

### 10.3 Исполнение при создании заявки

```
1. POST /api/v1/records/expense_request
   payload: {amount: 50000, department_id: "dpt-it", reason: "ноутбуки"}

2. API → RecordService.create(...)
3. RecordService открывает транзакцию TX1
4. Применяет default values, формула-поля
5. RulesEngine.run_for_trigger(entity='expense_request', trigger='create', record=NEW)
6. Выбирает правила: validation, autofill, calc — отсортированы по priority

7. Для каждого правила:
   7a. INSERT INTO logic.rule_execution_log (started_at, ...)
   7b. evaluate_condition('expense.over_budget'):
       - field_ref(amount) → 50000 (Decimal)
       - lookup("budget", filter, "limit"):
           - PolicyEngine.check(user, "read", "budget") → OK
           - RecordService.find("budget", {department_id: "dpt-it", period: month_start("2026-05-01")})
             → SELECT * FROM data.record WHERE entity_id = 'budget' AND payload @> '{"department_id":"dpt-it",...}'
             → [{limit: 30000}]
           - extract "limit" → 30000 (Decimal)
       - gt(50000, 30000) → true
   7c. apply_actions([{kind: "block_save", message: "..."}]):
       - RuleEngine бросает RuleViolation(message)
   7d. UPDATE logic.rule_execution_log SET finished_at, status='error', error_stage='block_save'
   7e. RecordService ловит RuleViolation, ROLLBACK TX1, возвращает HTTP 422 с сообщением
```

### 10.4 Что увидит пользователь

`HTTP 422 Unprocessable Entity`:
```json
{
  "error": "rule_validation_failed",
  "rule": "expense.over_budget",
  "message": "Сумма превышает лимит бюджета"
}
```

В UI рядом с полем `amount` появляется красное сообщение, кнопка «Сохранить» снова активна для исправления.

### 10.5 Что попадёт в журналы

| Журнал | Запись |
|---|---|
| `logic.rule_execution_log` | rule=`expense.over_budget`, record=..., status=`error`, error_stage=`block_save`, duration_ms=12 |
| `audit.audit_log` | action=`record.create`, result=`failure`, error=`rule_validation_failed:expense.over_budget` |

---

# Часть II — Workflow Engine

## 11. Обзор: state machine vs процессный движок

Сделанный выбор: **детерминированный конечный автомат**, не полноценный BPMN-движок. Причины:

| Что | Detminist FSM | BPMN-движок (Camunda, Temporal) |
|---|---|---|
| Сложность реализации | Низкая, 1 спринт | Очень высокая, или внешняя зависимость |
| Параллельные ветки | В MVP нет (последовательное согласование) | Полные |
| Долгоживущие процессы | Поддерживается через таймеры | Поддерживается нативно |
| Гибкость | Достаточно для 90% сценариев согласования | Полная |
| Стоимость владения | Внутри платформы | Внешний компонент, мониторинг, апдейты |

Для MVP — FSM. Если во 2-й очереди понадобятся параллельные ветки и более сложная семантика — переходим на **Temporal.io** (open-source, on-prem, Python SDK). Миграция возможна без переделки `process_definition` — добавляем интерпретатор поверх той же метамодели.

---

## 12. Метамодель процесса

См. `../docs/DATABASE_SCHEMA.md` §8 для DDL. Здесь — семантика.

### 12.1 ProcessDefinition

JSON-структура (хранится в `process_definition.definition`):

```json
{
  "version": 1,
  "stages": [
    { "code": "draft",       "type": "start",      "name": "Черновик" },
    { "code": "review",      "type": "approval",   "name": "На согласовании",
      "assignee": {"kind":"role","ref":"manager"},
      "sla_minutes": 1440,
      "escalation_l1_minutes": 1440,
      "escalation_l2_minutes": 2880 },
    { "code": "approved",    "type": "end",        "name": "Одобрено" },
    { "code": "rejected",    "type": "end",        "name": "Отклонено" }
  ],
  "transitions": [
    { "code": "submit",  "from": "draft",  "to": "review",   "label": "Отправить" },
    { "code": "approve", "from": "review", "to": "approved", "label": "Одобрить" },
    { "code": "reject",  "from": "review", "to": "rejected", "label": "Отклонить" },
    { "code": "revise",  "from": "review", "to": "draft",    "label": "Вернуть на доработку" }
  ],
  "on_cancel": "restore_status"
}
```

### 12.2 ProcessInstance

Экземпляр процесса — это **связь между записью и текущей стадией**. Один Record может иметь только **один активный** ProcessInstance (защищено частичным UNIQUE индексом — см. DB §8.2).

### 12.3 ProcessTimer

Таймеры на текущей стадии. Создаются при входе в стадию, отменяются при выходе.

---

## 13. Гонки переходов

### 13.1 Сценарий гонки

Два менеджера одновременно нажали «Одобрить» на одной заявке. Оба запроса дошли до сервера в один и тот же миллисекундный диапазон. Без защиты — оба перехода применятся, в `process_history` появятся две записи о переходе из одной стадии в две разные (или одну и ту же дважды).

### 13.2 Защита: оптимистическая блокировка

Каждый `process_instance` имеет колонку `version` (через `data.record.version`, потому что process_instance связан с record). Переход — это **атомарное обновление**:

```sql
UPDATE logic.process_instance
SET current_stage_id = $new_stage_id,
    status = $new_status
WHERE id = $instance_id
  AND current_stage_id = $expected_current_stage_id;
-- если RowCount = 0, значит другой переход уже сработал → ошибка `stale_state`
```

В одной транзакции:
1. `SELECT ... FOR UPDATE` на `process_instance`.
2. Чтение текущей стадии, валидация перехода (`expected_current_stage_id` в transition).
3. Запись в `process_history` (BIGSERIAL, никаких конфликтов).
4. `UPDATE process_instance ... WHERE current_stage_id = $expected`.
5. Отмена таймеров текущей стадии (`UPDATE process_timer SET is_cancelled = true`).
6. Создание таймеров новой стадии.
7. Помещение уведомлений в `notification_outbox`.

Если `UPDATE` вернул 0 строк → `409 Conflict` с подсказкой обновить страницу.

### 13.3 Распределённая блокировка для длинных операций

Если переход требует тяжёлой Action (массовая отправка уведомлений, генерация PDF) — длинная транзакция плохая идея. Тогда:
1. Захватываем Redis-lock `process:<instance_id>:transition` с TTL 60 сек.
2. Делаем переход в БД (как в §13.2 — короткая транзакция).
3. Выполняем тяжёлую часть **в фоновой задаче** (она читает уже зафиксированное состояние).
4. Освобождаем lock.

Lock — это страховка от двойного запуска фоновой задачи; основная защита — всё равно условный `UPDATE`.

---

## 14. Идемпотентность переходов

### 14.1 Зачем

Сценарий: пользователь нажал «Одобрить», запрос дошёл, переход применился, но ответ не дошёл (сетевой сбой, тайм-аут). Пользователь обновляет страницу, видит, что заявка ещё «на согласовании» (старый закешированный UI), снова жмёт «Одобрить». Второй запрос приходит — должен быть **idempotent**.

### 14.2 Реализация

Каждый запрос на переход содержит **`Idempotency-Key`** в заголовке HTTP (UUID, сгенерированный клиентом). Сервер:

```python
def execute_transition(instance_id, transition_code, idempotency_key, user_id):
    # Проверка дубля
    if key := idempotency_store.get(idempotency_key):
        return key.cached_response          # возвращаем тот же ответ
    
    with db.transaction():
        # как в §13.2
        ...
        response = {...}
        idempotency_store.set(idempotency_key, response, ttl=24h)
        return response
```

`idempotency_store` — таблица `integration.idempotency_key (key UUID PK, response JSONB, expires_at)`, partitioned by `expires_at` для cleanup.

### 14.3 Внутри Workflow

`run_rule` / `notify` действия идут через outbox с `dedup_key` (см. §18). Один и тот же переход не плодит дубли уведомлений.

---

## 15. SLA, эскалация, автореассайн

### 15.1 Семантика стадии

| Поле | Назначение |
|---|---|
| `sla_minutes` | Срок выполнения этапа. Если истёк — событие SLA_BREACHED. |
| `escalation_l1_minutes` | Через сколько минут после старта стадии (не после SLA!) — уведомление руководителю ответственного |
| `escalation_l2_minutes` | …— уведомление вышестоящему руководителю |
| `auto_change_assignee_on_sla` | Если true: при `fires_at = sla_minutes` ответственный меняется автоматически (по правилам, заданным в стадии) |

ТЗ 3.6.2: уровень 1 — напоминание ответственному, уровень 2 — уведомление руководителя. В моей формулировке:
- Уровень 1 (напоминание ответственному) = SLA-таймер `sla_minutes` с действием `notify(assignee, "deadline_soon")`.
- Уровень 2 (руководителю) = `escalation_l1_minutes` с действием `notify(assignee.manager, "subordinate_overdue")`.
- Уровень 3 (вышестоящему) = `escalation_l2_minutes` с действием `notify(assignee.manager.manager, ...)`.
- Автореассайн = `auto_change_assignee_on_sla`, действие `set_assignee + notify`.

### 15.2 Кто такой `assignee.manager`

В сущности `Employee` (модуль Предприятие) есть поле `manager_id` (relation→Employee). Это и есть граф иерархии. Цепочка `manager.manager` строится через рекурсивный CTE — кешируется в Redis с TTL 5 мин.

Если у пользователя нет руководителя (CEO) — эскалация L2 шлётся системному admin'у с пометкой «нет руководителя».

### 15.3 Создание таймеров при входе в стадию

```python
def on_enter_stage(instance, stage):
    now = utcnow()
    timers = []
    if stage.sla_minutes:
        timers.append(ProcessTimer(
            process_instance_id=instance.id,
            stage_id=stage.id,
            timer_kind='sla',
            fires_at=now + timedelta(minutes=stage.sla_minutes)
        ))
    if stage.escalation_l1_minutes:
        timers.append(ProcessTimer(..., timer_kind='escalation_l1', fires_at=now + timedelta(minutes=stage.escalation_l1_minutes)))
    if stage.escalation_l2_minutes:
        timers.append(ProcessTimer(..., timer_kind='escalation_l2', fires_at=now + timedelta(minutes=stage.escalation_l2_minutes)))
    if stage.auto_change_assignee_on_sla and stage.sla_minutes:
        timers.append(ProcessTimer(..., timer_kind='auto_reassign', fires_at=now + timedelta(minutes=stage.sla_minutes)))
    db.bulk_insert(timers)
```

При выходе из стадии все некщё-не-сработавшие таймеры этой стадии помечаются `is_cancelled = true`.

---

## 16. Планировщик таймеров

### 16.1 Архитектура

Celery beat запускает задачу `scan_process_timers` каждую минуту:

```python
@celery.task(queue='workflow')
def scan_process_timers():
    now = utcnow()
    due = db.fetch(
        """SELECT id FROM logic.process_timer
           WHERE fires_at <= %s AND fired_at IS NULL AND is_cancelled = false
           ORDER BY fires_at
           LIMIT 1000
           FOR UPDATE SKIP LOCKED""",
        now
    )
    for timer in due:
        process_timer.apply_async(args=[timer.id], queue='workflow')

@celery.task(queue='workflow', bind=True, max_retries=3)
def process_timer(self, timer_id):
    with db.transaction():
        timer = db.fetch_one("""SELECT * FROM logic.process_timer
                                WHERE id = %s AND fired_at IS NULL
                                FOR UPDATE""", timer_id)
        if not timer:
            return  # уже обработан
        
        if timer.timer_kind == 'sla':
            outbox.enqueue_notification(...)
        elif timer.timer_kind == 'escalation_l1':
            outbox.enqueue_notification(... to manager ...)
        elif timer.timer_kind == 'auto_reassign':
            instance = db.fetch_one("SELECT * FROM logic.process_instance WHERE id = %s",
                                     timer.process_instance_id)
            new_assignee = resolve_next_assignee(instance, timer.stage_id)
            update_assignee(instance.id, new_assignee)
        
        db.execute("UPDATE logic.process_timer SET fired_at = %s WHERE id = %s", now, timer_id)
```

### 16.2 Почему `FOR UPDATE SKIP LOCKED`

При горизонтальном масштабировании может быть несколько `scan_process_timers` одновременно (если beat запустится дважды или несколько worker'ов будут конкурировать). `SKIP LOCKED` гарантирует, что каждый таймер обработается **ровно одним** воркером — без дублей и без блокировок остальных.

### 16.3 Производительность

Запрос с индексом `ix_timer__due` отрабатывает за <10 мс при 100К активных таймеров. Сама обработка таймера — 50–200 мс (запись в outbox, обновление таймера). На 1 000 таймеров одновременно — 30 сек последовательной обработки или 5 сек при 6 воркерах. Запас огромен.

### 16.4 Точность

Точность — **±1 мин** (период beat). Это адекватно для бизнес-процессов: SLA «1 день» с погрешностью минута — норма. Если потребуется точность секунд (редко в workflow) — отдельная очередь с beat каждые 10 сек.

---

## 17. Отмена и компенсация процесса

ТЗ 3.6.3: «Данные записи, к которой относился процесс, возвращаются в статус, предшествовавший запуску процесса».

### 17.1 Состояние «до процесса»

При запуске процесса (`process_instance.create`) делаем snapshot полей записи, которые могут меняться внутри процесса:

```python
def start_process(record_id, process_def_id, initiated_by):
    record = RecordService.get(record_id)
    snapshot = {
        f: record.payload[f]
        for f in fields_affected_by_process(process_def_id)
    }
    # snapshot хранится в process_instance.cancel_state
    db.execute("""INSERT INTO logic.process_instance
                  (record_id, process_definition_id, cancel_state, ...)
                  VALUES (...)""", ..., json.dumps(snapshot))
```

### 17.2 Откат

```python
def cancel_process(instance_id, cancel_reason, user_id):
    with db.transaction():
        instance = db.fetch_one("""SELECT * FROM logic.process_instance
                                   WHERE id = %s AND status = 'running'
                                   FOR UPDATE""", instance_id)
        if not instance:
            raise NotFound("process not running")
        
        # 1. восстанавливаем поля записи
        if instance.cancel_state:
            RecordService.update(instance.record_id, instance.cancel_state, by=user_id)
        
        # 2. помечаем процесс
        db.execute("""UPDATE logic.process_instance
                      SET status='cancelled', finished_at=%s, cancel_reason=%s
                      WHERE id=%s""", utcnow(), cancel_reason, instance_id)
        
        # 3. отменяем таймеры
        db.execute("""UPDATE logic.process_timer SET is_cancelled=true
                      WHERE process_instance_id=%s AND fired_at IS NULL""", instance_id)
        
        # 4. уведомление участникам
        for participant in get_process_participants(instance_id):
            outbox.enqueue_notification('process_cancelled', participant, ...)
```

### 17.3 Что НЕ откатывается

- Создания/правки **других** записей внутри процесса. Если процесс в стадии А создал запись X, отмена не удалит X — это требовало бы полноценного **сага-паттерна**, неоправданная сложность для MVP.
- Отправленные уведомления (письма не «развозвращаются»).
- Записи в `audit.audit_log`.

Это документируется в UI: «Отмена возвращает заявку в исходный статус, но не удаляет связанные записи и не отзывает отправленные уведомления.»

---

## 18. Outbox-pattern уведомлений

### 18.1 Проблема, которую решаем

Без outbox: транзакция БД успешно прошла, но email-отправитель крашнулся → пользователь получил подтверждение, что заявка одобрена, но руководителю письмо не пришло. Или хуже: транзакция откатилась, а email уже улетел → пользователь получил «ваша заявка одобрена» на письмо при том, что в системе она ещё на согласовании.

### 18.2 Реализация

```python
def transition_approve(instance_id, user_id):
    with db.transaction():
        # 1. меняем состояние
        update_process_instance(instance_id, new_stage='approved')
        # 2. КЛАДЁМ в outbox в той же транзакции (не отправляем напрямую)
        db.execute("""INSERT INTO integration.notification_outbox
                      (template_id, channel, recipient_kind, recipient_ref,
                       subject, body, dedup_key, status)
                      VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')""",
                   template_approved, 'email', 'user', initiator.id,
                   subject, rendered_body, f"transition:{instance_id}:approved")
    # коммит транзакции происходит здесь — outbox запись либо есть с состоянием, либо нет вообще
    # (атомарность)
```

Отправитель — отдельный Celery-воркер:

```python
@celery.task(queue='notifications')
def send_outbox_batch():
    rows = db.fetch("""SELECT * FROM integration.notification_outbox
                       WHERE status IN ('pending','failed')
                         AND next_attempt_at <= %s
                       LIMIT 100
                       FOR UPDATE SKIP LOCKED""", utcnow())
    for row in rows:
        try:
            db.execute("UPDATE integration.notification_outbox SET status='sending' WHERE id=%s", row.id)
            transport[row.channel].send(row.recipient_ref, row.subject, row.body)
            db.execute("UPDATE integration.notification_outbox SET status='sent', sent_at=%s WHERE id=%s",
                       utcnow(), row.id)
        except TransientError as e:
            new_status = 'failed' if row.attempt_count < 4 else 'dlq'
            db.execute("""UPDATE integration.notification_outbox
                          SET status=%s, attempt_count=attempt_count+1,
                              next_attempt_at=%s, last_error=%s
                          WHERE id=%s""",
                       new_status, utcnow() + backoff(row.attempt_count), str(e), row.id)
```

`backoff` — экспоненциальный: 1 мин → 5 мин → 30 мин → 4 ч → DLQ.

### 18.3 Дедупликация

Колонка `dedup_key UNIQUE` — гарантирует, что одно и то же событие не родит две записи в outbox. Формат ключа — детерминирован: `<event_type>:<entity_id>:<transition_code>`.

### 18.4 DLQ

После 4 неудач — статус `dlq`. Алерт администратору (`audit.suspicious_activity` category=`notification_failed`). Админ может вручную перезапустить (`UPDATE status='pending'`).

---

## 19. End-to-end пример

### 19.1 Сценарий

Заявка на расход >100 000 ₽ требует двухуровневого согласования: непосредственный руководитель → CFO.

### 19.2 Process Definition (JSON)

```json
{
  "code": "expense_two_level_approval",
  "entity_code": "expense_request",
  "stages": [
    {"code": "draft", "type": "start"},
    {"code": "manager_review", "type": "approval",
     "assignee": {"kind":"field","ref":"initiator.manager_id"},
     "sla_minutes": 2880,
     "escalation_l1_minutes": 1440},
    {"code": "cfo_review", "type": "approval",
     "assignee": {"kind":"role","ref":"cfo"},
     "sla_minutes": 4320},
    {"code": "approved", "type": "end"},
    {"code": "rejected", "type": "end"}
  ],
  "transitions": [
    {"code": "submit", "from": "draft", "to": "manager_review"},
    {"code": "manager_approve", "from": "manager_review", "to": "cfo_review",
     "condition": {"op":"gt","args":[{"field":"amount"},{"literal":100000}]}},
    {"code": "manager_approve_small", "from": "manager_review", "to": "approved",
     "condition": {"op":"le","args":[{"field":"amount"},{"literal":100000}]}},
    {"code": "manager_reject", "from": "manager_review", "to": "rejected"},
    {"code": "cfo_approve", "from": "cfo_review", "to": "approved"},
    {"code": "cfo_reject", "from": "cfo_review", "to": "rejected"},
    {"code": "cfo_return", "from": "cfo_review", "to": "manager_review"}
  ]
}
```

### 19.3 Поток

1. **T+0**: Сотрудник создаёт заявку на 250 000 ₽, нажимает «Отправить».
   - `start_process(record, "expense_two_level_approval")`
   - `process_instance.current_stage = "manager_review"`, `assignee = manager_of(initiator)`
   - Таймеры: SLA на 48 ч, escalation_l1 на 24 ч
   - Outbox: уведомление manager'у «новая заявка на согласование»

2. **T+24h**: Manager не ответил. Сработал таймер `escalation_l1`.
   - Outbox: уведомление manager'у-of-manager «у вашего подчинённого просрочена заявка»

3. **T+30h**: Manager нажимает «Одобрить».
   - HTTP `POST /processes/{instance_id}/transitions/manager_approve` с `Idempotency-Key: <uuid>`
   - `condition`: `amount > 100000` → true → переход в `cfo_review`
   - В одной транзакции: history, отмена старых таймеров, новые таймеры для `cfo_review`, outbox-уведомление CFO

4. **T+50h**: CFO нажимает «Одобрить».
   - Переход в `approved`, `process_instance.status = 'completed'`
   - Outbox: уведомление инициатору «Ваша заявка одобрена»

### 19.4 Что в БД

- `logic.process_instance`: 1 строка, прошедшая через 4 состояния.
- `logic.process_history`: 3 строки (submit, manager_approve, cfo_approve).
- `logic.process_timer`: 6 строк (3 для manager_review, 3 для cfo_review), все `fired_at` или `is_cancelled`.
- `integration.notification_outbox`: 4 строки (manager_assigned, manager_overdue_to_manager_of_manager, cfo_assigned, initiator_approved), все `sent`.
- `audit.audit_log`: 4 записи о действиях пользователей.

---

# Часть III — Безопасность и тесты

## 20. Чек-лист безопасности

### 20.1 Rules Engine

- [ ] DSL парсер отвергает узлы, не описанные в EBNF (whitelist node types).
- [ ] `field_ref` валидируется по `metamodel.field` (whitelist, защита от SQLi через имена полей).
- [ ] `lookup` проходит через PolicyEngine — пользователь не может прочитать сущность, к которой нет прав.
- [ ] `set_field`, `create_record` проходят через PolicyEngine на запись.
- [ ] `match_regex` использует RE2 (без backreferences) или `re` с тайм-аутом 100 мс — защита от ReDoS.
- [ ] Глубина AST ≤ 32, узлов ≤ 10 000, lookup'ов ≤ 1 000.
- [ ] Sandbox-воркер: cgroups (CPU=2, RAM=512MB), `readOnlyRootFilesystem`, network=none.
- [ ] `worker_max_tasks_per_child=1` для основной очереди rules.
- [ ] Тайм-аут 113 сек на нескольких уровнях (PG, Python, Celery, cgroups).
- [ ] Circuit breaker: 3 таймаута подряд → правило автоматически деактивировано.
- [ ] Полное исполнение в одной транзакции; ошибка = ROLLBACK.
- [ ] Каждое исполнение → запись в `rule_execution_log` (через отдельную транзакцию, чтобы не теряться при ROLLBACK).

### 20.2 Workflow Engine

- [ ] Один активный `process_instance` на запись (частичный UNIQUE индекс).
- [ ] Переход = условный `UPDATE ... WHERE current_stage_id = $expected` (защита от гонок).
- [ ] `Idempotency-Key` обязателен для запросов на переход.
- [ ] Таймеры обрабатываются с `FOR UPDATE SKIP LOCKED` (защита от двойного запуска при горизонтальном масштабе).
- [ ] Уведомления — только через outbox с `dedup_key`.
- [ ] Cancel сохраняет snapshot полей `process_instance.cancel_state` для восстановления.
- [ ] Эскалация на manager_of_manager — fallback на admin, если цепочка обрывается.

### 20.3 Общее

- [ ] Аудит: каждый переход, каждая запись правила пишутся в `audit.audit_log`.
- [ ] PolicyEngine вызывается из `lookup`, `set_field`, `create_record`, `transition` — никаких прямых SQL мимо.
- [ ] `notification_outbox` имеет partial-index по `next_attempt_at` для O(log n) поиска due.

---

## 21. Тестовая матрица

### 21.1 Rules Engine

| Категория | Тест | Тип |
|---|---|---|
| Парсер AST | Все узлы из EBNF принимаются | unit |
| | Узлы вне EBNF отвергаются (`unknown_node_type`) | unit |
| | `eval`-подобные конструкции невозможны | semgrep + unit |
| Типы | Несовместимые типы → 400 при сохранении правила | unit |
| | `decimal + number` запрещено | unit |
| | `now`/`today` детерминированны в рамках исполнения | unit |
| Лимиты | AST глубины 33 → 400 | unit |
| | 1001 `lookup` в правиле → `LimitExceeded` | integration |
| | Тайм-аут 113 сек → `RuleTimeout` | integration |
| Безопасность | `lookup("users; DROP TABLE...", ...)` не доходит до SQL (валидация имени сущности) | security/unit |
| | `field_ref("evil; DROP TABLE")` отвергается на валидации | security/unit |
| | Sandbox: попытка `import os` в DSL → невозможно (DSL не Python) | manual |
| | Sandbox: попытка `socket.connect` в коде интерпретатора → блокируется namespace | integration |
| | RegExp ReDoS pattern → отсечено по тайм-ауту 100 мс | unit |
| Семантика | Цикл F1 → F2 → F1 обнаружен на публикации | integration |
| | Конфликт двух autofill-правил → побеждает priority=меньше | integration |
| | `block_save` действие → транзакция откатывается, запись не создана | integration |
| | `validation` правило успешно → запись сохранена с обновлённым autofill полем | integration |
| Производительность | 1 правило на 1М-записи сущности → eval ≤ 5 мс p99 | locust |
| | 100 RPS на правила с `lookup` → p99 ≤ 50 мс | locust |

### 21.2 Workflow Engine

| Категория | Тест | Тип |
|---|---|---|
| Переход | Корректный переход → state обновлён, history запись добавлена | integration |
| | Переход с устаревшим current_stage → 409 Conflict | integration |
| | Idempotent повтор того же ключа → тот же response, состояние не меняется | integration |
| | Параллельные `approve` от двух пользователей → один success, один 409 | integration (race) |
| Таймеры | SLA таймер срабатывает → уведомление в outbox | integration |
| | Cancel перехода → таймеры стадии деактивируются | integration |
| | Manager_of_manager отсутствует → fallback на admin | integration |
| | `FOR UPDATE SKIP LOCKED` — два воркера не обрабатывают один таймер | integration (concurrent) |
| Outbox | Дубль `dedup_key` → ON CONFLICT DO NOTHING | unit |
| | Транспорт упал → status=failed, экспоненциальный backoff | integration |
| | 4 неудачи → status=dlq, suspicious_activity record | integration |
| Cancel | Cancel → snapshot восстановлен на record | integration |
| | Cancel завершённого процесса → 400 Bad Request | integration |
| | Cancel + связанные записи остаются (документируем) | integration |
| Безопасность | Транзакция перехода + outbox атомарны (всё или ничего) | integration |
| | Идемпотентность не позволяет одному человеку дважды одобрить (повторно нажать) | integration |

### 21.3 Сценарии нагрузки (Locust)

- **rule_eval_simple**: 200 RPS, правило `gt(amount, 100000)`, p99 ≤ 30 мс.
- **rule_eval_with_lookup**: 100 RPS, правило с одним `lookup`, p99 ≤ 80 мс.
- **rule_eval_with_4_lookups**: 50 RPS, p99 ≤ 200 мс.
- **process_transition**: 50 RPS, p99 ≤ 100 мс.
- **timer_scan**: 100К активных таймеров — `scan_process_timers` отрабатывает ≤ 5 сек.
- **outbox_throughput**: 10К уведомлений/мин — обрабатываются за <1 мин.

---

## Что дальше

После приёмки этой спецификации — переходим к **шагу 3 маршрута**: OpenAPI-каркас (контракт REST API) и матрица прав (Permission × Endpoint). Это разблокирует параллельную работу BE и FE.
