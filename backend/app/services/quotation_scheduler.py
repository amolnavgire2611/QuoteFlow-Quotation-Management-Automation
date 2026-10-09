
import logging
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from app.core.reminder_config import REMINDER_CONFIG
from app.database import SessionLocal
from app.services.quotation_reminder_service import (
    run_quotation_reminders,
)


logger = logging.getLogger(__name__)

# scheduler = BackgroundScheduler(
#     timezone=ZoneInfo("Asia/Kolkata"),
# )
scheduler = BackgroundScheduler(
    timezone=ZoneInfo(REMINDER_CONFIG.scheduler_timezone)
)

def execute_quotation_reminders():
    """Run reminders with a dedicated database session."""

    db = SessionLocal()

    try:
        result = run_quotation_reminders(db)

        logger.info(
            "Quotation reminder job completed: %s",
            result,
        )

    except Exception:
        logger.exception(
            "The quotation reminder job failed."
        )

    finally:
        db.close()


def start_quotation_scheduler():
    """Start the scheduler once per application process."""

    if scheduler.running:
        return

    scheduler.add_job(
    execute_quotation_reminders,
    trigger="cron",
    hour=REMINDER_CONFIG.scheduler_hour,
    minute=REMINDER_CONFIG.scheduler_minute,
    id="daily_quotation_reminders",
    replace_existing=True,
    max_instances=1,
    coalesce=True,
    )

    scheduler.start()

    logger.info(
        "Quotation reminder scheduler started. "
        "Daily run time: 09:00 Asia/Kolkata."
    )


def stop_quotation_scheduler():
    """Stop the scheduler during application shutdown."""

    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Quotation reminder scheduler stopped.")