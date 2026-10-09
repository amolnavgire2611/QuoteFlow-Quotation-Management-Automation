ALLOWED_REVISION_TRANSITIONS = {
    "DRAFT": {"FINALIZED"},
    "FINALIZED": {"SENT"},
    "SENT": {"ACCEPTED", "REJECTED"},
    "ACCEPTED": set(),
    "REJECTED": set(),
}
from app.services.audit_service import create_audit_log
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.quotation import Quotation
from app.models.quotation_revision import QuotationRevision
from app.models.quotation_revision_item import QuotationRevisionItem
from app.models.customer import Customer
from app.models.company import Company
from app.models.product import Product

from app.schemas.quotation_revision import (
    QuotationRevisionUpdate,
    RevisionStatusUpdate,
)
from urllib.parse import quote

from fastapi.responses import StreamingResponse

from app.services.quotation_pdf import generate_revision_pdf
from app.services.quotation_calculator import (
    calculate_item,
    calculate_quotation_totals,
)

router = APIRouter(
    prefix="/quotations",
    tags=["Quotation Revisions"],
)



@router.post(
    "/{quotation_id}/revisions",
    status_code=status.HTTP_201_CREATED,
)
def create_quotation_revision(
    quotation_id: int,
    db: Session = Depends(get_db),
):
    # 1. Find the original quotation
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

    # 2. Load customer details for the historical snapshot
    customer = (
        db.query(Customer)
        .filter(Customer.id == quotation.customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    # 3. Load company details for the historical snapshot
    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company configuration not found.",
        )

    # 4. Determine the next revision number
    latest_revision = (
        db.query(QuotationRevision)
        .filter(
            QuotationRevision.quotation_id == quotation.id
        )
        .order_by(
            QuotationRevision.revision_number.desc()
        )
        .first()
    )

    revision_number = (
        latest_revision.revision_number + 1
        if latest_revision
        else 1
    )

    # 5. Create the revision with historical snapshots
    revision = QuotationRevision(
        quotation_id=quotation.id,
        revision_number=revision_number,
        quotation_number=quotation.quotation_number,

        # Revision workflow
        status="DRAFT",

        # Quotation dates
        quotation_date=quotation.quotation_date,
        valid_until=quotation.valid_until,

        # Customer snapshot
        customer_name=customer.company_name,
        customer_address=(
            customer.billing_address or customer.address
        ),
        customer_email=customer.email,
        customer_gst_number=customer.gstin,

        # Company snapshot
        company_name=company.name,
        company_address=company.address,
        company_email=company.email,
        company_phone=company.phone,
        company_gst_number=company.gstin,

        # Financial snapshot
        subtotal=quotation.subtotal,
        discount_amount=quotation.discount_amount,
        taxable_amount=quotation.taxable_amount,
        cgst_amount=quotation.cgst_amount,
        sgst_amount=quotation.sgst_amount,
        igst_amount=quotation.igst_amount,
        grand_total=quotation.grand_total,

        # Commercial terms snapshot
        notes=quotation.notes,
        terms_conditions=quotation.terms_conditions,
    )

    db.add(revision)
    db.flush()

    # 6. Copy the quotation items into the revision
    for item in quotation.items:
        revision_item = QuotationRevisionItem(
            revision_id=revision.id,
            product_id=item.product_id,
            product_code=item.product_code,
            product_name=item.product_name,
            description=item.description,
            hsn_sac=item.hsn_sac,
            unit=item.unit,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percent=item.discount_percent,
            discount_amount=item.discount_amount,
            taxable_amount=item.taxable_amount,
            gst_rate=item.gst_rate,
            gst_amount=item.gst_amount,
            total_amount=item.total_amount,
        )

        db.add(revision_item)

    # 7. Record the creation in the audit trail
    create_audit_log(
        db=db,
        quotation_id=quotation_id,
        action="REVISION_CREATED",
        description=(
            f"Revision #{revision.revision_number} "
            f"created for quotation "
            f"{revision.quotation_number}."
        ),
    )

    # 8. Save all changes
    try:
        db.commit()
        db.refresh(revision)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            "A revision with this number already exists. "
            "Refresh the quotation and try again."
        ),
    ) from exc
    except Exception:
        db.rollback()
        raise

    return {
        "message": "Quotation revision created successfully.",
        "quotation_id": quotation.id,
        "quotation_number": quotation.quotation_number,
        "revision_id": revision.id,
        "revision_number": revision.revision_number,
        "status": revision.status,
        "grand_total": revision.grand_total,
    }

