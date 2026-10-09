from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    product_code: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    name: str = Field(
        ...,
        min_length=2,
        max_length=200,
    )

    description: str | None = None

    hsn_sac: str | None = Field(
        default=None,
        max_length=50,
    )

    unit: str = Field(
        default="PCS",
        min_length=1,
        max_length=30,
    )

    price: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    gst_rate: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        le=100,
    )


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    product_code: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=200,
    )

    description: str | None = None

    hsn_sac: str | None = None

    unit: str | None = None

    price: Decimal | None = Field(
        default=None,
        ge=0,
    )

    gst_rate: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
    )


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)