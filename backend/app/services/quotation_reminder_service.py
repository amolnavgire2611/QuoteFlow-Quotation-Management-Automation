
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


logger = logging.getLogger(__name__)

REMINDER_EXPIRY_3_DAYS = "EXPIRY_3_DAYS"
REMINDER_EXPIRY_1_DAY = "EXPIRY_1_DAY"
REMINDER_FOLLOW_UP = "FOLLOW_UP_7_DAYS"


def _get_reminder_type(
    quotation: Quotation,
    today: date,
    original_sent_at: datetime | None,
) -> str | None:
    """Determine whether a quotation reminder is due."""

    if quotation.status != "SENT":
        return None

    if quotation.valid_until:
        days_remaining = (
            quotation.valid_until - today
        ).days

        if days_remaining == REMINDER_CONFIG.expiry_reminder_days:
            return REMINDER_EXPIRY_3_DAYS

        if days_remaining == REMINDER_CONFIG.final_expiry_reminder_days:
            return REMINDER_EXPIRY_1_DAY

    if original_sent_at:
        elapsed = datetime.utcnow() - original_sent_at

        if elapsed >= timedelta(
            days=REMINDER_CONFIG.follow_up_after_days
            ):
            return REMINDER_FOLLOW_UP

    return None


def _build_reminder_email(
    quotation: Quotation,
    customer: Customer,
    reminder_type: str,
) -> tuple[str, str]:
    """Build the reminder email subject and body."""

    customer_name = (
        getattr(customer, "contact_person", None)
        or getattr(customer, "company_name", None)
        or "Customer"
    )

    if reminder_type == REMINDER_EXPIRY_3_DAYS:
        subject = (
            f"Automatic reminder: "
            f"Quotation {quotation.quotation_number} "
            f"expires in 3 days"
        )
        message = (
            f"Dear {customer_name},\n\n"
            f"This is a reminder that quotation "
            f"{quotation.quotation_number} "
            f"will expire on {quotation.valid_until:%d-%m-%Y}.\n\n"
            f"Quotation value: ₹{quotation.grand_total:,.2f}\n\n"
            f"Please review the quotation and contact us "
            f"if you have any questions.\n\n"
            f"Regards,\n{settings.SMTP_FROM_NAME}"
        )

    elif reminder_type == REMINDER_EXPIRY_1_DAY:
        subject = (
            f"Automatic reminder: "
            f"Quotation {quotation.quotation_number} "
            f"expires tomorrow"
        )
        message = (
            f"Dear {customer_name},\n\n"
            f"Quotation {quotation.quotation_number} "
            f"is due to expire on "
            f"{quotation.valid_until:%d-%m-%Y}.\n\n"
            f"Quotation value: ₹{quotation.grand_total:,.2f}\n\n"
            f"Please let us know if you would like to proceed "
            f"or need any clarification.\n\n"
            f"Regards,\n{settings.SMTP_FROM_NAME}"
        )

    else:
        subject = (
            f"Automatic reminder: "
            f"Follow-up for quotation "
            f"{quotation.quotation_number}"
        )
        message = (
            f"Dear {customer_name},\n\n"
            f"We are following up on quotation "
            f"{quotation.quotation_number}, "
            f"with a total value of "
            f"₹{quotation.grand_total:,.2f}.\n\n"
            f"Could you please share an update on its status? "
            f"Please contact us if you need further information.\n\n"
            f"Regards,\n{settings.SMTP_FROM_NAME}"
        )

    return subject, message


def _already_reminded(
    db: Session,
    quotation_id: int,
    subject: str,
) -> bool:
    """Prevent repeating a reminder already queued or sent."""

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
) -> bool:
    """Generate the quotation PDF, send the reminder, and log it."""

    recipient_email = getattr(customer, "email", None)

    if not recipient_email:
        logger.warning(
            "Skipping reminder for quotation %s: "
            "customer has no email address.",
            quotation.quotation_number,
        )
        return False

    subject, message = _build_reminder_email(
        quotation,
        customer,
        reminder_type,
    )

    if _already_reminded(db, quotation.id, subject):
        logger.info(
            "Reminder already queued or sent for quotation %s.",
            quotation.quotation_number,
        )
        return False

    # Use the existing PDF service's file-path interface.
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

    email_record = QuotationEmail(
        quotation_id=quotation.id,
        recipient_email=str(recipient_email),
        subject=subject,
        status="PENDING",
    )

    try:
        db.add(email_record)
        db.commit()
        db.refresh(email_record)
        email_record_id = email_record.id
    except Exception:
        db.rollback()
        logger.exception(
            "Could not create reminder history for quotation %s.",
            quotation.quotation_number,
        )
        return False

    try:
        # Match the attachment interface used by the existing
        # quotation-email workflow.
        asyncio.run(
            send_email(
                recipient_email=str(recipient_email),
                subject=subject,
                body=message,
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
            "Sent %s reminder for quotation %s.",
            reminder_type,
            quotation.quotation_number,
        )
        return True

    except Exception as exc:
        db.rollback()

        # Reload the committed history record after rollback.
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
                    "Could not update failed reminder history "
                    "for quotation %s.",
                    quotation.quotation_number,
                )

        logger.exception(
            "Failed to send %s reminder for quotation %s.",
            reminder_type,
            quotation.quotation_number,
        )
        return False


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
        ):
            sent += 1
        else:
            skipped_or_failed += 1

    return {
        "processed": processed,
        "sent": sent,
        "skipped_or_failed": skipped_or_failed,
    }