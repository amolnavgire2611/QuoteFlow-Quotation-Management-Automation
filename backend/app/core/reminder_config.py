
from dataclasses import dataclass


@dataclass(frozen=True)
class QuotationReminderConfig:
    """Configuration for automated quotation reminders."""

    expiry_reminder_days: int = 3
    final_expiry_reminder_days: int = 1
    follow_up_after_days: int = 7

    scheduler_hour: int = 9
    scheduler_minute: int = 0
    scheduler_timezone: str = "Asia/Kolkata"


REMINDER_CONFIG = QuotationReminderConfig()