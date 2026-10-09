from datetime import date

from sqlalchemy.orm import Session

from app.models.quotation import Quotation


def generate_quotation_number(
    db: Session,
) -> str:

    year = date.today().year

    prefix = f"QTN-{year}-"

    latest = (
        db.query(Quotation)
        .filter(
            Quotation.quotation_number.like(
                f"{prefix}%"
            )
        )
        .order_by(
            Quotation.id.desc()
        )
        .first()
    )

    if not latest:
        sequence = 1

    else:
        last_number = (
            latest.quotation_number
            .replace(prefix, "")
        )

        sequence = int(last_number) + 1

    return f"{prefix}{sequence:05d}"