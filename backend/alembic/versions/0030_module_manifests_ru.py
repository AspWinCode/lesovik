"""Update module manifests: Russian names, select choices, page entity hints.

Revision ID: 0030
Revises: 0029
Create Date: 2026-07-18
"""
from collections.abc import Sequence
import json

import sqlalchemy as sa
from alembic import op

revision: str = "0030"
down_revision: str | None = "0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _manifests() -> dict[str, dict]:
    return {
        "enterprise": {
            "entities": [
                ["departments", "Отделы", [
                    ["name", "Название", "text"],
                    ["parent", "Родительский отдел", "text"],
                ]],
                ["employees", "Сотрудники", [
                    ["full_name", "ФИО", "text"],
                    ["email", "Email", "email"],
                    ["department", "Отдел", "text"],
                ]],
                ["positions", "Должности", [
                    ["name", "Название", "text"],
                    ["level", "Уровень", "number"],
                ]],
                ["counterparties", "Контрагенты", [
                    ["name", "Название", "text"],
                    ["tax_id", "ИНН", "text"],
                    ["type", "Тип", "select", {"choices": ["ООО", "ИП", "АО", "ПАО", "ГУП", "НКО", "Другое"]}],
                ]],
            ],
            "pages": [["enterprise", "Предприятие", "table", "employees"]],
        },
        "warehouse": {
            "entities": [
                ["products", "Товары", [
                    ["name", "Название", "text"],
                    ["sku", "Артикул", "text"],
                    ["unit", "Единица измерения", "text"],
                ]],
                ["warehouses", "Склады", [
                    ["name", "Название", "text"],
                    ["location", "Местоположение", "text"],
                ]],
                ["stock_balances", "Остатки", [
                    ["product", "Товар", "text"],
                    ["warehouse", "Склад", "text"],
                    ["quantity", "Количество", "number"],
                ]],
                ["stock_operations", "Складские операции", [
                    ["operation_type", "Тип операции", "select", {"choices": ["Приход", "Расход", "Перемещение", "Списание", "Инвентаризация"]}],
                    ["product", "Товар", "text"],
                    ["quantity", "Количество", "number"],
                ]],
            ],
            "pages": [["warehouse", "Склад", "table", "products"]],
        },
        "production": {
            "entities": [
                ["production_orders", "Производственные заказы", [
                    ["number", "Номер", "text"],
                    ["status", "Статус", "select", {"choices": ["Черновик", "В производстве", "Завершён", "Отменён"]}],
                    ["due_date", "Срок", "date"],
                ]],
                ["bom", "Спецификации (BOM)", [
                    ["product", "Продукт", "text"],
                    ["component", "Компонент", "text"],
                    ["quantity", "Количество", "number"],
                ]],
                ["production_operations", "Производственные операции", [
                    ["name", "Название", "text"],
                    ["work_center", "Рабочий центр", "text"],
                    ["duration", "Длительность", "number"],
                ]],
            ],
            "pages": [["production", "Производство", "table", "production_orders"]],
        },
        "orders": {
            "entities": [
                ["customer_orders", "Заказы клиентов", [
                    ["number", "Номер", "text"],
                    ["customer", "Клиент", "text"],
                    ["status", "Статус", "select", {"choices": ["Новый", "Подтверждён", "Отгружен", "Завершён", "Отменён"]}],
                ]],
                ["order_items", "Позиции заказа", [
                    ["order", "Заказ", "text"],
                    ["product", "Товар", "text"],
                    ["quantity", "Количество", "number"],
                ]],
                ["shipments", "Отгрузки", [
                    ["number", "Номер", "text"],
                    ["order", "Заказ", "text"],
                    ["shipped_at", "Дата отгрузки", "datetime"],
                ]],
            ],
            "pages": [["orders", "Заказы", "table", "customer_orders"]],
        },
        "finance": {
            "entities": [
                ["budget_items", "Статьи бюджета", [
                    ["name", "Название", "text"],
                    ["code", "Код", "text"],
                ]],
                ["payment_documents", "Платёжные документы", [
                    ["number", "Номер", "text"],
                    ["amount", "Сумма", "decimal"],
                    ["status", "Статус", "select", {"choices": ["Черновик", "На согласовании", "Оплачен", "Отменён"]}],
                ]],
                ["transactions", "Транзакции", [
                    ["amount", "Сумма", "decimal"],
                    ["counterparty", "Контрагент", "text"],
                    ["posted_at", "Дата проводки", "datetime"],
                ]],
                ["budgets", "Бюджеты", [
                    ["name", "Название", "text"],
                    ["period", "Период", "text"],
                    ["amount", "Сумма", "decimal"],
                ]],
            ],
            "pages": [["finance", "Финансы", "table", "payment_documents"]],
        },
        "contracts": {
            "entities": [
                ["contracts", "Договоры", [
                    ["number", "Номер", "text"],
                    ["counterparty", "Контрагент", "text"],
                    ["status", "Статус", "select", {"choices": ["Проект", "На согласовании", "Действующий", "Расторгнут", "Истёк"]}],
                ]],
                ["contract_attachments", "Вложения договоров", [
                    ["contract", "Договор", "text"],
                    ["name", "Название", "text"],
                    ["file", "Файл", "file"],
                ]],
                ["contract_stages", "Этапы договоров", [
                    ["contract", "Договор", "text"],
                    ["stage", "Этап", "text"],
                    ["due_date", "Срок", "date"],
                ]],
            ],
            "pages": [["contracts", "Договоры", "table", "contracts"]],
        },
        "hr": {
            "entities": [
                ["candidates", "Кандидаты", [
                    ["full_name", "ФИО", "text"],
                    ["email", "Email", "email"],
                    ["status", "Статус", "select", {"choices": ["Новый", "Телефонное интервью", "Интервью", "Оффер", "Принят", "Отказ"]}],
                ]],
                ["hiring_requests", "Заявки на найм", [
                    ["position", "Должность", "text"],
                    ["department", "Отдел", "text"],
                    ["status", "Статус", "select", {"choices": ["Открыта", "В работе", "Приостановлена", "Закрыта"]}],
                ]],
                ["reviews", "Оценки", [
                    ["employee", "Сотрудник", "text"],
                    ["score", "Оценка", "number"],
                    ["period", "Период", "text"],
                ]],
                ["training", "Обучение", [
                    ["name", "Название", "text"],
                    ["employee", "Сотрудник", "text"],
                    ["completed", "Завершено", "boolean"],
                ]],
                ["vacations", "Отпуска", [
                    ["employee", "Сотрудник", "text"],
                    ["start_date", "Дата начала", "date"],
                    ["end_date", "Дата окончания", "date"],
                ]],
            ],
            "pages": [["hr", "HR", "table", "candidates"]],
        },
        "projects": {
            "entities": [
                ["projects", "Проекты", [
                    ["name", "Название", "text"],
                    ["status", "Статус", "select", {"choices": ["Планирование", "В работе", "На паузе", "Завершён", "Отменён"]}],
                    ["owner", "Владелец", "text"],
                ]],
                ["tasks", "Задачи", [
                    ["title", "Заголовок", "text"],
                    ["status", "Статус", "select", {"choices": ["К выполнению", "В работе", "На проверке", "Готово"]}],
                    ["assignee", "Исполнитель", "text"],
                ]],
                ["milestones", "Вехи", [
                    ["name", "Название", "text"],
                    ["due_date", "Срок", "date"],
                ]],
                ["resources", "Ресурсы", [
                    ["name", "Название", "text"],
                    ["capacity", "Мощность", "number"],
                ]],
            ],
            "pages": [["projects", "Проекты", "kanban", "projects"]],
        },
        "analytics": {
            "entities": [
                ["kpis", "KPI", [
                    ["name", "Название", "text"],
                    ["value", "Значение", "decimal"],
                    ["target", "Цель", "decimal"],
                ]],
                ["dashboards", "Дашборды", [
                    ["name", "Название", "text"],
                    ["owner", "Владелец", "text"],
                ]],
                ["reports", "Отчёты", [
                    ["name", "Название", "text"],
                    ["source", "Источник", "text"],
                ]],
            ],
            "pages": [["analytics", "Аналитика", "dashboard", "kpis"]],
        },
        "documents": {
            "entities": [
                ["documents", "Документы", [
                    ["number", "Регистрационный номер", "autonumber"],
                    ["title", "Заголовок", "text"],
                    ["kind", "Вид", "select", {"choices": ["Входящий", "Исходящий", "Внутренний"]}],
                    ["case_code", "Дело", "text"],
                    ["counterparty", "Контрагент", "text"],
                    ["author", "Автор", "text"],
                    ["status", "Статус", "select", {"choices": ["Черновик", "На регистрации", "Зарегистрирован", "Архивирован"]}],
                    ["registered_at", "Дата регистрации", "datetime"],
                    ["retention_until", "Хранить до", "date"],
                ]],
                ["filing_cases", "Дела", [
                    ["code", "Код дела", "text"],
                    ["index", "Индекс номенклатуры", "text"],
                    ["title", "Заголовок", "text"],
                    ["category", "Категория", "select", {"choices": ["Приказы", "Договоры", "Финансы", "Кадры", "Переписка", "Прочее"]}],
                    ["owner_department", "Отдел-владелец", "text"],
                    ["retention_years", "Срок хранения (лет)", "number"],
                    ["opened_at", "Дата открытия", "date"],
                    ["closed_at", "Дата закрытия", "date"],
                    ["export_ready", "Готово к архивации", "boolean"],
                ]],
            ],
            "sequences": [["documents", "number", {"prefix": "DOC-", "padding": 6, "start": 1}]],
            "pages": [["documents", "Документы", "table", "documents"]],
        },
        "it_support": {
            "entities": [
                ["tickets", "Заявки", [
                    ["title", "Заголовок", "text"],
                    ["priority", "Приоритет", "select", {"choices": ["Низкий", "Средний", "Высокий", "Критический"]}],
                    ["status", "Статус", "select", {"choices": ["Новая", "В работе", "Ожидание", "Решена", "Закрыта"]}],
                ]],
                ["equipment", "Оборудование", [
                    ["name", "Название", "text"],
                    ["serial", "Серийный номер", "text"],
                    ["owner", "Владелец", "text"],
                ]],
                ["incidents", "Инциденты", [
                    ["title", "Заголовок", "text"],
                    ["severity", "Серьёзность", "select", {"choices": ["Низкая", "Средняя", "Высокая", "Критическая"]}],
                    ["resolved", "Решено", "boolean"],
                ]],
                ["sla_policies", "SLA-политики", [
                    ["name", "Название", "text"],
                    ["response_minutes", "Время ответа (мин)", "number"],
                ]],
            ],
            "pages": [["it-support", "IT-поддержка", "kanban", "tickets"]],
        },
    }


def upgrade() -> None:
    conn = op.get_bind()
    manifests = _manifests()
    for code, manifest in manifests.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog.module_version mv
                SET manifest = CAST(:manifest AS jsonb),
                    changelog = changelog || E'\n1.1.0: Russian display names, select choices, page entity hints'
                FROM catalog.module m
                WHERE mv.module_id = m.id
                  AND m.code = :code
                  AND mv.is_current = true
                """
            ),
            {"code": code, "manifest": json.dumps(manifest)},
        )


def downgrade() -> None:
    pass  # manifests from 0012 are no longer stored verbatim; skip rollback
