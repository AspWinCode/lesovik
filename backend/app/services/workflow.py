"""WorkflowService: definition CRUD, instance lifecycle, transition execution."""
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.metrics import workflow_instances_active, workflow_transitions
from app.engine.fsm import (
    FSMError,
    FSMTransitionResult,
    build_fsm_spec,
    enter_initial_state,
    execute_fsm_transition,
)
from app.models.workflow import (
    StateDef,
    TransitionDef,
    TransitionLog,
    WorkflowDef,
    WorkflowInstance,
)
from app.schemas.workflow import (
    AvailableTransitionRead,
    StartInstanceRequest,
    StateDefCreate,
    StateDefRead,
    StateDefUpdate,
    TransitionDefCreate,
    TransitionDefRead,
    TransitionDefUpdate,
    TransitionLogRead,
    TransitionRequest,
    TransitionResponse,
    WorkflowDefCreate,
    WorkflowDefRead,
    WorkflowDefUpdate,
    WorkflowInstanceRead,
)

logger = structlog.get_logger(__name__)


# ------------------------------------------------------------------
# Domain errors
# ------------------------------------------------------------------

class WorkflowNotFoundError(Exception):
    pass


class WorkflowStateNotFoundError(Exception):
    pass


class WorkflowTransitionNotFoundError(Exception):
    pass


class WorkflowInstanceNotFoundError(Exception):
    pass


class WorkflowInstanceAlreadyExistsError(Exception):
    pass


class WorkflowTransitionError(Exception):
    """Raised when transition cannot be executed (guard, role, terminal)."""
    pass


class WorkflowConcurrentModificationError(Exception):
    """Raised when conditional UPDATE finds the instance was concurrently modified."""
    def __init__(self, instance_id: uuid.UUID) -> None:
        super().__init__(f"Concurrent modification on instance {instance_id}")
        self.instance_id = instance_id


# ------------------------------------------------------------------
# Service
# ------------------------------------------------------------------

class WorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ==============================================================
    # WorkflowDef CRUD
    # ==============================================================

    async def list_workflows(
        self,
        app_id: uuid.UUID,
        entity_id: uuid.UUID | None = None,
        active_only: bool = False,
    ) -> list[WorkflowDefRead]:
        stmt = select(WorkflowDef).where(WorkflowDef.app_id == app_id)
        if entity_id:
            stmt = stmt.where(WorkflowDef.entity_id == entity_id)
        if active_only:
            stmt = stmt.where(WorkflowDef.is_active.is_(True))
        result = await self._db.execute(stmt.order_by(WorkflowDef.created_at))
        return [WorkflowDefRead.model_validate(r) for r in result.scalars()]

    async def get_workflow(self, app_id: uuid.UUID, workflow_id: uuid.UUID) -> WorkflowDefRead:
        wf = await self._fetch_workflow(app_id, workflow_id)
        return WorkflowDefRead.model_validate(wf)

    async def create_workflow(
        self, app_id: uuid.UUID, data: WorkflowDefCreate
    ) -> WorkflowDefRead:
        wf = WorkflowDef(
            app_id=app_id,
            entity_id=data.entity_id,
            name=data.name,
            description=data.description,
            initial_state=data.initial_state,
            is_active=False,
        )
        self._db.add(wf)
        await self._db.flush()
        logger.info("workflow_created", workflow_id=str(wf.id), app_id=str(app_id))
        return WorkflowDefRead.model_validate(wf)

    async def update_workflow(
        self, app_id: uuid.UUID, workflow_id: uuid.UUID, data: WorkflowDefUpdate
    ) -> WorkflowDefRead:
        wf = await self._fetch_workflow(app_id, workflow_id)
        if data.name is not None:
            wf.name = data.name
        if data.description is not None:
            wf.description = data.description
        if data.initial_state is not None:
            wf.initial_state = data.initial_state
        wf.version += 1
        await self._db.flush()
        return WorkflowDefRead.model_validate(wf)

    async def delete_workflow(self, app_id: uuid.UUID, workflow_id: uuid.UUID) -> None:
        wf = await self._fetch_workflow(app_id, workflow_id)
        await self._db.delete(wf)
        await self._db.flush()

    async def activate_workflow(self, app_id: uuid.UUID, workflow_id: uuid.UUID) -> WorkflowDefRead:
        wf = await self._fetch_workflow(app_id, workflow_id)
        wf.is_active = True
        await self._db.flush()
        logger.info("workflow_activated", workflow_id=str(workflow_id))
        return WorkflowDefRead.model_validate(wf)

    async def deactivate_workflow(self, app_id: uuid.UUID, workflow_id: uuid.UUID) -> WorkflowDefRead:
        wf = await self._fetch_workflow(app_id, workflow_id)
        wf.is_active = False
        await self._db.flush()
        return WorkflowDefRead.model_validate(wf)

    # ==============================================================
    # StateDef CRUD
    # ==============================================================

    async def list_states(self, workflow_id: uuid.UUID) -> list[StateDefRead]:
        result = await self._db.execute(
            select(StateDef).where(StateDef.workflow_id == workflow_id)
            .order_by(StateDef.name)
        )
        return [StateDefRead.model_validate(s) for s in result.scalars()]

    async def create_state(
        self, workflow_id: uuid.UUID, data: StateDefCreate
    ) -> StateDefRead:
        state = StateDef(
            workflow_id=workflow_id,
            name=data.name,
            display_name=data.display_name,
            is_terminal=data.is_terminal,
            sla_seconds=data.sla_seconds,
            on_enter_actions=data.on_enter_actions,
            on_exit_actions=data.on_exit_actions,
            sla_breach_actions=data.sla_breach_actions,
            color=data.color,
        )
        self._db.add(state)
        await self._db.flush()
        return StateDefRead.model_validate(state)

    async def update_state(
        self, workflow_id: uuid.UUID, state_id: uuid.UUID, data: StateDefUpdate
    ) -> StateDefRead:
        state = await self._fetch_state(workflow_id, state_id)
        if data.display_name is not None:
            state.display_name = data.display_name
        if data.is_terminal is not None:
            state.is_terminal = data.is_terminal
        if data.sla_seconds is not None:
            state.sla_seconds = data.sla_seconds
        if data.on_enter_actions is not None:
            state.on_enter_actions = data.on_enter_actions
        if data.on_exit_actions is not None:
            state.on_exit_actions = data.on_exit_actions
        if data.sla_breach_actions is not None:
            state.sla_breach_actions = data.sla_breach_actions
        if data.color is not None:
            state.color = data.color
        await self._db.flush()
        return StateDefRead.model_validate(state)

    async def delete_state(self, workflow_id: uuid.UUID, state_id: uuid.UUID) -> None:
        state = await self._fetch_state(workflow_id, state_id)
        await self._db.delete(state)
        await self._db.flush()

    # ==============================================================
    # TransitionDef CRUD
    # ==============================================================

    async def list_transitions(self, workflow_id: uuid.UUID) -> list[TransitionDefRead]:
        result = await self._db.execute(
            select(TransitionDef).where(TransitionDef.workflow_id == workflow_id)
            .order_by(TransitionDef.from_state, TransitionDef.name)
        )
        return [TransitionDefRead.model_validate(t) for t in result.scalars()]

    async def create_transition(
        self, workflow_id: uuid.UUID, data: TransitionDefCreate
    ) -> TransitionDefRead:
        tr = TransitionDef(
            workflow_id=workflow_id,
            name=data.name,
            display_name=data.display_name,
            from_state=data.from_state,
            to_state=data.to_state,
            guard_conditions=data.guard_conditions,
            actions=data.actions,
            required_roles=data.required_roles,
        )
        self._db.add(tr)
        await self._db.flush()
        return TransitionDefRead.model_validate(tr)

    async def update_transition(
        self, workflow_id: uuid.UUID, transition_id: uuid.UUID, data: TransitionDefUpdate
    ) -> TransitionDefRead:
        tr = await self._fetch_transition(workflow_id, transition_id)
        if data.display_name is not None:
            tr.display_name = data.display_name
        if data.from_state is not None:
            tr.from_state = data.from_state
        if data.to_state is not None:
            tr.to_state = data.to_state
        if data.guard_conditions is not None:
            tr.guard_conditions = data.guard_conditions
        if data.actions is not None:
            tr.actions = data.actions
        if data.required_roles is not None:
            tr.required_roles = data.required_roles
        await self._db.flush()
        return TransitionDefRead.model_validate(tr)

    async def delete_transition(
        self, workflow_id: uuid.UUID, transition_id: uuid.UUID
    ) -> None:
        tr = await self._fetch_transition(workflow_id, transition_id)
        await self._db.delete(tr)
        await self._db.flush()

    # ==============================================================
    # Instance lifecycle
    # ==============================================================

    async def start_instance(
        self,
        app_id: uuid.UUID,
        workflow_id: uuid.UUID,
        req: StartInstanceRequest,
        actor_id: uuid.UUID | None = None,
    ) -> WorkflowInstanceRead:
        wf = await self._fetch_workflow(app_id, workflow_id)
        if not wf.is_active:
            raise WorkflowTransitionError("Cannot start instance: workflow is not active")

        # Duplicate guard
        existing = await self._db.execute(
            select(WorkflowInstance).where(
                WorkflowInstance.workflow_id == workflow_id,
                WorkflowInstance.record_id == req.record_id,
            )
        )
        if existing.scalar_one_or_none():
            raise WorkflowInstanceAlreadyExistsError(
                f"Instance for record {req.record_id} already exists"
            )

        states, transitions = await self._load_fsm_data(workflow_id)
        spec = build_fsm_spec(wf, states, transitions)

        # Run on_enter_actions for initial state (pure)
        enter_result = enter_initial_state(
            spec, req.record_payload, wf.entity_id, app_id, actor_id
        )

        sla_deadline: datetime | None = None
        if enter_result.sla_seconds:
            sla_deadline = datetime.now(UTC) + timedelta(seconds=enter_result.sla_seconds)

        instance = WorkflowInstance(
            workflow_id=workflow_id,
            app_id=app_id,
            entity_id=wf.entity_id,
            record_id=req.record_id,
            current_state=wf.initial_state,
            sla_deadline=sla_deadline,
        )
        self._db.add(instance)
        await self._db.flush()

        # Write initial transition log (from_state=None signals instance start)
        log_entry = TransitionLog(
            instance_id=instance.id,
            workflow_id=workflow_id,
            from_state=None,
            to_state=wf.initial_state,
            actor_id=actor_id,
        )
        self._db.add(log_entry)
        await self._db.flush()

        if enter_result.sla_seconds:
            self._schedule_sla_check(instance, wf.initial_state)

        workflow_instances_active.inc()
        logger.info("workflow_instance_started", instance_id=str(instance.id),
                    workflow_id=str(workflow_id), record_id=str(req.record_id),
                    initial_state=wf.initial_state)
        return WorkflowInstanceRead.model_validate(instance)

    async def execute_transition(
        self,
        app_id: uuid.UUID,
        workflow_id: uuid.UUID,
        instance_id: uuid.UUID,
        req: TransitionRequest,
        actor_id: uuid.UUID | None,
        actor_roles: list[str],
    ) -> TransitionResponse:
        """
        Execute a named transition on an instance.

        Race condition protection: uses conditional UPDATE that checks
        both current_state and version. If 0 rows updated → 409.
        """
        start = time.monotonic()

        instance = await self._fetch_instance(workflow_id, instance_id)
        wf = await self._fetch_workflow(app_id, workflow_id)
        states, transitions = await self._load_fsm_data(workflow_id)
        spec = build_fsm_spec(wf, states, transitions)

        captured_state = instance.current_state
        captured_version = instance.version

        try:
            tr_result: FSMTransitionResult = execute_fsm_transition(
                spec=spec,
                current_state=captured_state,
                transition_name=req.transition_name,
                record=req.record_payload,
                entity_id=wf.entity_id,
                app_id=app_id,
                actor_id=actor_id,
                actor_roles=actor_roles,
            )
        except FSMError as exc:
            raise WorkflowTransitionError(str(exc)) from exc

        new_state = tr_result.new_state
        new_state_spec = spec.get_state(new_state)
        is_terminal = bool(new_state_spec and new_state_spec.is_terminal)

        new_sla_deadline: datetime | None = None
        if tr_result.sla_seconds:
            new_sla_deadline = datetime.now(UTC) + timedelta(seconds=tr_result.sla_seconds)

        # ---- Conditional UPDATE (optimistic lock) ----
        update_result = await self._db.execute(
            update(WorkflowInstance)
            .where(
                WorkflowInstance.id == instance_id,
                WorkflowInstance.current_state == captured_state,
                WorkflowInstance.version == captured_version,
            )
            .values(
                current_state=new_state,
                version=WorkflowInstance.version + 1,
                sla_deadline=new_sla_deadline,
                completed_at=datetime.now(UTC) if is_terminal else None,
            )
            .returning(WorkflowInstance.id)
        )
        if update_result.scalar_one_or_none() is None:
            raise WorkflowConcurrentModificationError(instance_id)

        # Find the transition_def id for the log
        transition_def_id: uuid.UUID | None = None
        for t in transitions:
            if t.from_state == captured_state and t.name == req.transition_name:
                transition_def_id = t.id
                break

        duration_ms = int((time.monotonic() - start) * 1000)
        log_entry = TransitionLog(
            instance_id=instance_id,
            workflow_id=workflow_id,
            from_state=captured_state,
            to_state=new_state,
            transition_id=transition_def_id,
            actor_id=actor_id,
            duration_ms=duration_ms,
        )
        self._db.add(log_entry)
        await self._db.flush()

        # Re-fetch updated instance for response
        refreshed = await self._db.get(WorkflowInstance, instance_id)

        if tr_result.sla_seconds and not is_terminal:
            self._schedule_sla_check(refreshed, new_state)

        workflow_transitions.labels(
            workflow_id=str(workflow_id),
            from_state=captured_state,
            to_state=new_state,
        ).inc()
        if is_terminal:
            workflow_instances_active.dec()

        logger.info("workflow_transition_executed",
                    instance_id=str(instance_id),
                    from_state=captured_state,
                    to_state=new_state,
                    duration_ms=duration_ms)

        return TransitionResponse(
            instance=WorkflowInstanceRead.model_validate(refreshed),
            field_mutations=tr_result.field_mutations,
            notifications=tr_result.notifications,
            webhooks=tr_result.webhooks,
            errors=tr_result.errors,
        )

    async def get_instance(
        self, workflow_id: uuid.UUID, instance_id: uuid.UUID
    ) -> WorkflowInstanceRead:
        instance = await self._fetch_instance(workflow_id, instance_id)
        return WorkflowInstanceRead.model_validate(instance)

    async def list_instances(
        self,
        app_id: uuid.UUID,
        workflow_id: uuid.UUID,
        record_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[WorkflowInstanceRead]:
        stmt = (
            select(WorkflowInstance)
            .where(WorkflowInstance.workflow_id == workflow_id,
                   WorkflowInstance.app_id == app_id)
            .order_by(WorkflowInstance.started_at.desc())
            .limit(limit)
        )
        if record_id:
            stmt = stmt.where(WorkflowInstance.record_id == record_id)
        result = await self._db.execute(stmt)
        return [WorkflowInstanceRead.model_validate(i) for i in result.scalars()]

    async def get_available_transitions(
        self,
        app_id: uuid.UUID,
        workflow_id: uuid.UUID,
        instance_id: uuid.UUID,
        actor_roles: list[str],
    ) -> list[AvailableTransitionRead]:
        """Return transitions the caller can execute from the current state."""
        instance = await self._fetch_instance(workflow_id, instance_id)
        wf = await self._fetch_workflow(app_id, workflow_id)
        states, transitions = await self._load_fsm_data(workflow_id)
        spec = build_fsm_spec(wf, states, transitions)

        available = []
        for tr in spec.get_transitions_from(instance.current_state):
            if tr.required_roles and not any(r in actor_roles for r in tr.required_roles):
                continue
            available.append(AvailableTransitionRead(
                name=tr.name,
                display_name=tr.display_name,
                to_state=tr.to_state,
                requires_roles=tr.required_roles,
            ))
        return available

    # ==============================================================
    # Transition log
    # ==============================================================

    async def list_transition_log(
        self,
        instance_id: uuid.UUID,
        limit: int = 100,
    ) -> list[TransitionLogRead]:
        result = await self._db.execute(
            select(TransitionLog)
            .where(TransitionLog.instance_id == instance_id)
            .order_by(TransitionLog.executed_at.asc())
            .limit(limit)
        )
        return [TransitionLogRead.model_validate(e) for e in result.scalars()]

    # ==============================================================
    # Internal helpers
    # ==============================================================

    async def _fetch_workflow(self, app_id: uuid.UUID, workflow_id: uuid.UUID) -> WorkflowDef:
        result = await self._db.execute(
            select(WorkflowDef).where(
                WorkflowDef.id == workflow_id, WorkflowDef.app_id == app_id
            )
        )
        wf = result.scalar_one_or_none()
        if wf is None:
            raise WorkflowNotFoundError(str(workflow_id))
        return wf

    async def _fetch_state(
        self, workflow_id: uuid.UUID, state_id: uuid.UUID
    ) -> StateDef:
        result = await self._db.execute(
            select(StateDef).where(
                StateDef.id == state_id, StateDef.workflow_id == workflow_id
            )
        )
        state = result.scalar_one_or_none()
        if state is None:
            raise WorkflowStateNotFoundError(str(state_id))
        return state

    async def _fetch_transition(
        self, workflow_id: uuid.UUID, transition_id: uuid.UUID
    ) -> TransitionDef:
        result = await self._db.execute(
            select(TransitionDef).where(
                TransitionDef.id == transition_id,
                TransitionDef.workflow_id == workflow_id,
            )
        )
        tr = result.scalar_one_or_none()
        if tr is None:
            raise WorkflowTransitionNotFoundError(str(transition_id))
        return tr

    async def _fetch_instance(
        self, workflow_id: uuid.UUID, instance_id: uuid.UUID
    ) -> WorkflowInstance:
        result = await self._db.execute(
            select(WorkflowInstance).where(
                WorkflowInstance.id == instance_id,
                WorkflowInstance.workflow_id == workflow_id,
            )
        )
        inst = result.scalar_one_or_none()
        if inst is None:
            raise WorkflowInstanceNotFoundError(str(instance_id))
        return inst

    async def _load_fsm_data(
        self, workflow_id: uuid.UUID
    ) -> tuple[list[StateDef], list[TransitionDef]]:
        states_res = await self._db.execute(
            select(StateDef).where(StateDef.workflow_id == workflow_id)
        )
        transitions_res = await self._db.execute(
            select(TransitionDef).where(TransitionDef.workflow_id == workflow_id)
        )
        return list(states_res.scalars()), list(transitions_res.scalars())

    @staticmethod
    def _schedule_sla_check(instance: WorkflowInstance, expected_state: str) -> None:
        from app.worker.tasks.workflow import check_sla_breach
        if instance.sla_deadline is None:
            return
        check_sla_breach.apply_async(
            kwargs={
                "instance_id": str(instance.id),
                "expected_state": expected_state,
                "workflow_id": str(instance.workflow_id),
            },
            eta=instance.sla_deadline,
            queue="default",
        )
