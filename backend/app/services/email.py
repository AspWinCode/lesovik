"""Async email service using aiosmtplib."""
import structlog
from aiosmtplib import SMTP, SMTPException

from app.core.config import settings

logger = structlog.get_logger(__name__)


async def send_email(
    to: str,
    subject: str,
    body_html: str,
    body_text: str | None = None,
) -> None:
    """Send a single email. Logs and swallows on error so callers don't break."""
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to

    if body_text:
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        async with SMTP(
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=settings.SMTP_TLS,
        ) as smtp:
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            await smtp.send_message(msg)
        logger.info("email_sent", to=to, subject=subject)
    except (SMTPException, OSError):
        logger.exception("email_send_failed", to=to, subject=subject)


async def send_password_reset_email(
    to: str,
    display_name: str,
    reset_url: str,
) -> None:
    subject = "Сброс пароля"
    html = f"""
<p>Здравствуйте, {display_name}!</p>
<p>Мы получили запрос на сброс пароля для вашего аккаунта.</p>
<p><a href="{reset_url}">Сбросить пароль</a></p>
<p>Ссылка действительна 1 час. Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
"""
    text = (
        f"Здравствуйте, {display_name}!\n\n"
        "Мы получили запрос на сброс пароля.\n"
        f"Перейдите по ссылке: {reset_url}\n"
        "Ссылка действительна 1 час.\n"
        "Если вы не запрашивали сброс — проигнорируйте это письмо."
    )
    await send_email(to, subject, html, text)


async def send_invitation_email(
    to: str,
    display_name: str,
    temp_password: str,
    platform_url: str = "http://localhost:5173/editor",
) -> None:
    subject = "Приглашение на платформу"
    html = f"""
<p>Здравствуйте, {display_name}!</p>
<p>Вас пригласили на платформу бизнес-приложений.</p>
<p><b>Email:</b> {to}<br>
<b>Временный пароль:</b> {temp_password}</p>
<p>Войдите по ссылке: <a href="{platform_url}">{platform_url}</a></p>
<p>Смените пароль после первого входа.</p>
"""
    text = (
        f"Здравствуйте, {display_name}!\n\n"
        f"Вас пригласили на платформу бизнес-приложений.\n"
        f"Email: {to}\nВременный пароль: {temp_password}\n"
        f"Войдите: {platform_url}\n"
        "Смените пароль после первого входа."
    )
    await send_email(to, subject, html, text)
