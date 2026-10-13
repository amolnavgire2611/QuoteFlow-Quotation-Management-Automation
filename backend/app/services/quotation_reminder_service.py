
import asyncio
import logging
from datetime import date, datetime, timedelta
from app.core.reminder_config import REMINDER_CONFIG
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo
from app.models.company import Company
from app.models.customer import Customer
from app.models.quotation import Quotation
from app.models.quotation_email import QuotationEmail
from app.services.email_service import send_email
from app.services.quotation_pdf import generate_quotation_pdf
from app.core.config import settings
from app.models.quotation_reminder_setting import (
    QuotationReminderSetting,
)

logger = logging.getLogger(__name__)

REMINDER_EXPIRY_3_DAYS = "EXPIRY_3_DAYS"
REMINDER_EXPIRY_1_DAY = "EXPIRY_1_DAY"
REMINDER_FOLLOW_UP = "FOLLOW_UP_7_DAYS"


def _build_reminder_key(
    quotation,
    reminder_type: str,
    original_sent_at=None,
) -> str:
    """
    Build a stable key for one reminder event.

    The same quotation, reminder type, and event anchor
    must always produce the same key.
    """
    quotation_id = quotation.id

    if reminder_type == REMINDER_EXPIRY_3_DAYS:
        event_anchor = str(quotation.valid_until)

    elif reminder_type == REMINDER_EXPIRY_1_DAY:
        event_anchor = str(quotation.valid_until)

    elif reminder_type == REMINDER_FOLLOW_UP:
        if original_sent_at is None:
            raise ValueError(
                "original_sent_at is required for follow-up reminders."
            )

        event_anchor = original_sent_at.isoformat()

    else:
        raise ValueError(
            f"Unsupported reminder type: {reminder_type}"
        )

    return (
        f"{reminder_type}:"
        f"{quotation_id}:"
        f"{event_anchor}"
    )




def _get_reminder_type(
    quotation: Quotation,
    today: date,
    original_sent_at: datetime | None,
    settings_record: QuotationReminderSetting | None = None,
) -> str | None:
    """Determine whether a configured reminder is due."""

    if quotation.status != "SENT":
        return None

    expiry_days = (
        settings_record.expiry_reminder_days
        if settings_record
        else REMINDER_CONFIG.expiry_reminder_days
    )

    final_expiry_days = (
        settings_record.final_expiry_reminder_days
        if settings_record
        else REMINDER_CONFIG.final_expiry_reminder_days
    )

    follow_up_days = (
        settings_record.follow_up_after_days
        if settings_record
        else REMINDER_CONFIG.follow_up_after_days
    )

    if quotation.valid_until:
        days_remaining = (
            quotation.valid_until - today
        ).days

        # Check the closest expiry date first.
        if days_remaining == final_expiry_days:
            return REMINDER_EXPIRY_1_DAY

        if days_remaining == expiry_days:
            return REMINDER_EXPIRY_3_DAYS

    if original_sent_at:
        elapsed = datetime.utcnow() - original_sent_at

        if elapsed >= timedelta(days=follow_up_days):
            return REMINDER_FOLLOW_UP

    return None




