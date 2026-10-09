from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerBase(BaseModel):
    company_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
    )

    contact_person: str | None = Field(
        default=None,
        max_length=150,
    )

    email: EmailStr | None = None

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    address: str | None = None

    billing_address: str | None = None

    shipping_address: str | None = None

    gstin: str | None = Field(
        default=None,
        max_length=20,
    )

    pan: str | None = Field(
        default=None,
        max_length=20,
    )

    state: str | None = Field(
        default=None,
        max_length=100,
    )

    country: str = Field(
        default="India",
        max_length=100,
    )


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    company_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=200,
    )

    contact_person: str | None = None

    email: EmailStr | None = None

    phone: str | None = None

    address: str | None = None

    billing_address: str | None = None

    shipping_address: str | None = None

    gstin: str | None = None

    pan: str | None = None

    state: str | None = None

    country: str | None = None


class CustomerResponse(CustomerBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )