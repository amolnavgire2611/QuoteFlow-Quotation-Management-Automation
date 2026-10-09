
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.company import Company
from app.schemas.company import (
    CompanySettingsResponse,
    CompanySettingsUpdate,
)

router = APIRouter(
    prefix="/settings",
    tags=["Settings"],
)


def get_company_settings(db: Session) -> Company:
    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Company settings have not been configured yet. "
                "Save your company profile first."
            ),
        )

    return company


@router.get(
    "/company",
    response_model=CompanySettingsResponse,
)
def read_company_settings(
    db: Session = Depends(get_db),
):
    return get_company_settings(db)


@router.put(
    "/company",
    response_model=CompanySettingsResponse,
)
def update_company_settings(
    settings_data: CompanySettingsUpdate,
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .order_by(Company.id.asc())
        .first()
    )

    if company is None:
        company = Company(name=settings_data.name.strip())
        db.add(company)

    company.name = settings_data.name.strip()
    company.email = (
        str(settings_data.email)
        if settings_data.email
        else None
    )
    company.phone = settings_data.phone
    company.website = settings_data.website
    company.address = settings_data.address
    company.state = settings_data.state
    company.gstin = settings_data.gstin
    company.pan = settings_data.pan
    company.logo_path = settings_data.logo_path

    try:
        db.commit()
        db.refresh(company)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save company settings.",
        )

    return company
