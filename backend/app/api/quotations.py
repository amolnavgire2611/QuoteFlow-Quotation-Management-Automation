from datetime import date
from urllib.parse import quote
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from fastapi.responses import StreamingResponse

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db

from app.core.config import settings

from app.models.company import Company
from app.models.customer import Customer
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.models.quotation_email import QuotationEmail

from app.schemas.quotation import (
    QuotationCreate,
    QuotationListResponse,
    QuotationResponse,
    QuotationStatusUpdate,
    QuotationEmailRequest,
)

from app.services.email_service import send_email

from app.services.quotation_pdf import (
    generate_quotation_pdf,
)

from app.services.quotation_calculator import (
    calculate_item,
    calculate_quotation_totals,
)

from app.services.quotation_number import (
    generate_quotation_number,
)


router = APIRouter(
    prefix="/quotations",
    tags=["Quotations"],
)


# ============================================================
# QUOTATION STATUS WORKFLOW
# ============================================================

ALLOWED_STATUS_TRANSITIONS = {
    "DRAFT": {
        "SENT",
    },

    "SENT": {
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
    },

    "ACCEPTED": {
        "CONVERTED",
    },

    "REJECTED": set(),

    "EXPIRED": set(),

    "CONVERTED": set(),
}


# ============================================================
# CREATE QUOTATION
# ============================================================

@router.post(
    "",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_quotation(
    quotation_data: QuotationCreate,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # 1. Validate customer
    # --------------------------------------------------------

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == quotation_data.customer_id,
            Customer.is_active.is_(True),
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found or inactive.",
        )

    # --------------------------------------------------------
    # 2. Validate quotation dates
    # --------------------------------------------------------

    if (
        quotation_data.valid_until
        < quotation_data.quotation_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Valid-until date cannot be before "
                "quotation date."
            ),
        )

    # --------------------------------------------------------
    # 3. Get company configuration
    # --------------------------------------------------------

    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Company configuration not found. "
                "Configure company details first."
            ),
        )

    # --------------------------------------------------------
    # 4. Determine GST type
    # --------------------------------------------------------

    is_same_state = (
        company.state
        and customer.state
        and company.state.strip().lower()
        == customer.state.strip().lower()
    )

    # --------------------------------------------------------
    # 5. Generate quotation number
    # --------------------------------------------------------

    quotation_number = generate_quotation_number(db)

    # --------------------------------------------------------
    # 6. Create quotation header
    # --------------------------------------------------------

    quotation = Quotation(
        quotation_number=quotation_number,
        customer_id=customer.id,
        quotation_date=quotation_data.quotation_date,
        valid_until=quotation_data.valid_until,
        status="DRAFT",
        notes=quotation_data.notes,
        terms_conditions=quotation_data.terms_conditions,
    )

    db.add(quotation)

    # Get quotation.id before creating items
    db.flush()

    # --------------------------------------------------------
    # 7. Process quotation items
    # --------------------------------------------------------

    calculated_items = []

    for item_data in quotation_data.items:

        product = (
            db.query(Product)
            .filter(
                Product.id == item_data.product_id,
                Product.is_active.is_(True),
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Product {item_data.product_id} "
                    "not found or inactive."
                ),
            )

        # ----------------------------------------------------
        # Calculate item
        # ----------------------------------------------------

        calculation = calculate_item(
            quantity=item_data.quantity,
            unit_price=product.price,
            discount_percent=item_data.discount_percent,
            gst_rate=product.gst_rate,
        )

        # ----------------------------------------------------
        # Create quotation item
        #
        # Product information is intentionally copied here.
        # This creates a snapshot of the product at the time
        # the quotation was created.
        # ----------------------------------------------------

        quotation_item = QuotationItem(
            quotation_id=quotation.id,

            product_id=product.id,

            product_code=product.product_code,

            product_name=product.name,

            description=product.description,

            hsn_sac=product.hsn_sac,

            unit=product.unit,

            quantity=item_data.quantity,

            unit_price=product.price,

            discount_percent=item_data.discount_percent,

            discount_amount=calculation[
                "discount_amount"
            ],

            taxable_amount=calculation[
                "taxable_amount"
            ],

            gst_rate=product.gst_rate,

            gst_amount=calculation[
                "gst_amount"
            ],

            total_amount=calculation[
                "total_amount"
            ],
        )

        db.add(quotation_item)

        calculated_items.append(
            calculation
        )

    # --------------------------------------------------------
    # 8. Calculate quotation totals
    # --------------------------------------------------------

    totals = calculate_quotation_totals(
        calculated_items,
        is_same_state=is_same_state,
    )

    # --------------------------------------------------------
    # 9. Store quotation totals
    # --------------------------------------------------------

    quotation.subtotal = totals["subtotal"]

    quotation.discount_amount = (
        totals["discount_amount"]
    )

    quotation.taxable_amount = (
        totals["taxable_amount"]
    )

    quotation.cgst_amount = (
        totals["cgst_amount"]
    )

    quotation.sgst_amount = (
        totals["sgst_amount"]
    )

    quotation.igst_amount = (
        totals["igst_amount"]
    )

    quotation.grand_total = (
        totals["grand_total"]
    )

    # --------------------------------------------------------
    # 10. Save everything
    # --------------------------------------------------------

    db.commit()

    db.refresh(quotation)

    return quotation


