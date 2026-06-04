from celery import Celery
from kombu import Exchange, Queue

from app.core.config import settings

celery_app = Celery(
    "nocode",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.worker.tasks.notifications",
        "app.worker.tasks.exports",
        "app.worker.tasks.sandbox",
        "app.worker.tasks.workflow",
        "app.worker.tasks.integration",
    ],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Task routing
    task_queues=[
        Queue("default",       Exchange("default"),       routing_key="default"),
        Queue("notifications", Exchange("notifications"), routing_key="notifications"),
        Queue("exports",       Exchange("exports"),       routing_key="exports"),
        Queue("sandbox",       Exchange("sandbox"),       routing_key="sandbox"),
        Queue("integration",   Exchange("integration"),   routing_key="integration"),
    ],
    task_default_queue="default",
    task_routes={
        "app.worker.tasks.notifications.*": {"queue": "notifications"},
        "app.worker.tasks.exports.*":       {"queue": "exports"},
        "app.worker.tasks.sandbox.*":       {"queue": "sandbox"},
        "app.worker.tasks.integration.*":   {"queue": "integration"},
    },
    # Reliability
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # Result expiry
    result_expires=3600,
    # Sandbox tasks — hard time limit 113s (per architecture spec)
    task_time_limit=120,
    task_soft_time_limit=113,
    # Beat schedule — outbox poller runs every 10 seconds
    beat_schedule={
        "poll-outbox": {
            "task": "app.worker.tasks.integration.poll_outbox",
            "schedule": 10.0,  # seconds
            "options": {"queue": "integration"},
        },
    },
)
