from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ============================================================
# QUOTATION ITEM CREATE
# ============================================================

class QuotationItemCreate(BaseModel):
    product_id: int = Field(
        ...,
        gt=0,
    )

    quantity: Decimal = Field(
        ...,
        gt=0,
    )

    discount_percent: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        le=100,
    )


# ============================================================
# QUOTATION CREATE
# ============================================================

class QuotationCreate(BaseModel):
    customer_id: int = Field(
        ...,
        gt=0,
    )

    quotation_date: date

    valid_until: date

    items: list[QuotationItemCreate] = Field(
        ...,
        min_length=1,
    )

    notes: str | None = None

    terms_conditions: str | None = None


# ============================================================
# QUOTATION ITEM RESPONSE
# ============================================================

class QuotationItemResponse(BaseModel):
    id: int

    product_id: int

    product_code: str

    product_name: str

    description: str | None

    hsn_sac: str | None

    unit: str

    quantity: Decimal

    unit_price: Decimal

    discount_percent: Decimal

    discount_amount: Decimal

    taxable_amount: Decimal

    gst_rate: Decimal

    gst_amount: Decimal

    total_amount: Decimal

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# FULL QUOTATION RESPONSE
# ============================================================

class QuotationResponse(BaseModel):
    id: int

    quotation_number: str

    customer_id: int

    quotation_date: date

    valid_until: date

    status: str

    notes: str | None

    terms_conditions: str | None

    subtotal: Decimal

    discount_amount: Decimal

    taxable_amount: Decimal

    cgst_amount: Decimal

    sgst_amount: Decimal

    igst_amount: Decimal

    grand_total: Decimal

    items: list[QuotationItemResponse]

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# QUOTATION LIST RESPONSE
# ============================================================

class QuotationListResponse(BaseModel):
    id: int

    quotation_number: str

    customer_id: int

    customer_name: str

    quotation_date: date

    valid_until: date

    status: str

    subtotal: Decimal

    discount_amount: Decimal

    taxable_amount: Decimal

    cgst_amount: Decimal

    sgst_amount: Decimal

    igst_amount: Decimal

    grand_total: Decimal

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# QUOTATION STATUS UPDATE
# ============================================================

class QuotationStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        pattern=(
            "^(DRAFT|SENT|ACCEPTED|"
            "REJECTED|EXPIRED|CONVERTED)$"
        ),
    )
    
class QuotationEmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str | None = None
    message: str | None = None
class QuotationEmailRequest(BaseModel):
    recipient_email: str
    subject: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )
    message: str = Field(
        ...,
        min_length=1,
    )