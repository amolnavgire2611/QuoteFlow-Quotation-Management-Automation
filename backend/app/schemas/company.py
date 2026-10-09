
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CompanySettingsBase(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )

    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    website: str | None = Field(default=None, max_length=255)
    address: str | None = None
    state: str | None = Field(default=None, max_length=100)
    gstin: str | None = Field(default=None, max_length=20)
    pan: str | None = Field(default=None, max_length=20)
    logo_path: str | None = Field(default=None, max_length=500)


class CompanySettingsUpdate(CompanySettingsBase):
    pass


class CompanySettingsResponse(CompanySettingsBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