@router.get("/{quotation_id}/revisions")
def get_quotation_revisions(
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

    revisions = (
        db.query(QuotationRevision)
        .filter(
            QuotationRevision.quotation_id == quotation_id
        )
        .order_by(
            QuotationRevision.revision_number.asc()
        )
        .all()
    )

    return {
        "quotation_id": quotation.id,
        "quotation_number": quotation.quotation_number,
        "total_revisions": len(revisions),
        "revisions": [
            {
                "id": revision.id,
                "revision_number": revision.revision_number,
                "status": revision.status,
                "subtotal": revision.subtotal,
                "discount_amount": revision.discount_amount,
                "taxable_amount": revision.taxable_amount,
                "cgst_amount": revision.cgst_amount,
                "sgst_amount": revision.sgst_amount,
                "igst_amount": revision.igst_amount,
                "grand_total": revision.grand_total,
                "notes": revision.notes,
                "terms_conditions": revision.terms_conditions,
                "created_at": revision.created_at,
                "items": [
                    {
                        "id": item.id,
                        "product_id": item.product_id,
                        "product_code": item.product_code,
                        "product_name": item.product_name,
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                        "discount_percent": item.discount_percent,
                        "discount_amount": item.discount_amount,
                        "taxable_amount": item.taxable_amount,
                        "gst_rate": item.gst_rate,
                        "gst_amount": item.gst_amount,
                        "total_amount": item.total_amount,
                    }
                    for item in revision.items
                ],
            }
            for revision in revisions
        ],
    }

@router.get(
    "/{quotation_id}/revisions/{revision_number}/pdf",
    summary="Generate quotation revision PDF",
)
def generate_revision_pdf_endpoint(
    quotation_id: int,
    revision_number: int,
    db: Session = Depends(get_db),
):
    # 1. Verify quotation
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

    # 2. Find the requested revision
    revision = (
        db.query(QuotationRevision)
        .filter(
            QuotationRevision.quotation_id == quotation_id,
            QuotationRevision.revision_number == revision_number,
        )
        .first()
    )

    if not revision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation revision not found.",
        )

    # 3. Load customer
    customer = (
        db.query(Customer)
        .filter(Customer.id == quotation.customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    # 4. Load company
    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company configuration not found.",
        )

    # 5. Generate PDF from revision snapshot
    try:
        pdf_buffer = generate_revision_pdf(
            revision=revision,
            quotation=quotation,
            customer=customer,
            company=company,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate revision PDF.",
        ) from exc

    # 6. Return a revision-specific filename
    filename = (
        f"{revision.quotation_number}"
        f"-REV-{revision.revision_number:02d}.pdf"
    )

    encoded_filename = quote(filename)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"; '
                f"filename*=UTF-8''{encoded_filename}"
            )
        },
    )



@router.get(
    "/{quotation_id}/revisions/compare"
)
def compare_quotation_revisions(
    quotation_id: int,
    revision_from: int,
    revision_to: int,
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

    old_revision = (
        db.query(QuotationRevision)
        .filter(
            QuotationRevision.quotation_id == quotation_id,
            QuotationRevision.revision_number == revision_from,
        )
        .first()
    )

    new_revision = (
        db.query(QuotationRevision)
        .filter(
            QuotationRevision.quotation_id == quotation_id,
            QuotationRevision.revision_number == revision_to,
        )
        .first()
    )

    if not old_revision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Revision {revision_from} not found.",
        )

    if not new_revision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Revision {revision_to} not found.",
        )

    old_items = {
        item.product_id: item
        for item in old_revision.items
    }

    new_items = {
        item.product_id: item
        for item in new_revision.items
    }

    added = []
    removed = []
    changed = []

    # Added or changed products
    for product_id, new_item in new_items.items():

        if product_id not in old_items:
            added.append({
                "product_id": product_id,
                "product_name": new_item.product_name,
                "quantity": new_item.quantity,
                "unit_price": new_item.unit_price,
                "total_amount": new_item.total_amount,
            })
            continue

        old_item = old_items[product_id]

        changes = {}

        if old_item.quantity != new_item.quantity:
            changes["quantity"] = {
                "old": old_item.quantity,
                "new": new_item.quantity,
            }

        if old_item.unit_price != new_item.unit_price:
            changes["unit_price"] = {
                "old": old_item.unit_price,
                "new": new_item.unit_price,
            }

        if old_item.discount_percent != new_item.discount_percent:
            changes["discount_percent"] = {
                "old": old_item.discount_percent,
                "new": new_item.discount_percent,
            }

        if old_item.gst_rate != new_item.gst_rate:
            changes["gst_rate"] = {
                "old": old_item.gst_rate,
                "new": new_item.gst_rate,
            }

        if changes:
            changed.append({
                "product_id": product_id,
                "product_name": new_item.product_name,
                "changes": changes,
            })

    # Removed products
    for product_id, old_item in old_items.items():

        if product_id not in new_items:
            removed.append({
                "product_id": product_id,
                "product_name": old_item.product_name,
                "quantity": old_item.quantity,
                "unit_price": old_item.unit_price,
                "total_amount": old_item.total_amount,
            })

    total_difference = (
        new_revision.grand_total
        - old_revision.grand_total
    )

    return {
        "quotation_id": quotation.id,
        "quotation_number": quotation.quotation_number,

        "from_revision": revision_from,
        "to_revision": revision_to,

        "old_total": old_revision.grand_total,
        "new_total": new_revision.grand_total,

        "total_difference": total_difference,

        "added_items": added,
        "removed_items": removed,
        "changed_items": changed,

        "summary": {
            "items_added": len(added),
            "items_removed": len(removed),
            "items_changed": len(changed),
        },
    }

