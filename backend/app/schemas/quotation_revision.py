from decimal import Decimal

from pydantic import BaseModel, Field


class RevisionItemUpdate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: Decimal = Field(..., gt=0)
    discount_percent: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        le=100,
    )


class QuotationRevisionUpdate(BaseModel):
    items: list[RevisionItemUpdate] = Field(
        ...,
        min_length=1,
    )

    notes: str | None = None

    terms_conditions: str | None = None

class RevisionStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)