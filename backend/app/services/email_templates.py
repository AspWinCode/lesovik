"""Email template CRUD + Jinja2 rendering."""
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from jinja2 import Environment, StrictUndefined, TemplateSyntaxError, UndefinedError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.communication import EmailTemplate
from app.schemas.email_templates import (
    EmailTemplateCreate,
    EmailTemplatePreviewResponse,
    EmailTemplateRead,
    EmailTemplateUpdate,
)

logger = structlog.get_logger(__name__)

_jinja_env = Environment(undefined=StrictUndefined, autoescape=False)
_jinja_env_safe = Environment(autoescape=False)


class EmailTemplateNotFoundError(Exception):
    pass


class EmailTemplateConflictError(Exception):
    pass


class EmailTemplateRenderError(Exception):
    pass


class EmailTemplateService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_templates(self) -> list[EmailTemplateRead]:
        result = await self._db.execute(
            select(EmailTemplate).order_by(EmailTemplate.name)
        )
        return [EmailTemplateRead.model_validate(t) for t in result.scalars().all()]

    async def get_template(self, template_id: uuid.UUID) -> EmailTemplateRead:
        t = await self._fetch(template_id)
        return EmailTemplateRead.model_validate(t)

    async def get_by_code(self, code: str) -> EmailTemplate | None:
        result = await self._db.execute(
            select(EmailTemplate).where(EmailTemplate.code == code)
        )
        return result.scalar_one_or_none()

    async def create_template(self, data: EmailTemplateCreate) -> EmailTemplateRead:
        existing = await self.get_by_code(data.code)
        if existing:
            raise EmailTemplateConflictError(f"Template with code '{data.code}' already exists")

        t = EmailTemplate(
            id=uuid.uuid4(),
            code=data.code,
            name=data.name,
            description=data.description,
            subject=data.subject,
            body_html=data.body_html,
            body_text=data.body_text,
            variables=data.variables,
            is_system=False,
        )
        self._db.add(t)
        await self._db.flush()
        await self._db.refresh(t)
        return EmailTemplateRead.model_validate(t)

    async def update_template(self, template_id: uuid.UUID, data: EmailTemplateUpdate) -> EmailTemplateRead:
        t = await self._fetch(template_id)
        if data.name is not None:
            t.name = data.name
        if data.description is not None:
            t.description = data.description
        if data.subject is not None:
            t.subject = data.subject
        if data.body_html is not None:
            t.body_html = data.body_html
        if "body_text" in data.model_fields_set:
            t.body_text = data.body_text
        if data.variables is not None:
            t.variables = data.variables
        t.updated_at = datetime.now(UTC)
        await self._db.flush()
        await self._db.refresh(t)
        return EmailTemplateRead.model_validate(t)

    async def delete_template(self, template_id: uuid.UUID) -> None:
        t = await self._fetch(template_id)
        if t.is_system:
            raise PermissionError("System templates cannot be deleted")
        await self._db.delete(t)
        await self._db.flush()

    async def render_template(
        self, template_id: uuid.UUID, context: dict[str, Any]
    ) -> EmailTemplatePreviewResponse:
        t = await self._fetch(template_id)
        return self._render(t, context)

    async def render_by_code(
        self, code: str, context: dict[str, Any]
    ) -> EmailTemplatePreviewResponse | None:
        t = await self.get_by_code(code)
        if t is None:
            return None
        return self._render(t, context)

    def _render(self, t: EmailTemplate, context: dict[str, Any]) -> EmailTemplatePreviewResponse:
        try:
            subject = _jinja_env_safe.from_string(t.subject).render(**context)
            body_html = _jinja_env_safe.from_string(t.body_html).render(**context)
            body_text = (
                _jinja_env_safe.from_string(t.body_text).render(**context)
                if t.body_text
                else None
            )
        except (TemplateSyntaxError, UndefinedError) as exc:
            raise EmailTemplateRenderError(str(exc)) from exc
        return EmailTemplatePreviewResponse(subject=subject, body_html=body_html, body_text=body_text)

    async def _fetch(self, template_id: uuid.UUID) -> EmailTemplate:
        result = await self._db.execute(
            select(EmailTemplate).where(EmailTemplate.id == template_id)
        )
        t = result.scalar_one_or_none()
        if t is None:
            raise EmailTemplateNotFoundError(str(template_id))
        return t
