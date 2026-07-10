"""email templates library

Revision ID: 0029
Revises: 0028
Create Date: 2026-07-11
"""
import json
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None

_TEMPLATES = [
    {
        "code": "password_reset",
        "name": "Сброс пароля",
        "description": "Отправляется при запросе сброса пароля",
        "subject": "Сброс пароля в {{ platform_name | default('Lesovik') }}",
        "body_html": (
            "<p>Здравствуйте, <b>{{ display_name }}</b>!</p>\n"
            "<p>Мы получили запрос на сброс пароля для вашего аккаунта.</p>\n"
            "<p><a href=\"{{ reset_url }}\" style=\"background:#35A7FF;color:#fff;padding:10px 20px;"
            "border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0\">"
            "Сбросить пароль</a></p>\n"
            "<p style=\"color:#888;font-size:13px\">Ссылка действительна 1 час. "
            "Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>"
        ),
        "body_text": (
            "Здравствуйте, {{ display_name }}!\n\n"
            "Мы получили запрос на сброс пароля.\n"
            "Перейдите по ссылке: {{ reset_url }}\n\n"
            "Ссылка действительна 1 час.\n"
            "Если вы не запрашивали сброс — проигнорируйте это письмо."
        ),
        "variables": [
            {"name": "display_name", "type": "string", "description": "Имя пользователя", "example": "Иван Иванов"},
            {"name": "reset_url", "type": "string", "description": "Ссылка для сброса", "example": "https://example.com/reset?token=xxx"},
            {"name": "platform_name", "type": "string", "description": "Название платформы", "example": "Lesovik"},
        ],
    },
    {
        "code": "invitation",
        "name": "Приглашение на платформу",
        "description": "Отправляется при создании нового пользователя администратором",
        "subject": "Приглашение в {{ platform_name | default('Lesovik') }}",
        "body_html": (
            "<p>Здравствуйте, <b>{{ display_name }}</b>!</p>\n"
            "<p>Вас пригласили на платформу бизнес-приложений.</p>\n"
            "<p><b>Email:</b> {{ email }}<br><b>Временный пароль:</b> <code>{{ temp_password }}</code></p>\n"
            "<p><a href=\"{{ platform_url }}\" style=\"background:#35A7FF;color:#fff;padding:10px 20px;"
            "border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0\">"
            "Войти на платформу</a></p>\n"
            "<p style=\"color:#888;font-size:13px\">Смените пароль после первого входа.</p>"
        ),
        "body_text": (
            "Здравствуйте, {{ display_name }}!\n\n"
            "Вас пригласили на платформу бизнес-приложений.\n"
            "Email: {{ email }}\nВременный пароль: {{ temp_password }}\n\n"
            "Войдите: {{ platform_url }}\n\n"
            "Смените пароль после первого входа."
        ),
        "variables": [
            {"name": "display_name", "type": "string", "description": "Имя пользователя", "example": "Иван Иванов"},
            {"name": "email", "type": "string", "description": "Email пользователя", "example": "user@example.com"},
            {"name": "temp_password", "type": "string", "description": "Временный пароль", "example": "TmpPass123"},
            {"name": "platform_url", "type": "string", "description": "Ссылка на платформу", "example": "https://example.com/editor"},
            {"name": "platform_name", "type": "string", "description": "Название платформы", "example": "Lesovik"},
        ],
    },
    {
        "code": "sla_breach",
        "name": "Нарушение SLA",
        "description": "Отправляется при нарушении дедлайна заявки",
        "subject": "SLA нарушен: {{ state_name }}",
        "body_html": (
            "<p>Дедлайн по заявке истёк.</p>\n"
            "<table style=\"border-collapse:collapse;width:100%;max-width:480px\">\n"
            "<tr><td style=\"padding:6px 12px;color:#888\">Заявка</td>"
            "<td style=\"padding:6px 12px;font-weight:600\">{{ instance_id }}</td></tr>\n"
            "<tr style=\"background:#f8f9fa\"><td style=\"padding:6px 12px;color:#888\">Статус</td>"
            "<td style=\"padding:6px 12px\">{{ state_name }}</td></tr>\n"
            "<tr><td style=\"padding:6px 12px;color:#888\">Сущность</td>"
            "<td style=\"padding:6px 12px\">{{ entity_name | default('—') }}</td></tr>\n"
            "<tr style=\"background:#f8f9fa\"><td style=\"padding:6px 12px;color:#888\">Дедлайн</td>"
            "<td style=\"padding:6px 12px;color:#e53e3e\">{{ deadline }}</td></tr>\n"
            "</table>\n"
            "<p style=\"margin-top:16px\">Примите меры для обработки заявки.</p>"
        ),
        "body_text": (
            "SLA нарушен!\nЗаявка: {{ instance_id }}\n"
            "Статус: {{ state_name }}\nСущность: {{ entity_name | default('—') }}\n"
            "Дедлайн: {{ deadline }}"
        ),
        "variables": [
            {"name": "instance_id", "type": "string", "description": "ID заявки", "example": "abc-123"},
            {"name": "state_name", "type": "string", "description": "Текущий статус", "example": "На проверке"},
            {"name": "entity_name", "type": "string", "description": "Название сущности", "example": "Заявка"},
            {"name": "deadline", "type": "string", "description": "Дедлайн (ISO datetime)", "example": "2026-07-10T12:00:00Z"},
        ],
    },
    {
        "code": "sla_escalation",
        "name": "Эскалация SLA",
        "description": "Отправляется при эскалации заявки на новый уровень",
        "subject": "Эскалация уровня {{ escalation_level }}: {{ state_name }}",
        "body_html": (
            "<p>Заявка эскалирована на уровень <b>{{ escalation_level }}</b>.</p>\n"
            "<table style=\"border-collapse:collapse;width:100%;max-width:480px\">\n"
            "<tr><td style=\"padding:6px 12px;color:#888\">Заявка</td>"
            "<td style=\"padding:6px 12px;font-weight:600\">{{ instance_id }}</td></tr>\n"
            "<tr style=\"background:#f8f9fa\"><td style=\"padding:6px 12px;color:#888\">Статус</td>"
            "<td style=\"padding:6px 12px\">{{ state_name }}</td></tr>\n"
            "<tr><td style=\"padding:6px 12px;color:#888\">Уровень</td>"
            "<td style=\"padding:6px 12px;color:#e53e3e\">{{ escalation_level }}</td></tr>\n"
            "</table>"
        ),
        "body_text": (
            "Эскалация уровня {{ escalation_level }}!\n"
            "Заявка: {{ instance_id }}\nСтатус: {{ state_name }}"
        ),
        "variables": [
            {"name": "instance_id", "type": "string", "description": "ID заявки", "example": "abc-123"},
            {"name": "state_name", "type": "string", "description": "Текущий статус", "example": "На проверке"},
            {"name": "escalation_level", "type": "integer", "description": "Уровень эскалации (1 или 2)", "example": "1"},
        ],
    },
    {
        "code": "workflow_notification",
        "name": "Уведомление о заявке",
        "description": "Общее уведомление при изменении статуса заявки",
        "subject": "{{ subject | default('Изменение статуса заявки') }}",
        "body_html": (
            "<p>{{ message | default('Статус вашей заявки изменился.') }}</p>\n"
            "<table style=\"border-collapse:collapse;width:100%;max-width:480px\">\n"
            "<tr><td style=\"padding:6px 12px;color:#888\">Заявка</td>"
            "<td style=\"padding:6px 12px;font-weight:600\">{{ instance_id }}</td></tr>\n"
            "<tr style=\"background:#f8f9fa\"><td style=\"padding:6px 12px;color:#888\">Событие</td>"
            "<td style=\"padding:6px 12px\">{{ event }}</td></tr>\n"
            "</table>"
        ),
        "body_text": (
            "{{ message | default('Статус вашей заявки изменился.') }}\n"
            "Заявка: {{ instance_id }}\nСобытие: {{ event }}"
        ),
        "variables": [
            {"name": "instance_id", "type": "string", "description": "ID заявки", "example": "abc-123"},
            {"name": "event", "type": "string", "description": "Тип события", "example": "transition"},
            {"name": "state_name", "type": "string", "description": "Новый статус", "example": "Одобрено"},
            {"name": "subject", "type": "string", "description": "Тема письма (опционально)", "example": "Ваша заявка одобрена"},
            {"name": "message", "type": "string", "description": "Текст сообщения (опционально)", "example": "Заявка успешно одобрена"},
        ],
    },
]


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS communication")

    tbl = op.create_table(
        "email_template",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(128), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("subject", sa.Text, nullable=False),
        sa.Column("body_html", sa.Text, nullable=False),
        sa.Column("body_text", sa.Text, nullable=True),
        sa.Column("variables", JSONB, nullable=False, server_default="[]"),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("code", name="uq_email_template_code"),
        schema="communication",
    )
    op.create_index("ix_email_template_code", "email_template", ["code"], schema="communication")

    op.bulk_insert(tbl, [
        {
            "id": uuid.uuid4(),
            "code": t["code"],
            "name": t["name"],
            "description": t["description"],
            "subject": t["subject"],
            "body_html": t["body_html"],
            "body_text": t["body_text"],
            "variables": t["variables"],
            "is_system": True,
        }
        for t in _TEMPLATES
    ])


def downgrade() -> None:
    op.drop_table("email_template", schema="communication")
    op.execute("DROP SCHEMA IF EXISTS communication")
