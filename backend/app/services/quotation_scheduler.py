
import logging
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal
from app.models.quotation_reminder_setting import (
    QuotationReminderSetting,
)
from app.services.quotation_reminder_service import (
    run_quotation_reminders,
)
from app.core.reminder_config import REMINDER_CONFIG

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(
    timezone=ZoneInfo("Asia/Kolkata")
)

JOB_ID = "daily_quotation_reminders"


def _load_schedule_settings():
    """Load saved scheduler settings, falling back to defaults."""

    db = SessionLocal()

    try:
        record = (
            db.query(QuotationReminderSetting)
            .filter(QuotationReminderSetting.id == 1)
            .first()
        )

        if record:
            return {
                "hour": record.scheduler_hour,
                "minute": record.scheduler_minute,
                "timezone": record.scheduler_timezone,
            }

        return {
            "hour": REMINDER_CONFIG.scheduler_hour,
            "minute": REMINDER_CONFIG.scheduler_minute,
            "timezone": REMINDER_CONFIG.scheduler_timezone,
        }
    finally:
        db.close()


def execute_quotation_reminders():
    """Run the reminder service using a fresh database session."""

    db = SessionLocal()

    try:
        result = run_quotation_reminders(db)
        logger.info("Quotation reminder job completed: %s", result)
    except Exception:
        logger.exception("The quotation reminder job failed.")
    finally:
        db.close()


def _apply_schedule(hour: int, minute: int, timezone: str):
    """Create or replace the daily reminder job."""

    scheduler.add_job(
        execute_quotation_reminders,
        trigger="cron",
        hour=hour,
        minute=minute,
        timezone=ZoneInfo(timezone),
        id=JOB_ID,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )


def start_quotation_scheduler():
    """Start the scheduler using the persisted configuration."""

    if scheduler.running:
        return

    schedule = _load_schedule_settings()

    _apply_schedule(
        hour=schedule["hour"],
        minute=schedule["minute"],
        timezone=schedule["timezone"],
    )

    scheduler.start()

    logger.info(
        "Quotation reminder scheduler started: "
        "%02d:%02d (%s).",
        schedule["hour"],
        schedule["minute"],
        schedule["timezone"],
    )


def reschedule_quotation_reminders(
    hour: int,
    minute: int,
    timezone: str,
):
    """Apply a newly saved schedule without restarting the API."""

    if not scheduler.running:
        logger.info(
            "Scheduler is not running; saved schedule will "
            "be applied when the scheduler starts."
        )
        return

    _apply_schedule(
        hour=hour,
        minute=minute,
        timezone=timezone,
    )

    logger.info(
        "Quotation reminder schedule updated: %02d:%02d (%s).",
        hour,
        minute,
        timezone,
    )


def stop_quotation_scheduler():
    """Stop the background scheduler gracefully."""

    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Quotation reminder scheduler stopped.")
