
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator


class QuotationReminderSettingBase(BaseModel):
    enabled: bool = True

    expiry_reminder_days: int = Field(
        default=3,
        ge=1,
        le=365,
    )

    final_expiry_reminder_days: int = Field(
        default=1,
        ge=1,
        le=365,
    )

    follow_up_after_days: int = Field(
        default=7,
        ge=1,
        le=365,
    )

    scheduler_hour: int = Field(
        default=9,
        ge=0,
        le=23,
    )

    scheduler_minute: int = Field(
        default=0,
        ge=0,
        le=59,
    )

    scheduler_timezone: str = Field(
        default="Asia/Kolkata",
        min_length=1,
        max_length=64,
    )

    @field_validator("scheduler_timezone")
    @classmethod
    def validate_scheduler_timezone(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Timezone cannot be empty.")

        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError(
                "Provide a valid IANA timezone, "
                "such as Asia/Kolkata or UTC."
            )

        return value


class QuotationReminderSettingCreate(QuotationReminderSettingBase):
    pass


class QuotationReminderSettingUpdate(QuotationReminderSettingBase):
    pass


class QuotationReminderSettingResponse(
    QuotationReminderSettingBase
):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