# ============================================================
# GET QUOTATION LIST
# ============================================================

@router.get(
    "",
    response_model=list[QuotationListResponse],
)
def get_quotations(
    search: str | None = Query(
        default=None
    ),

    quotation_status: str | None = Query(
        default=None
    ),

    date_from: date | None = Query(
        default=None
    ),

    date_to: date | None = Query(
        default=None
    ),

    skip: int = Query(
        default=0,
        ge=0,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),

    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Start quotation query
    # --------------------------------------------------------

    query = db.query(Quotation)

    # --------------------------------------------------------
    # Search
    #
    # Search by:
    # - quotation number
    # - customer company name
    # --------------------------------------------------------

    if search:
        search_pattern = f"%{search}%"

        matching_customer_ids = (
            db.query(Customer.id)
            .filter(
                Customer.company_name.ilike(
                    search_pattern
                )
            )
            .subquery()
        )

        query = query.filter(
            or_(
                Quotation.quotation_number.ilike(
                    search_pattern
                ),
                Quotation.customer_id.in_(
                    matching_customer_ids
                ),
            )
        )

    # --------------------------------------------------------
    # Status filter
    # --------------------------------------------------------

    if quotation_status:
        query = query.filter(
            Quotation.status
            == quotation_status.upper()
        )

    # --------------------------------------------------------
    # Date filters
    # --------------------------------------------------------

    if date_from:
        query = query.filter(
            Quotation.quotation_date
            >= date_from
        )

    if date_to:
        query = query.filter(
            Quotation.quotation_date
            <= date_to
        )

    # --------------------------------------------------------
    # Get quotations
    # --------------------------------------------------------

    quotations = (
        query
        .order_by(Quotation.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # --------------------------------------------------------
    # Build response
    # --------------------------------------------------------

    result = []

    for quotation in quotations:

        customer = (
            db.query(Customer)
            .filter(
                Customer.id
                == quotation.customer_id
            )
            .first()
        )

        result.append(
            {
                "id": quotation.id,

                "quotation_number":
                    quotation.quotation_number,

                "customer_id":
                    quotation.customer_id,

                "customer_name": (
                    customer.company_name
                    if customer
                    else "Unknown Customer"
                ),

                "quotation_date":
                    quotation.quotation_date,

                "valid_until":
                    quotation.valid_until,

                "status":
                    quotation.status,

                "subtotal":
                    quotation.subtotal,

                "discount_amount":
                    quotation.discount_amount,

                "taxable_amount":
                    quotation.taxable_amount,

                "cgst_amount":
                    quotation.cgst_amount,

                "sgst_amount":
                    quotation.sgst_amount,

                "igst_amount":
                    quotation.igst_amount,

                "grand_total":
                    quotation.grand_total,

                "created_at":
                    quotation.created_at,

                "updated_at":
                    quotation.updated_at,
            }
        )

    return result


# ============================================================
# GENERATE QUOTATION PDF
# ============================================================

@router.get(
    "/{quotation_id}/pdf",
)
def generate_quotation_pdf_endpoint(
    quotation_id: int,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # 1. Get quotation
    # --------------------------------------------------------

    quotation = (
        db.query(Quotation)
        .filter(
            Quotation.id == quotation_id
        )
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    # --------------------------------------------------------
    # 2. Get customer
    # --------------------------------------------------------

    customer = (
        db.query(Customer)
        .filter(
            Customer.id
            == quotation.customer_id
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    # --------------------------------------------------------
    # 3. Get company
    # --------------------------------------------------------

    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Company configuration not found."
            ),
        )

    # --------------------------------------------------------
    # 4. Generate PDF
    # --------------------------------------------------------

    pdf_buffer = generate_quotation_pdf(
        quotation=quotation,
        customer=customer,
        company=company,
    )

    # --------------------------------------------------------
    # 5. Create filename
    # --------------------------------------------------------

    filename = (
        f"{quotation.quotation_number}.pdf"
    )

    encoded_filename = quote(
        filename
    )

    # --------------------------------------------------------
    # 6. Return PDF
    # --------------------------------------------------------

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="{filename}"; '
                f"filename*=UTF-8''{encoded_filename}"
            )
        },
    )

# ============================================================
# GET SINGLE QUOTATION DETAIL
# ============================================================

@router.get(
    "/{quotation_id}",
    response_model=QuotationResponse,
)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
):
    quotation = (
        db.query(Quotation)
        .filter(
            Quotation.id == quotation_id
        )
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    return quotation


# ============================================================
# UPDATE QUOTATION STATUS
# ============================================================

@router.patch(
    "/{quotation_id}/status",
    response_model=QuotationResponse,
)
def update_quotation_status(
    quotation_id: int,
    status_data: QuotationStatusUpdate,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # 1. Find quotation
    # --------------------------------------------------------

    quotation = (
        db.query(Quotation)
        .filter(
            Quotation.id == quotation_id
        )
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    # --------------------------------------------------------
    # 2. Current and requested status
    # --------------------------------------------------------

    current_status = quotation.status.upper()

    new_status = status_data.status.upper()

    # --------------------------------------------------------
    # 3. Prevent same status
    # --------------------------------------------------------

    if new_status == current_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Quotation is already "
                f"{current_status}."
            ),
        )

    # --------------------------------------------------------
    # 4. Get allowed transitions
    # --------------------------------------------------------

    allowed_statuses = (
        ALLOWED_STATUS_TRANSITIONS.get(
            current_status,
            set(),
        )
    )

    # --------------------------------------------------------
    # 5. Validate transition
    # --------------------------------------------------------

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid status transition: "
                f"{current_status} → "
                f"{new_status}."
            ),
        )

    # --------------------------------------------------------
    # 6. Update status
    # --------------------------------------------------------

    quotation.status = new_status

    # --------------------------------------------------------
    # 7. Save
    # --------------------------------------------------------

    db.commit()

    db.refresh(quotation)

    return quotation


