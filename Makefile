# No-Code Platform — корневой Makefile
# Все команды работают из корня репозитория

COMPOSE := docker compose -f infra/docker-compose.yml --env-file infra/.env
COMPOSE_PROD := docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml --env-file infra/.env

.PHONY: help up down restart logs logs-backend logs-frontend logs-worker \
        migrate migration seed shell-backend shell-db \
        test test-backend test-frontend test-integration \
        lint lint-backend lint-frontend format \
        security sast sca secrets-scan container-scan \
        clean reset-db

help:
	@echo "No-Code Platform — основные команды:"
	@echo ""
	@echo "  Управление стеком:"
	@echo "    make up                  Запустить весь стек локально"
	@echo "    make down                Остановить"
	@echo "    make restart             Перезапустить"
	@echo "    make logs                Логи всех сервисов"
	@echo "    make logs-backend        Логи backend"
	@echo ""
	@echo "  База данных:"
	@echo "    make migrate             Применить миграции"
	@echo "    make migration name=...  Создать новую миграцию"
	@echo "    make seed                Загрузить seed-данные"
	@echo "    make shell-db            psql внутрь postgres"
	@echo "    make reset-db            УДАЛИТЬ всю БД (только dev!)"
	@echo ""
	@echo "  Тесты:"
	@echo "    make test                Все тесты"
	@echo "    make test-backend        pytest"
	@echo "    make test-frontend       Vitest"
	@echo "    make test-integration    pytest -m integration"
	@echo ""
	@echo "  Качество кода:"
	@echo "    make lint                Все линтеры"
	@echo "    make format              Форматирование"
	@echo "    make security            SAST + SCA + secrets scan"
	@echo ""

# --- Стек ---
up:
	$(COMPOSE) up -d --build
	@echo ""
	@echo "Готово. Сервисы доступны:"
	@echo "  Backend:     http://localhost:8000"
	@echo "  API docs:    http://localhost:8000/api/v1/docs"
	@echo "  Frontend:    http://localhost:5173"
	@echo "  MinIO UI:    http://localhost:9001"
	@echo "  MailHog UI:  http://localhost:8025"
	@echo "  Grafana:     http://localhost:3000"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f --tail=200

logs-backend:
	$(COMPOSE) logs -f --tail=200 backend

logs-frontend:
	$(COMPOSE) logs -f --tail=200 frontend

logs-worker:
	$(COMPOSE) logs -f --tail=200 worker sandbox-worker

# --- БД ---
migrate:
	$(COMPOSE) exec backend alembic upgrade head

migration:
	@if [ -z "$(name)" ]; then echo "Usage: make migration name=add_user_table"; exit 1; fi
	$(COMPOSE) exec backend alembic revision -m "$(name)"

seed:
	$(COMPOSE) exec backend python -m app.seeds.run

shell-backend:
	$(COMPOSE) exec backend /bin/bash

shell-db:
	$(COMPOSE) exec postgres psql -U app_user -d nocode

reset-db:
	@echo "DANGER: dropping volumes. Press Ctrl+C in 5 seconds to abort..."
	@sleep 5
	$(COMPOSE) down -v
	$(COMPOSE) up -d postgres
	@sleep 3
	$(COMPOSE) up -d
	$(MAKE) migrate
	$(MAKE) seed

# --- Тесты ---
test: test-backend test-frontend

test-backend:
	$(COMPOSE) exec backend pytest -v

test-frontend:
	$(COMPOSE) exec frontend pnpm test

test-integration:
	$(COMPOSE) exec backend pytest -v -m integration

# --- Качество ---
lint: lint-backend lint-frontend

lint-backend:
	$(COMPOSE) exec backend ruff check app tests
	$(COMPOSE) exec backend mypy app

lint-frontend:
	$(COMPOSE) exec frontend pnpm lint
	$(COMPOSE) exec frontend pnpm typecheck

format:
	$(COMPOSE) exec backend ruff format app tests
	$(COMPOSE) exec backend ruff check --fix app tests
	$(COMPOSE) exec frontend pnpm format

# --- Безопасность ---
security: sast sca secrets-scan

sast:
	$(COMPOSE) exec backend bandit -r app -ll
	$(COMPOSE) exec backend semgrep --config=auto app

sca:
	$(COMPOSE) exec backend pip-audit
	$(COMPOSE) exec frontend pnpm audit --audit-level=moderate

secrets-scan:
	docker run --rm -v "$(PWD):/repo" zricethezav/gitleaks:latest detect --source=/repo --no-git -v

container-scan:
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy:latest image nocode-platform-backend:latest

# --- Очистка ---
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name dist -exec rm -rf {} + 2>/dev/null || true
