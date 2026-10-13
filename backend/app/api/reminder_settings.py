import logging

from app.services.quotation_scheduler import (
    reschedule_quotation_reminders,
)

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.quotation_reminder_setting import (
    QuotationReminderSetting,
)
from app.schemas.quotation_reminder_setting import (
    QuotationReminderSettingResponse,
    QuotationReminderSettingUpdate,
)

router = APIRouter(
    prefix="/reminder-settings",
    tags=["Quotation Reminder Settings"],
)


def get_or_create_settings(
    db: Session,
) -> QuotationReminderSetting:
    """Return the single reminder configuration record."""

    settings_record = (
        db.query(QuotationReminderSetting)
        .filter(QuotationReminderSetting.id == 1)
        .first()
    )

    if settings_record is not None:
        return settings_record

    settings_record = QuotationReminderSetting(
        id=1,
        enabled=True,
        expiry_reminder_days=3,
        final_expiry_reminder_days=1,
        follow_up_after_days=7,
        scheduler_hour=9,
        scheduler_minute=0,
        scheduler_timezone="Asia/Kolkata",
    )

    db.add(settings_record)

    try:
        db.commit()
        db.refresh(settings_record)
    except Exception:
        db.rollback()

        # Handle the case where another request created the
        # singleton record at the same time.
        settings_record = (
            db.query(QuotationReminderSetting)
            .filter(QuotationReminderSetting.id == 1)
            .first()
        )

        if settings_record is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to initialize reminder settings.",
            )

    return settings_record

@router.get(
    "",
    response_model=QuotationReminderSettingResponse,
)
def read_reminder_settings(
    db: Session = Depends(get_db),
):
    """Get the current reminder configuration."""

    return get_or_create_settings(db)


@router.put(
    "",
    response_model=QuotationReminderSettingResponse,
)
def update_reminder_settings(
    settings_data: QuotationReminderSettingUpdate,
    db: Session = Depends(get_db),
):
    """Update the current reminder configuration."""

    if (
        settings_data.final_expiry_reminder_days
        >= settings_data.expiry_reminder_days
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The final expiry reminder must occur closer "
                "to expiry than the first expiry reminder. "
                "For example, use 3 days and 1 day."
            ),
        )

    settings_record = get_or_create_settings(db)

    settings_record.enabled = settings_data.enabled
    settings_record.expiry_reminder_days = (
        settings_data.expiry_reminder_days
    )
    settings_record.final_expiry_reminder_days = (
        settings_data.final_expiry_reminder_days
    )
    settings_record.follow_up_after_days = (
        settings_data.follow_up_after_days
    )
    settings_record.scheduler_hour = (
        settings_data.scheduler_hour
    )
    settings_record.scheduler_minute = (
        settings_data.scheduler_minute
    )
    settings_record.scheduler_timezone = (
        settings_data.scheduler_timezone
    )

    try:
        db.commit()
        db.refresh(settings_record)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save reminder settings.",
            )

# Apply the updated schedule without restarting FastAPI.
    try:
        reschedule_quotation_reminders(
            hour=settings_record.scheduler_hour,
            minute=settings_record.scheduler_minute,
            timezone=settings_record.scheduler_timezone,
            )
    except Exception:
        # Settings are already saved. Do not report a failed save
    # merely because the in-process scheduler could not update.
        logger.exception(
        "Settings were saved, but scheduler rescheduling failed."
        )
    return settings_record

