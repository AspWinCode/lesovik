"""
Sandbox Celery worker — executes Rules Engine tasks.
This worker runs in an isolated queue (no external network access in prod).
Hard time limit: 120s / soft: 113s (Celery enforced).
"""
import time
import uuid

import structlog
from celery import shared_task

from app.core.metrics import rule_executions
from app.engine.interpreter import ExecutionContext, run_rule

logger = structlog.get_logger(__name__)


@shared_task(
    name="app.worker.tasks.sandbox.execute_rule",
    bind=True,
    max_retries=0,          # Rules must not auto-retry — side effects may have occurred
    time_limit=120,
    soft_time_limit=113,
    acks_late=True,
)
def execute_rule(
    self: object,
    rule_id: str,
    rule_trigger: dict,
    rule_conditions: dict,
    rule_actions: list,
    context: dict,
    execution_id: str,
) -> dict:
    """
    Evaluate a rule against the given record context and persist mutations.

    The actual DB writes (field mutations, record creates) happen here
    so that they are atomic with the execution log entry.
    """
    start = time.monotonic()
    status = "failed"
    error_msg: str | None = None
    output: dict = {}

    ctx = ExecutionContext(
        record=dict(context.get("record", {})),
        entity_id=uuid.UUID(context["entity_id"]),
        app_id=uuid.UUID(context["app_id"]),
        event=context.get("event", "record.updated"),
        actor_id=uuid.UUID(context["actor_id"]) if context.get("actor_id") else None,
        record_id=uuid.UUID(context["record_id"]) if context.get("record_id") else None,
        changed_fields=context.get("changed_fields", []),
    )

    try:
        result = run_rule(rule_trigger, rule_conditions, rule_actions, ctx)

        if result.matched:
            output = {
                "field_mutations": result.field_mutations,
                "records_to_create": result.records_to_create,
                "records_to_update": result.records_to_update,
                "records_to_delete": result.records_to_delete,
                "notifications": result.notifications,
                "webhooks": result.webhooks,
                "errors": result.errors,
            }
            # Persist mutations to DB (requires its own DB session in worker)
            _persist_mutations(result, ctx, rule_id)
            status = "success" if not result.errors else "failed"
        else:
            status = "skipped"

    except Exception as exc:  # noqa: BLE001
        error_msg = str(exc)
        logger.exception("rule_execution_error", rule_id=rule_id, execution_id=execution_id, error=error_msg)

    duration_ms = int((time.monotonic() - start) * 1000)
    rule_executions.labels(status=status).inc()
    _write_log(rule_id, ctx, status, duration_ms, error_msg, output, execution_id)

    logger.info(
        "rule_executed",
        rule_id=rule_id,
        execution_id=execution_id,
        status=status,
        duration_ms=duration_ms,
        matched=status != "skipped",
    )
    return {"status": status, "execution_id": execution_id, "duration_ms": duration_ms}


def _persist_mutations(result: object, ctx: ExecutionContext, rule_id: str) -> None:  # type: ignore[type-arg]
    """Apply field mutations and record operations to the database."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.data import Record
    from sqlalchemy import select

    async def _run() -> None:
        async with AsyncSessionLocal() as session:
            # Field mutations — update the triggering record identified by record_id
            if result.field_mutations and ctx.record_id:  # type: ignore[attr-defined]
                stmt = select(Record).where(
                    Record.entity_id == ctx.entity_id,
                    Record.id == ctx.record_id,
                    Record.is_deleted.is_(False),
                )
                res = await session.execute(stmt)
                record = res.scalar_one_or_none()
                if record:
                    merged = {**record.payload, **result.field_mutations}  # type: ignore[attr-defined]
                    record.payload = merged
                    record.version += 1

            # Create records from actions
            for rec_create in result.records_to_create:  # type: ignore[attr-defined]
                entity_id_str = rec_create.get("entity_id")
                target_entity = uuid.UUID(entity_id_str) if entity_id_str else ctx.entity_id
                new_record = Record(
                    entity_id=target_entity,
                    payload=rec_create.get("payload", {}),
                    created_by=ctx.actor_id,
                    updated_by=ctx.actor_id,
                )
                session.add(new_record)

            # Update records from actions
            for rec_update in result.records_to_update:  # type: ignore[attr-defined]
                try:
                    target_id = uuid.UUID(rec_update["record_id"])
                except (KeyError, ValueError):
                    continue
                stmt = select(Record).where(Record.id == target_id, Record.is_deleted.is_(False))
                res = await session.execute(stmt)
                record = res.scalar_one_or_none()
                if record:
                    merged = {**record.payload, **rec_update.get("payload", {})}
                    record.payload = merged
                    record.version += 1

            # Soft-delete records from actions
            for record_id_str in result.records_to_delete:  # type: ignore[attr-defined]
                try:
                    target_id = uuid.UUID(record_id_str)
                except ValueError:
                    continue
                stmt = select(Record).where(Record.id == target_id, Record.is_deleted.is_(False))
                res = await session.execute(stmt)
                record = res.scalar_one_or_none()
                if record:
                    record.is_deleted = True

            # Dispatch notifications with Jinja2-rendered templates
            for notif in result.notifications:  # type: ignore[attr-defined]
                if not notif.get("to"):
                    continue
                from app.worker.tasks.notifications import send_email
                template_str = notif.get("template", "")
                record_ctx = notif.get("context", {})
                try:
                    from jinja2 import BaseLoader, Environment, select_autoescape
                    env = Environment(loader=BaseLoader(), autoescape=select_autoescape(["html"]))
                    body_html = env.from_string(template_str).render(**record_ctx)
                except Exception:  # noqa: BLE001
                    body_html = template_str  # fallback to raw template
                send_email.apply_async(
                    kwargs={
                        "to": notif["to"],
                        "subject": notif.get("subject", ""),
                        "body_html": body_html,
                    },
                    queue="notifications",
                )

            await session.commit()

    asyncio.run(_run())


def _write_log(
    rule_id: str,
    ctx: ExecutionContext,
    status: str,
    duration_ms: int,
    error: str | None,
    output: dict,
    execution_id: str,
) -> None:
    """Write execution log entry (best-effort, non-blocking)."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.logic import RuleExecutionLog

    async def _run() -> None:
        async with AsyncSessionLocal() as session:
            log = RuleExecutionLog(
                id=uuid.UUID(execution_id),
                rule_id=uuid.UUID(rule_id),
                entity_id=ctx.entity_id,
                app_id=ctx.app_id,
                event=ctx.event,
                status=status,
                duration_ms=duration_ms,
                error=error,
                input_snapshot=ctx.record,
                output_snapshot=output or None,
            )
            session.add(log)
            await session.commit()

    try:
        asyncio.run(_run())
    except Exception as exc:  # noqa: BLE001
        logger.warning("rule_log_write_failed", rule_id=rule_id, error=str(exc))