@router.put(
    "/{quotation_id}/revisions/{revision_number}"
)
def update_quotation_revision(
    quotation_id: int,
    revision_number: int,
    revision_data: QuotationRevisionUpdate,
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

    revision = (
        db.query(QuotationRevision)
        .filter(
            QuotationRevision.quotation_id == quotation_id,
            QuotationRevision.revision_number == revision_number,
        )
        .first()
    )

    if not revision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Revision not found.",
        )
    latest_revision = (
    db.query(QuotationRevision)
    .filter(
        QuotationRevision.quotation_id == quotation_id
    )
    .order_by(
        QuotationRevision.revision_number.desc()
    )
    .first()
    )
    if latest_revision and latest_revision.id != revision.id:
        raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Only the latest revision can be edited.",
    )
    

    customer = (
        db.query(Customer)
        .filter(Customer.id == quotation.customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company configuration not found.",
        )

    # Remove existing revision items
    revision.items.clear()

    calculated_items = []

    for requested_item in revision_data.items:

        product = (
            db.query(Product)
            .filter(
                Product.id == requested_item.product_id,
                Product.is_active.is_(True),
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Product "
                    f"{requested_item.product_id} "
                    f"not found or inactive."
                ),
            )

        calculated = calculate_item(
            quantity=requested_item.quantity,
            unit_price=product.price,
            discount_percent=requested_item.discount_percent,
            gst_rate=product.gst_rate,
        )

        revision_item = QuotationRevisionItem(
            product_id=product.id,
            product_code=product.product_code,
            product_name=product.name,
            description=product.description,
            hsn_sac=product.hsn_sac,
            unit=product.unit,
            quantity=requested_item.quantity,
            unit_price=product.price,
            discount_percent=requested_item.discount_percent,
            discount_amount=calculated["discount_amount"],
            taxable_amount=calculated["taxable_amount"],
            gst_rate=product.gst_rate,
            gst_amount=calculated["gst_amount"],
            total_amount=calculated["total_amount"],
        )

        revision.items.append(revision_item)

        calculated_items.append(calculated)

    # Determine GST type
    is_same_state = (
        company.state
        and customer.state
        and company.state.strip().lower()
        == customer.state.strip().lower()
    )

    totals = calculate_quotation_totals(
        calculated_items,
        is_same_state=is_same_state,
    )

    revision.subtotal = totals["subtotal"]
    revision.discount_amount = totals["discount_amount"]
    revision.taxable_amount = totals["taxable_amount"]
    revision.cgst_amount = totals["cgst_amount"]
    revision.sgst_amount = totals["sgst_amount"]
    revision.igst_amount = totals["igst_amount"]
    revision.grand_total = totals["grand_total"]

    revision.notes = revision_data.notes
    revision.terms_conditions = (
        revision_data.terms_conditions
    )
    create_audit_log(
    db=db,
    quotation_id=quotation_id,
    action="REVISION_UPDATED",
    description=(
        f"Revision #{revision.revision_number} "
        f"was updated."
    ),
    )

    db.commit()
    db.refresh(revision)

    return {
        "message": "Quotation revision updated successfully.",
        "quotation_id": quotation.id,
        "quotation_number": quotation.quotation_number,
        "revision_id": revision.id,
        "revision_number": revision.revision_number,
        "subtotal": revision.subtotal,
        "discount_amount": revision.discount_amount,
        "taxable_amount": revision.taxable_amount,
        "cgst_amount": revision.cgst_amount,
        "sgst_amount": revision.sgst_amount,
        "igst_amount": revision.igst_amount,
        "grand_total": revision.grand_total,
    }

@router.patch(
    "/{quotation_id}/revisions/{revision_number}/status"
)
def update_revision_status(
    quotation_id: int,
    revision_number: int,
    status_data: RevisionStatusUpdate,
    db: Session = Depends(get_db),
):
    revision = (
        db.query(QuotationRevision)
        .filter(
            QuotationRevision.quotation_id == quotation_id,
            QuotationRevision.revision_number == revision_number,
        )
        .first()
    )

    if not revision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Revision not found.",
        )

    new_status = status_data.status.strip().upper()

    allowed_statuses = ALLOWED_REVISION_TRANSITIONS.get(
        revision.status,
        set(),
    )

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot change revision status "
                f"from {revision.status} to {new_status}."
            ),
        )
    if (new_status == "FINALIZED" and not revision.items):
        raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Cannot finalize a revision without items.",
    )

    revision.status = new_status
    create_audit_log(
    db=db,
    quotation_id=quotation_id,
    action=f"REVISION_{new_status}",
    description=(
        f"Revision #{revision.revision_number} "
        f"status changed to {new_status}."
    ),
    )

    db.commit()
    db.refresh(revision)

    return {
        "message": "Revision status updated successfully.",
        "revision_id": revision.id,
        "revision_number": revision.revision_number,
        "status": revision.status,
    }