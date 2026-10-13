from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from app.utils.excel_import import excel_template, read_excel_rows


router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
):
    existing_customer = (
        db.query(Customer)
        .filter(
            Customer.company_name == customer_data.company_name
        )
        .first()
    )

    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer with this company name already exists.",
        )

    customer = Customer(
        **customer_data.model_dump()
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    return customer


@router.get(
    "",
    response_model=list[CustomerResponse],
)
def get_customers(
    search: str | None = Query(default=None),
    active_only: bool = True,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Customer)

    if active_only:
        query = query.filter(
            Customer.is_active.is_(True)
        )

    if search:
        search_pattern = f"%{search}%"

        query = query.filter(
            or_(
                Customer.company_name.ilike(search_pattern),
                Customer.contact_person.ilike(search_pattern),
                Customer.email.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
            )
        )

    return (
        query
        .order_by(Customer.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/import/template")
def customer_import_template():
    return excel_template(
        "customers-import-template.xlsx",
        ["company_name", "contact_person", "email", "phone", "address", "billing_address", "shipping_address", "gstin", "pan", "state", "country"],
    )


@router.post("/import")
async def import_customers(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if Path(file.filename or "").suffix.lower() != ".xlsx":
        raise HTTPException(status_code=400, detail="Upload an Excel .xlsx file.")

    rows = read_excel_rows(await file.read(10 * 1024 * 1024 + 1))
    if len(rows) > 2000:
        raise HTTPException(status_code=400, detail="Excel imports are limited to 2,000 data rows.")

    existing_names = {name.strip().casefold() for (name,) in db.query(Customer.company_name).all()}
    added_names = set()
    errors = []
    imported = 0

    for row_number, raw in rows:
        try:
            customer_data = CustomerCreate.model_validate(raw)
            name = customer_data.company_name.strip()
            key = name.casefold()
            if key in existing_names or key in added_names:
                raise ValueError(f"Customer '{name}' already exists.")
            values = customer_data.model_dump()
            values["company_name"] = name
            db.add(Customer(**values))
            added_names.add(key)
            imported += 1
        except Exception as exc:
            errors.append({"row": row_number, "message": str(exc)})

    if imported:
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="Unable to import customers because of a data conflict.") from exc

    return {"imported": imported, "failed": len(errors), "errors": errors[:100]}


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    return customer


@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    update_data = customer_data.model_dump(
        exclude_unset=True
    )

    if "company_name" in update_data:
        duplicate = (
            db.query(Customer)
            .filter(
                Customer.company_name == update_data["company_name"],
                Customer.id != customer_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another customer already uses this company name.",
            )

    for field, value in update_data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)

    return customer


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_customer(
    customer_id: int,
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    customer.is_active = False

    db.commit()

    return None