def _build_reminder_email(
    quotation,
    customer,
    reminder_type: str,
    settings_record=None,
) -> tuple[str, str]:
    expiry_days = (
        settings_record.expiry_reminder_days
        if settings_record
        else REMINDER_CONFIG.expiry_reminder_days
    )
    final_expiry_days = (
        settings_record.final_expiry_reminder_days
        if settings_record
        else REMINDER_CONFIG.final_expiry_reminder_days
    )
    follow_up_days = (
        settings_record.follow_up_after_days
        if settings_record
        else REMINDER_CONFIG.follow_up_after_days
    )

    customer_name = (
        getattr(customer, "contact_person", None)
        or getattr(customer, "company_name", None)
        or "Customer"
    )

    quotation_number = quotation.quotation_number
    grand_total = f"{quotation.grand_total:.2f}"

    if reminder_type == REMINDER_EXPIRY_3_DAYS:
        subject = (
            f"Automatic reminder: Quotation {quotation_number} "
            f"expires in {expiry_days} days"
        )
        message = (
            f"Your quotation {quotation_number} is approaching its expiry date. "
            f"It expires in {expiry_days} days. "
        )

    elif reminder_type == REMINDER_EXPIRY_1_DAY:
        subject = (
            f"Automatic reminder: Quotation {quotation_number} "
            f"expires in {final_expiry_days} day(s)"
        )
        message = (
            f"Your quotation {quotation_number} is approaching its expiry date. "
            f"It expires in {final_expiry_days} day(s). "
        )

    elif reminder_type == REMINDER_FOLLOW_UP:
        subject = (
            f"Automatic reminder: Follow-up for quotation {quotation_number}"
        )
        message = (
            f"We are following up on quotation {quotation_number}, "
            f"sent approximately {follow_up_days} days ago. "
        )

    else:
        raise ValueError(f"Unsupported reminder type: {reminder_type}")

    body = (
        f"Dear {customer_name},\n\n"
        f"{message}\n"
        f"Quotation total: {grand_total}\n"
        f"Valid until: {quotation.valid_until or 'Not specified'}\n\n"
        "Please review the quotation and contact us if you have any questions.\n\n"
        "Regards,\n"
        f"{settings.SMTP_FROM_NAME}"
    )

    return subject, body



def _already_reminded(
    db: Session,
    quotation_id: int,
    subject: str,
) -> bool:
    """Check whether the same reminder subject is pending or sent."""

    existing = (
        db.query(QuotationEmail)
        .filter(
            QuotationEmail.quotation_id == quotation_id,
            QuotationEmail.subject == subject,
            QuotationEmail.status.in_(["PENDING", "SENT"]),
        )
        .first()
    )

    return existing is not None




def _send_reminder(
    db: Session,
    quotation: Quotation,
    customer: Customer,
    company: Company,
    reminder_type: str,
    settings_record: QuotationReminderSetting | None = None,
    original_sent_at: datetime | None = None,
) -> bool:
    """
    Send an automated quotation reminder.

    A unique reminder key prevents duplicate sends for the same
    quotation event. Failed records are reused for retries.
    """

    recipient_email = getattr(customer, "email", None)

    if not recipient_email:
        logger.warning(
            "Skipping reminder for quotation %s: "
            "customer has no email address.",
            quotation.quotation_number,
        )
        return False

    # Generate a stable key for this reminder event.
    try:
        reminder_key = _build_reminder_key(
            quotation=quotation,
            reminder_type=reminder_type,
            original_sent_at=original_sent_at,
        )
    except Exception:
        logger.exception(
            "Could not generate reminder key for quotation %s.",
            quotation.quotation_number,
        )
        return False

    # Check whether this reminder event already has a history record.
    existing_record = _get_tracked_reminder(
        db=db,
        reminder_key=reminder_key,
    )

    if existing_record and existing_record.status in ("PENDING", "SENT"):
        logger.info(
            "Skipping duplicate reminder for quotation %s. "
            "Reminder key: %s",
            quotation.quotation_number,
            reminder_key,
        )
        return False

    # Generate the dynamic subject and body using saved settings.
    try:
        subject, body = _build_reminder_email(
            quotation=quotation,
            customer=customer,
            reminder_type=reminder_type,
            settings_record=settings_record,
        )
    except Exception:
        logger.exception(
            "Could not build reminder email for quotation %s.",
            quotation.quotation_number,
        )
        return False

    # Generate the PDF using the existing PDF service.
    try:
        pdf_path = generate_quotation_pdf(
            quotation=quotation,
            customer=customer,
            company=company,
        )
    except Exception:
        logger.exception(
            "PDF generation failed for quotation %s.",
            quotation.quotation_number,
        )
        return False

    # Reuse a failed tracking record instead of inserting a duplicate.
    try:
        if existing_record:
            email_record = existing_record
            email_record.recipient_email = str(recipient_email)
            email_record.subject = subject
            email_record.reminder_type = reminder_type
            email_record.status = "PENDING"
            email_record.error_message = None
        else:
            email_record = QuotationEmail(
                quotation_id=quotation.id,
                recipient_email=str(recipient_email),
                subject=subject,
                status="PENDING",
                reminder_type=reminder_type,
                reminder_key=reminder_key,
            )
            db.add(email_record)

        db.commit()
        db.refresh(email_record)

        email_record_id = email_record.id

    except Exception:
        db.rollback()
        logger.exception(
            "Could not create or update reminder history for quotation %s.",
            quotation.quotation_number,
        )
        return False

    # Send the email with the generated quotation PDF attached.
    try:
        asyncio.run(
            send_email(
                recipient_email=str(recipient_email),
                subject=subject,
                body=body,
                attachment_path=str(pdf_path),
                attachment_filename=(
                    f"{quotation.quotation_number}.pdf"
                ),
            )
        )

        email_record.status = "SENT"
        email_record.sent_at = datetime.utcnow()
        email_record.error_message = None

        db.commit()

        logger.info(
            "Sent %s reminder for quotation %s. Tracking key: %s",
            reminder_type,
            quotation.quotation_number,
            reminder_key,
        )

        return True

    except Exception as exc:
        db.rollback()

        # Reload the committed tracking record after rollback.
        failed_record = (
            db.query(QuotationEmail)
            .filter(QuotationEmail.id == email_record_id)
            .first()
        )

        if failed_record:
            failed_record.status = "FAILED"
            failed_record.error_message = str(exc)[:2000]

            try:
                db.commit()
            except Exception:
                db.rollback()
                logger.exception(
                    "Could not save failed reminder history for "
                    "quotation %s.",
                    quotation.quotation_number,
                )

        logger.exception(
            "Failed to send %s reminder for quotation %s.",
            reminder_type,
            quotation.quotation_number,
        )

        return False



