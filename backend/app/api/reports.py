
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer
from app.models.quotation import Quotation


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)

QUOTATION_STATUSES = [
    "DRAFT",
    "SENT",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "CONVERTED",
]


@router.get("/summary")
def get_reports_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date.",
        )

    # Build one shared date-filtered query for all report sections.
    query = (
        db.query(
            Quotation,
            Customer.company_name.label("customer_name"),
        )
        .outerjoin(
            Customer,
            Customer.id == Quotation.customer_id,
        )
    )

    if date_from:
        query = query.filter(
            Quotation.quotation_date >= date_from
        )

    if date_to:
        query = query.filter(
            Quotation.quotation_date <= date_to
        )

    records = query.order_by(
        Quotation.quotation_date.desc(),
        Quotation.id.desc(),
    ).all()

    status_counts = {
        status: 0 for status in QUOTATION_STATUSES
    }
    status_totals = {
        status: 0.0 for status in QUOTATION_STATUSES
    }

    customer_summary = {}

    quoted_value = 0.0
    accepted_value = 0.0
    converted_value = 0.0
    quotation_rows = []

    for quotation, customer_name in records:
        status = (quotation.status or "").upper()
        amount = float(quotation.grand_total or 0)

        quoted_value += amount

        if status in status_counts:
            status_counts[status] += 1
            status_totals[status] += amount

        if status == "ACCEPTED":
            accepted_value += amount

        if status == "CONVERTED":
            converted_value += amount

        customer_key = quotation.customer_id

        if customer_key not in customer_summary:
            customer_summary[customer_key] = {
                "customer_id": customer_key,
                "customer_name": (
                    customer_name or "Unknown Customer"
                ),
                "quotation_count": 0,
                "quoted_value": 0.0,
            }

        customer_summary[customer_key]["quotation_count"] += 1
        customer_summary[customer_key]["quoted_value"] += amount

        quotation_rows.append({
            "id": quotation.id,
            "quotation_number": quotation.quotation_number,
            "customer_id": quotation.customer_id,
            "customer_name": customer_name or "Unknown Customer",
            "quotation_date": quotation.quotation_date,
            "valid_until": quotation.valid_until,
            "status": status,
            "subtotal": float(quotation.subtotal or 0),
            "discount_amount": float(
                quotation.discount_amount or 0
            ),
            "taxable_amount": float(
                quotation.taxable_amount or 0
            ),
            "cgst_amount": float(quotation.cgst_amount or 0),
            "sgst_amount": float(quotation.sgst_amount or 0),
            "igst_amount": float(quotation.igst_amount or 0),
            "grand_total": amount,
        })

    return {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
        },
        "overview": {
            "quotation_count": len(records),
            "quoted_value": round(quoted_value, 2),
            "accepted_value": round(accepted_value, 2),
            "converted_value": round(converted_value, 2),
        },
        "status_breakdown": [
            {
                "status": status,
                "quotation_count": status_counts[status],
                "quoted_value": round(status_totals[status], 2),
            }
            for status in QUOTATION_STATUSES
        ],
        "customer_summary": sorted(
            [
                {
                    **customer,
                    "quoted_value": round(
                        customer["quoted_value"], 2
                    ),
                }
                for customer in customer_summary.values()
            ],
            key=lambda customer: customer["quoted_value"],
            reverse=True,
        ),
        "quotations": quotation_rows,
    }