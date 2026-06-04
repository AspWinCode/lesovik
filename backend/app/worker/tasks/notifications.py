import structlog
from celery import shared_task

logger = structlog.get_logger(__name__)


@shared_task(
    name="app.worker.tasks.notifications.send_email",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def send_email(
    self: object,
    to: str,
    subject: str,
    body_html: str,
    body_text: str = "",
) -> dict[str, str]:
    """Send a transactional email via SMTP."""
    import asyncio
    import aiosmtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from app.core.config import settings

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    if body_text:
        msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    async def _send() -> None:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            use_tls=settings.SMTP_TLS,
        )

    asyncio.run(_send())
    logger.info("email_sent", to=to, subject=subject)
    return {"status": "sent", "to": to}


@shared_task(name="app.worker.tasks.notifications.send_workflow_notification")
def send_workflow_notification(
    user_id: str,
    event: str,
    payload: dict[str, object],
) -> None:
    """Placeholder: push workflow event notification to user (SSE/WebSocket/email)."""
    logger.info("workflow_notification", user_id=user_id, event=event)