def _get_tracked_reminder(
    db: Session,
    reminder_key: str,
):
    """Find an existing reminder record using its unique key."""

    return (
        db.query(QuotationEmail)
        .filter(
            QuotationEmail.reminder_key == reminder_key
        )
        .first()
    )


def run_quotation_reminders(
    db: Session,
    today: date | None = None,
) -> dict:
    """
    Process reminders for SENT quotations.

    This function receives an existing SQLAlchemy session.
    Scheduler integration will be added separately.
    """

    # today = today or date.today()
    today = today or datetime.now(
    ZoneInfo("Asia/Kolkata")).date()

    settings_record = (
    db.query(QuotationReminderSetting)
    .filter(QuotationReminderSetting.id == 1)
    .first()
    )
    if settings_record and not settings_record.enabled:
        logger.info("Automated quotation reminders are disabled.")
        return {
        "enabled": False,
        "processed": 0,
        "sent": 0,
        "skipped_or_failed": 0,
        }

    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if not company:
        logger.warning(
            "Quotation reminders skipped: company settings "
            "have not been configured."
        )
        return {
            "processed": 0,
            "sent": 0,
            "skipped_or_failed": 0,
        }

    quotations = (
        db.query(Quotation)
        .filter(Quotation.status == "SENT")
        .all()
    )

    processed = 0
    sent = 0
    skipped_or_failed = 0

    for quotation in quotations:
        customer = (
            db.query(Customer)
            .filter(Customer.id == quotation.customer_id)
            .first()
        )

        if not customer:
            skipped_or_failed += 1
            continue

        # Use the latest successfully sent non-reminder email
        # to determine when the original quotation was sent.
        original_email = (
            db.query(QuotationEmail)
            .filter(
                QuotationEmail.quotation_id == quotation.id,
                QuotationEmail.status == "SENT",
                ~QuotationEmail.subject.like(
                    "Automatic reminder:%"
                ),
            )
            .order_by(QuotationEmail.sent_at.desc())
            .first()
        )

        original_sent_at = (
            original_email.sent_at
            if original_email
            else None
        )

        reminder_type = _get_reminder_type(
            quotation,
            today,
            original_sent_at,
            settings_record,
        )

        if not reminder_type:
            continue

        processed += 1

        if _send_reminder(
            db=db,
            quotation=quotation,
            customer=customer,
            company=company,
            reminder_type=reminder_type,
            settings_record=settings_record,
            original_sent_at=original_sent_at,
        ):
            sent += 1
        else:
            skipped_or_failed += 1

    return {
        "enabled": True,
        "processed": processed,
        "sent": sent,
        "skipped_or_failed": skipped_or_failed,
    }