
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Integer,
    String,
)

from app.database import Base


class QuotationReminderSetting(Base):
    __tablename__ = "quotation_reminder_settings"

    __table_args__ = (
        CheckConstraint(
            "expiry_reminder_days >= 1",
            name="ck_reminder_expiry_days_positive",
        ),
        CheckConstraint(
            "final_expiry_reminder_days >= 1",
            name="ck_reminder_final_expiry_days_positive",
        ),
        CheckConstraint(
            "follow_up_after_days >= 1",
            name="ck_reminder_follow_up_days_positive",
        ),
        CheckConstraint(
            "scheduler_hour >= 0 AND scheduler_hour <= 23",
            name="ck_reminder_scheduler_hour",
        ),
        CheckConstraint(
            "scheduler_minute >= 0 AND scheduler_minute <= 59",
            name="ck_reminder_scheduler_minute",
        ),
    )

    # A single configuration record will use id=1.
    id = Column(Integer, primary_key=True, default=1)

    enabled = Column(Boolean, nullable=False, default=True)

    expiry_reminder_days = Column(
        Integer,
        nullable=False,
        default=3,
    )

    final_expiry_reminder_days = Column(
        Integer,
        nullable=False,
        default=1,
    )

    follow_up_after_days = Column(
        Integer,
        nullable=False,
        default=7,
    )

    scheduler_hour = Column(
        Integer,
        nullable=False,
        default=9,
    )

    scheduler_minute = Column(
        Integer,
        nullable=False,
        default=0,
    )

    scheduler_timezone = Column(
        String(64),
        nullable=False,
        default="Asia/Kolkata",
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )