"""
Workflow Celery tasks.

check_sla_breach — wakes up at the SLA deadline and, if the instance is
still in the expected state, fires the state's sla_breach_actions.
"""
import uuid

import structlog
from celery import shared_task

from app.core.metrics import sla_breaches

logger = structlog.get_logger(__name__)


@shared_task(
    name="app.worker.tasks.workflow.check_sla_breach",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    acks_late=True,
)
def check_sla_breach(
    self: object,
    instance_id: str,
    expected_state: str,
    workflow_id: str,
) -> dict:
    """
    Check whether a workflow instance has breached its SLA.

    If the instance is still in `expected_state` at execution time, run
    the state's `sla_breach_actions`. If the state has already changed,
    the transition happened in time — do nothing.
    """
    import asyncio

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.engine.fsm import build_fsm_spec, enter_initial_state
        from app.engine.interpreter import ExecutionContext, execute_actions
        from app.models.workflow import StateDef, TransitionDef, WorkflowDef, WorkflowInstance
        from sqlalchemy import select

        async with AsyncSessionLocal() as session:
            inst_result = await session.execute(
                select(WorkflowInstance).where(WorkflowInstance.id == uuid.UUID(instance_id))
            )
            instance = inst_result.scalar_one_or_none()
            if instance is None:
                logger.warning("sla_instance_not_found", instance_id=instance_id)
                return {"status": "skipped", "reason": "instance_not_found"}

            if instance.current_state != expected_state:
                logger.info("sla_state_changed", instance_id=instance_id,
                            expected=expected_state, actual=instance.current_state)
                return {"status": "skipped", "reason": "state_already_changed"}

            # Load sla_breach_actions for this state
            state_result = await session.execute(
                select(StateDef).where(
                    StateDef.workflow_id == uuid.UUID(workflow_id),
                    StateDef.name == expected_state,
                )
            )
            state = state_result.scalar_one_or_none()
            if state is None or not state.sla_breach_actions:
                logger.info("sla_no_breach_actions", instance_id=instance_id,
                            state=expected_state)
                return {"status": "skipped", "reason": "no_breach_actions"}

            ctx = ExecutionContext(
                record={},
                entity_id=instance.entity_id,
                app_id=instance.app_id,
                event="workflow.sla_breach",
                extra={
                    "instance_id": instance_id,
                    "workflow_id": workflow_id,
                    "state": expected_state,
                },
            )
            result = execute_actions(list(state.sla_breach_actions), ctx)

            # Dispatch notifications synchronously from worker
            for notif in result.notifications:
                if notif.get("to"):
                    from app.worker.tasks.notifications import send_email
                    send_email.apply_async(
                        kwargs={
                            "to": notif["to"],
                            "subject": notif.get("subject", "SLA Breach"),
                            "body_html": notif.get("template", ""),
                        },
                        queue="notifications",
                    )

            sla_breaches.labels(workflow_id=workflow_id).inc()
            await session.commit()

            logger.info("sla_breach_executed", instance_id=instance_id,
                        state=expected_state, errors=result.errors)
            return {
                "status": "executed",
                "instance_id": instance_id,
                "state": expected_state,
                "errors": result.errors,
            }

    return asyncio.run(_run())