# ============================================================
# SEND QUOTATION EMAIL
# ============================================================

@router.post("/{quotation_id}/send-email")
async def send_quotation_email(
    quotation_id: int,
    email_data: QuotationEmailRequest,
    db: Session = Depends(get_db),
):
    # ========================================================
    # 1. GET QUOTATION
    # ========================================================

    quotation = (
        db.query(Quotation)
        .filter(
            Quotation.id == quotation_id
        )
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    # ========================================================
    # 2. GET CUSTOMER
    # ========================================================

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == quotation.customer_id
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    # ========================================================
    # 3. GET COMPANY
    # ========================================================

    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Company configuration not found."
            ),
        )

    # ========================================================
    # 4. EMAIL DETAILS
    # ========================================================

    recipient_email = str(
        email_data.recipient_email
    )

    subject = (
        email_data.subject
        or (
            f"Quotation "
            f"{quotation.quotation_number}"
        )
    )

    body = (
        email_data.message
        or (
            f"Dear "
            f"{customer.contact_person or customer.company_name},"
            f"\n\n"
            f"Please find attached our quotation "
            f"{quotation.quotation_number}."
            f"\n\n"
            f"Quotation Date: "
            f"{quotation.quotation_date.strftime('%d-%m-%Y')}"
            f"\n"
            f"Valid Until: "
            f"{quotation.valid_until.strftime('%d-%m-%Y')}"
            f"\n"
            f"Grand Total: "
            f"₹{quotation.grand_total:,.2f}"
            f"\n\n"
            f"Please feel free to contact us if you have "
            f"any questions."
            f"\n\n"
            f"Regards,"
            f"\n"
            f"{settings.SMTP_FROM_NAME}"
        )
    )

    # ========================================================
    # 5. GENERATE PDF IN MEMORY
    # ========================================================

    try:
        pdf_buffer = generate_quotation_pdf(
            quotation=quotation,
            customer=customer,
            company=company,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to generate quotation PDF."
            ),
        ) from exc

    # ========================================================
    # 6. CREATE EMAIL HISTORY
    # ========================================================

    email_record = QuotationEmail(
        quotation_id=quotation.id,
        recipient_email=recipient_email,
        subject=subject,
        status="PENDING",
    )

    db.add(email_record)
    db.commit()
    db.refresh(email_record)

    # ========================================================
    # 7. SEND EMAIL WITH PDF ATTACHMENT
    # ========================================================

    pdf_filename = (
        f"{quotation.quotation_number}.pdf"
    )

    try:

        await send_email(
            recipient_email=recipient_email,
            subject=subject,
            body=body,
            attachment_data=pdf_buffer,
            attachment_filename=pdf_filename,
        )

        # ----------------------------------------------------
        # Email sent successfully
        # ----------------------------------------------------

        email_record.status = "SENT"
        email_record.sent_at = datetime.utcnow()
        email_record.error_message = None

        # Automatically move:
        # DRAFT → SENT

        if quotation.status == "DRAFT":
            quotation.status = "SENT"

        db.commit()
        db.refresh(quotation)

        return {
            "message": (
                "Quotation email sent successfully."
            ),
            "quotation_id": quotation.id,
            "quotation_number": (
                quotation.quotation_number
            ),
            "recipient_email": recipient_email,
            "status": quotation.status,
        }

    except Exception as exc:

        # ----------------------------------------------------
        # Email failed
        # ----------------------------------------------------

        email_record.status = "FAILED"
        email_record.error_message = str(exc)

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to send quotation email. "
                f"{str(exc)}"
            ),
        ) from exc