"""email templates library

Revision ID: 0029
Revises: 0028
Create Date: 2026-07-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS communication")

    op.create_table(
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

    # Seed system templates
    op.execute("""
    INSERT INTO communication.email_template (id, code, name, description, subject, body_html, body_text, variables, is_system) VALUES
    (
        gen_random_uuid(), 'password_reset', 'Сброс пароля',
        'Отправляется при запросе сброса пароля',
        'Сброс пароля в {{ platform_name | default("Lesovik") }}',
        '<p>Здравствуйте, <b>{{ display_name }}</b>!</p>
<p>Мы получили запрос на сброс пароля для вашего аккаунта.</p>
<p><a href="{{ reset_url }}" style="background:#35A7FF;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0">Сбросить пароль</a></p>
<p style="color:#888;font-size:13px">Ссылка действительна 1 час. Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>',
        'Здравствуйте, {{ display_name }}!

Мы получили запрос на сброс пароля.
Перейдите по ссылке: {{ reset_url }}

Ссылка действительна 1 час.
Если вы не запрашивали сброс — проигнорируйте это письмо.',
        '[{"name":"display_name","type":"string","description":"Имя пользователя","example":"Иван Иванов"},{"name":"reset_url","type":"string","description":"Ссылка для сброса","example":"https://example.com/reset?token=xxx"},{"name":"platform_name","type":"string","description":"Название платформы","example":"Lesovik"}]',
        true
    ),
    (
        gen_random_uuid(), 'invitation', 'Приглашение на платформу',
        'Отправляется при создании нового пользователя администратором',
        'Приглашение в {{ platform_name | default("Lesovik") }}',
        '<p>Здравствуйте, <b>{{ display_name }}</b>!</p>
<p>Вас пригласили на платформу бизнес-приложений.</p>
<p><b>Email:</b> {{ email }}<br><b>Временный пароль:</b> <code>{{ temp_password }}</code></p>
<p><a href="{{ platform_url }}" style="background:#35A7FF;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0">Войти на платформу</a></p>
<p style="color:#888;font-size:13px">Смените пароль после первого входа.</p>',
        'Здравствуйте, {{ display_name }}!

Вас пригласили на платформу бизнес-приложений.
Email: {{ email }}
Временный пароль: {{ temp_password }}

Войдите: {{ platform_url }}

Смените пароль после первого входа.',
        '[{"name":"display_name","type":"string","description":"Имя пользователя","example":"Иван Иванов"},{"name":"email","type":"string","description":"Email пользователя","example":"user@example.com"},{"name":"temp_password","type":"string","description":"Временный пароль","example":"TmpPass123"},{"name":"platform_url","type":"string","description":"Ссылка на платформу","example":"https://example.com/editor"},{"name":"platform_name","type":"string","description":"Название платформы","example":"Lesovik"}]',
        true
    ),
    (
        gen_random_uuid(), 'sla_breach', 'Нарушение SLA',
        'Отправляется при нарушении дедлайна заявки',
        'SLA нарушен: {{ state_name }}',
        '<p>Дедлайн по заявке истёк.</p>
<table style="border-collapse:collapse;width:100%;max-width:480px">
<tr><td style="padding:6px 12px;color:#888;font-size:13px">Заявка</td><td style="padding:6px 12px;font-weight:600">{{ instance_id }}</td></tr>
<tr style="background:#f8f9fa"><td style="padding:6px 12px;color:#888;font-size:13px">Статус</td><td style="padding:6px 12px">{{ state_name }}</td></tr>
<tr><td style="padding:6px 12px;color:#888;font-size:13px">Сущность</td><td style="padding:6px 12px">{{ entity_name | default("—") }}</td></tr>
<tr style="background:#f8f9fa"><td style="padding:6px 12px;color:#888;font-size:13px">Дедлайн</td><td style="padding:6px 12px;color:#e53e3e">{{ deadline }}</td></tr>
</table>
<p style="margin-top:16px">Примите меры для обработки заявки.</p>',
        'SLA нарушен!
Заявка: {{ instance_id }}
Статус: {{ state_name }}
Сущность: {{ entity_name | default("—") }}
Дедлайн: {{ deadline }}',
        '[{"name":"instance_id","type":"string","description":"ID заявки","example":"abc-123"},{"name":"state_name","type":"string","description":"Текущий статус","example":"На проверке"},{"name":"entity_name","type":"string","description":"Название сущности","example":"Заявка"},{"name":"deadline","type":"string","description":"Дедлайн (ISO datetime)","example":"2026-07-10T12:00:00Z"}]',
        true
    ),
    (
        gen_random_uuid(), 'sla_escalation', 'Эскалация SLA',
        'Отправляется при эскалации заявки на новый уровень',
        'Эскалация уровня {{ escalation_level }}: {{ state_name }}',
        '<p>Заявка эскалирована на уровень <b>{{ escalation_level }}</b>.</p>
<table style="border-collapse:collapse;width:100%;max-width:480px">
<tr><td style="padding:6px 12px;color:#888;font-size:13px">Заявка</td><td style="padding:6px 12px;font-weight:600">{{ instance_id }}</td></tr>
<tr style="background:#f8f9fa"><td style="padding:6px 12px;color:#888;font-size:13px">Статус</td><td style="padding:6px 12px">{{ state_name }}</td></tr>
<tr><td style="padding:6px 12px;color:#888;font-size:13px">Сущность</td><td style="padding:6px 12px">{{ entity_name | default("—") }}</td></tr>
<tr style="background:#f8f9fa"><td style="padding:6px 12px;color:#888;font-size:13px">Уровень</td><td style="padding:6px 12px;color:#e53e3e">{{ escalation_level }}</td></tr>
</table>',
        'Эскалация уровня {{ escalation_level }}!
Заявка: {{ instance_id }}
Статус: {{ state_name }}
Сущность: {{ entity_name | default("—") }}',
        '[{"name":"instance_id","type":"string","description":"ID заявки","example":"abc-123"},{"name":"state_name","type":"string","description":"Текущий статус","example":"На проверке"},{"name":"entity_name","type":"string","description":"Название сущности","example":"Заявка"},{"name":"escalation_level","type":"integer","description":"Уровень эскалации (1 или 2)","example":1}]',
        true
    ),
    (
        gen_random_uuid(), 'workflow_notification', 'Уведомление о заявке',
        'Общее уведомление при изменении статуса заявки',
        '{{ subject | default("Изменение статуса заявки") }}',
        '<p>{{ message | default("Статус вашей заявки изменился.") }}</p>
<table style="border-collapse:collapse;width:100%;max-width:480px">
<tr><td style="padding:6px 12px;color:#888;font-size:13px">Заявка</td><td style="padding:6px 12px;font-weight:600">{{ instance_id }}</td></tr>
<tr style="background:#f8f9fa"><td style="padding:6px 12px;color:#888;font-size:13px">Событие</td><td style="padding:6px 12px">{{ event }}</td></tr>
<tr><td style="padding:6px 12px;color:#888;font-size:13px">Статус</td><td style="padding:6px 12px">{{ state_name | default("—") }}</td></tr>
</table>',
        '{{ message | default("Статус вашей заявки изменился.") }}
Заявка: {{ instance_id }}
Событие: {{ event }}',
        '[{"name":"instance_id","type":"string","description":"ID заявки","example":"abc-123"},{"name":"event","type":"string","description":"Тип события","example":"transition"},{"name":"state_name","type":"string","description":"Новый статус","example":"Одобрено"},{"name":"subject","type":"string","description":"Тема письма (опционально)","example":"Ваша заявка одобрена"},{"name":"message","type":"string","description":"Текст сообщения (опционально)","example":"Ваша заявка успешно одобрена"}]',
        true
    )
    """)


def downgrade() -> None:
    op.drop_table("email_template", schema="communication")
    op.execute("DROP SCHEMA IF EXISTS communication")
