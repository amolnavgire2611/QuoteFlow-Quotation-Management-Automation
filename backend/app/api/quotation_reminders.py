
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.quotation import Quotation
from app.models.quotation_email import QuotationEmail

router = APIRouter(
    prefix="/quotation-reminders",
    tags=["Quotation Reminders"],
)


@router.get("/history")
def get_reminder_history(
    status: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return paginated history of automated quotation reminders."""

    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=400,
            detail="date_from cannot be later than date_to.",
        )

    query = (
        db.query(QuotationEmail, Quotation)
        .join(
            Quotation,
            Quotation.id == QuotationEmail.quotation_id,
        )
        .filter(
            QuotationEmail.subject.like("Automatic reminder:%")
        )
    )

    if status:
        normalized_status = status.strip().upper()

        if normalized_status not in {"PENDING", "SENT", "FAILED"}:
            raise HTTPException(
                status_code=400,
                detail="status must be PENDING, SENT, or FAILED.",
            )

        query = query.filter(
            QuotationEmail.status == normalized_status
        )

    if date_from:
        query = query.filter(
            QuotationEmail.created_at >= date_from
        )

    if date_to:
        query = query.filter(
            QuotationEmail.created_at < date_to.fromordinal(
                date_to.toordinal() + 1
            )
        )

    total = query.count()

    records = (
        query
        .order_by(QuotationEmail.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []

    for email_record, quotation in records:
        items.append(
            {
                "id": email_record.id,
                "quotation_id": quotation.id,
                "quotation_number": quotation.quotation_number,
                "recipient_email": email_record.recipient_email,
                "subject": email_record.subject,
                "status": email_record.status,
                "sent_at": email_record.sent_at,
                "created_at": getattr(
                    email_record, "created_at", None
                ),
                "error_message": email_record.error_message,
            }
        )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/summary")
def get_reminder_summary(
    db: Session = Depends(get_db),
):
    """Return aggregate reminder counts."""

    query = db.query(QuotationEmail).filter(
        QuotationEmail.subject.like("Automatic reminder:%")
    )

    records = query.all()

    return {
        "total": len(records),
        "pending": sum(
            record.status == "PENDING" for record in records
        ),
        "sent": sum(
            record.status == "SENT" for record in records
        ),
        "failed": sum(
            record.status == "FAILED" for record in records
        ),
    }