"""Backfill field_options.choices for select fields created by module installs.

Revision ID: 0031
Revises: 0030
Create Date: 2026-07-18
"""
from collections.abc import Sequence
import json

import sqlalchemy as sa
from alembic import op

revision: str = "0031"
down_revision: str | None = "0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# entity_slug -> field_name -> choices list
FIELD_CHOICES: dict[str, dict[str, list[str]]] = {
    "counterparties":      {"type":           ["ООО", "ИП", "АО", "ПАО", "ГУП", "НКО", "Другое"]},
    "stock_operations":    {"operation_type":  ["Приход", "Расход", "Перемещение", "Списание", "Инвентаризация"]},
    "production_orders":   {"status":          ["Черновик", "В производстве", "Завершён", "Отменён"]},
    "customer_orders":     {"status":          ["Новый", "Подтверждён", "Отгружен", "Завершён", "Отменён"]},
    "payment_documents":   {"status":          ["Черновик", "На согласовании", "Оплачен", "Отменён"]},
    "contracts":           {"status":          ["Проект", "На согласовании", "Действующий", "Расторгнут", "Истёк"]},
    "candidates":          {"status":          ["Новый", "Телефонное интервью", "Интервью", "Оффер", "Принят", "Отказ"]},
    "hiring_requests":     {"status":          ["Открыта", "В работе", "Приостановлена", "Закрыта"]},
    "projects":            {"status":          ["Планирование", "В работе", "На паузе", "Завершён", "Отменён"]},
    "tasks":               {"status":          ["К выполнению", "В работе", "На проверке", "Готово"]},
    "documents":           {
        "kind":   ["Входящий", "Исходящий", "Внутренний"],
        "status": ["Черновик", "На регистрации", "Зарегистрирован", "Архивирован"],
    },
    "filing_cases":        {"category":        ["Приказы", "Договоры", "Финансы", "Кадры", "Переписка", "Прочее"]},
    "tickets":             {
        "priority": ["Низкий", "Средний", "Высокий", "Критический"],
        "status":   ["Новая", "В работе", "Ожидание", "Решена", "Закрыта"],
    },
    "incidents":           {"severity":        ["Низкая", "Средняя", "Высокая", "Критическая"]},
}


def upgrade() -> None:
    conn = op.get_bind()
    for entity_slug, fields in FIELD_CHOICES.items():
        for field_name, choices in fields.items():
            new_options = json.dumps({"choices": [{"value": c, "label": c} for c in choices]})
            conn.execute(
                sa.text(
                    """
                    UPDATE metamodel.field f
                    SET field_options = CAST(:options AS jsonb)
                    FROM metamodel.entity e
                    WHERE f.entity_id = e.id
                      AND e.slug = :entity_slug
                      AND f.name = :field_name
                      AND f.field_type = 'select'
                      AND (f.field_options IS NULL
                           OR f.field_options = '{}'::jsonb
                           OR NOT (f.field_options ? 'choices'))
                    """
                ),
                {"options": new_options, "entity_slug": entity_slug, "field_name": field_name},
            )


def downgrade() -> None:
    pass  # clearing choices would destroy user-added options too — skip
