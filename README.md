# No-Code Platform — корпоративный конструктор бизнес-приложений

> Внутрикорпоративная No-Code платформа для создания бизнес-приложений из модулей и блоков. MVP в разработке (3 месяца, см. [`ARCHITECTURE.md`](ARCHITECTURE.md)).

## Стек

- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic + Celery
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query + Zustand + dnd-kit + React Flow
- **БД**: PostgreSQL 16 (JSONB-based metamodel)
- **Очереди**: Redis 7 + Celery
- **Файлы**: S3-совместимое (managed S3 в проде, MinIO в dev)
- **Антивирус**: ClamAV
- **Инфра**: Docker Compose (dev), managed PG/Redis/S3 в проде (YC/VK Cloud/Selectel)

## Структура репозитория

```
.
├── ARCHITECTURE.md          # Архитектурное видение и план MVP
├── docs/                    # Технические спецификации
│   ├── DATABASE_SCHEMA.md   # Схема БД (50+ таблиц, индексы, RLS)
│   ├── RULES_AND_WORKFLOW.md # Rules Engine + Workflow Engine
│   ├── API_CONTRACT.md      # REST API контракт + матрица прав
│   └── FIGMA_QUESTIONS.md   # Вопросы к дизайнеру
├── backend/                 # FastAPI приложение
│   ├── app/                 # Исходники
│   ├── tests/               # pytest
│   ├── alembic/             # Миграции БД
│   └── pyproject.toml       # Зависимости и конфигурация
├── frontend/                # React приложение
│   ├── src/                 # Исходники (раздельные бандлы /editor, /runtime)
│   └── package.json
├── infra/                   # Docker, Compose, .env.example
└── .github/workflows/       # CI/CD
```

## Быстрый старт (разработка)

### Предусловия

- Docker Desktop ≥ 24
- Python 3.12 (для локального запуска backend вне Docker)
- Node.js 20 LTS + pnpm 9 (для локального запуска frontend)
- Make (опционально — все команды есть в Makefile)

### Запуск через Docker Compose

```bash
cp infra/.env.example infra/.env
make up           # docker compose up -d
make migrate      # применить миграции БД
make seed         # загрузить минимальные seed-данные (роли, permissions)
```

После старта:
- Backend API: http://localhost:8000
- OpenAPI Swagger: http://localhost:8000/api/v1/docs
- Frontend: http://localhost:5173
- MinIO console: http://localhost:9001 (minioadmin/minioadmin)
- MailHog (dev SMTP): http://localhost:8025
- Grafana: http://localhost:3000 (admin/admin)

### Запуск без Docker (для разработки одного из слоёв)

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
pnpm install
pnpm dev
```

## Команды разработки

| Команда | Что делает |
|---|---|
| `make up` | Запустить весь стек локально |
| `make down` | Остановить |
| `make logs` | Логи всех сервисов |
| `make logs-backend` | Логи только backend |
| `make migrate` | Применить миграции |
| `make migration name=foo` | Создать пустую миграцию |
| `make test` | Запустить все тесты |
| `make test-backend` | Тесты только backend |
| `make test-frontend` | Тесты только frontend |
| `make lint` | Линтеры |
| `make format` | Форматирование |
| `make security` | SAST + SCA + secrets scan локально |
| `make clean` | Очистка временных файлов |

## CI/CD

При каждом push и PR:
1. **Lint**: ruff (Python), eslint (TS)
2. **Type-check**: mypy, tsc
3. **Тесты**: pytest + Vitest
4. **SAST**: Bandit + semgrep (Python rules + custom)
5. **SCA**: pip-audit + npm audit + osv-scanner
6. **Secrets**: gitleaks
7. **Container scan**: Trivy
8. **Build**: Docker images

См. [`.github/workflows/`](.github/workflows/) для деталей.

## Документация

Перед началом работы прочитать в порядке:
1. [`ARCHITECTURE.md`](ARCHITECTURE.md) — общее видение
2. [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — модель данных
3. [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) — REST API
4. [`docs/RULES_AND_WORKFLOW.md`](docs/RULES_AND_WORKFLOW.md) — сложные подсистемы
5. [`docs/FIGMA_QUESTIONS.md`](docs/FIGMA_QUESTIONS.md) — UX/UI открытые вопросы

## Безопасность

- Серверы и бэкапы — в РФ (152-ФЗ)
- AES-256 в покое (TDE managed PG + LUKS дисков)
- TLS 1.2+ обязательно, HSTS включён
- 2FA TOTP — обязательно для админов
- Append-only аудит-журнал с hash-chain
- SAST/DAST/sqlmap в CI
- Pentest перед go-live

Уязвимости — на security@<домен компании>.

## Лицензия

Внутренняя разработка, проприетарная.
