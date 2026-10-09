from datetime import datetime
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import Date
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column,relationship

from app.database import Base


class QuotationRevision(Base):
    __tablename__ = "quotation_revisions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    revision_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )


    quotation_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # Historical quotation dates
    quotation_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    valid_until: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    # Historical customer details
    customer_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    customer_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    customer_email: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    customer_gst_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # Historical company details
    company_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    company_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    company_email: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    company_phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    company_gst_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )
    

    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    taxable_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    cgst_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    sgst_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    igst_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    grand_total: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    terms_conditions: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )
    items: Mapped[list["QuotationRevisionItem"]] = relationship(
    "QuotationRevisionItem",
    back_populates="revision",
    cascade="all, delete-orphan",
    )
