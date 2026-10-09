from email.message import EmailMessage
from io import BytesIO

import aiosmtplib

from app.core.config import settings


async def send_email(
    recipient_email: str,
    subject: str,
    body: str,
    attachment_data: BytesIO | bytes | None = None,
    attachment_filename: str | None = None,
):
    # ============================================================
    # SMTP CONFIGURATION VALIDATION
    # ============================================================

    if not settings.SMTP_USERNAME:
        raise RuntimeError(
            "SMTP username is not configured."
        )

    if not settings.SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP password is not configured."
        )

    # ============================================================
    # FROM EMAIL
    # ============================================================

    from_email = (
        settings.SMTP_FROM_EMAIL
        or settings.SMTP_USERNAME
    )

    # ============================================================
    # CREATE EMAIL
    # ============================================================

    message = EmailMessage()

    message["From"] = (
        f"{settings.SMTP_FROM_NAME} "
        f"<{from_email}>"
    )

    message["To"] = recipient_email
    message["Subject"] = subject

    message.set_content(body)

    # ============================================================
    # PDF ATTACHMENT
    # ============================================================

    if attachment_data is not None:

        if isinstance(attachment_data, BytesIO):
            pdf_data = attachment_data.getvalue()

        elif isinstance(attachment_data, bytes):
            pdf_data = attachment_data

        else:
            raise TypeError(
                "attachment_data must be BytesIO or bytes."
            )

        message.add_attachment(
            pdf_data,
            maintype="application",
            subtype="pdf",
            filename=(
                attachment_filename
                or "quotation.pdf"
            ),
        )

    # ============================================================
    # SEND EMAIL
    # ============================================================

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USERNAME,
        password=settings.SMTP_PASSWORD,
        start_tls=settings.SMTP_USE_TLS,
    )