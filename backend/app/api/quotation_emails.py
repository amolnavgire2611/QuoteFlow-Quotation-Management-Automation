from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.quotation import Quotation
from app.models.quotation_email import QuotationEmail

router = APIRouter(
    prefix="/quotation-emails",
    tags=["Quotation Emails"],
)


@router.get("/{quotation_id}")
def get_quotation_email_history(
    quotation_id: int,
    db: Session = Depends(get_db),
):
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id)
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    emails = (
        db.query(QuotationEmail)
        .filter(
            QuotationEmail.quotation_id == quotation_id
        )
        .order_by(
            QuotationEmail.created_at.desc()
        )
        .all()
    )

    return {
        "quotation_id": quotation.id,
        "quotation_number": quotation.quotation_number,
        "total_emails": len(emails),
        "emails": [
            {
                "id": email.id,
                "recipient_email": email.recipient_email,
                "subject": email.subject,
                "status": email.status,
                "sent_at": email.sent_at,
                "error_message": email.error_message,
                "created_at": email.created_at,
            }
            for email in emails
        ],
    }