
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
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

LOGO_DIRECTORY = Path(__file__).resolve().parents[2] / "generated" / "logos"
MAX_LOGO_SIZE = 5 * 1024 * 1024
ALLOWED_LOGO_TYPES = {"image/png": ".png", "image/jpeg": ".jpg"}


@router.post("/company/logo")
async def upload_company_logo(file: UploadFile = File(...)):
    """Store a company logo and return its path for quotation PDFs."""
    extension = ALLOWED_LOGO_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a PNG or JPEG image.",
        )

    contents = await file.read(MAX_LOGO_SIZE + 1)
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded logo is empty.",
        )
    signature_is_valid = (
        contents.startswith(b"\x89PNG\r\n\x1a\n")
        if extension == ".png"
        else contents.startswith(b"\xff\xd8\xff")
    )
    if not signature_is_valid:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The file contents do not match a PNG or JPEG image.",
        )
    if len(contents) > MAX_LOGO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Logo files must be 5 MB or smaller.",
        )

    LOGO_DIRECTORY.mkdir(parents=True, exist_ok=True)
    logo_path = LOGO_DIRECTORY / f"{uuid4().hex}{extension}"
    logo_path.write_bytes(contents)

    return {"logo_path": str(logo_path), "logo_url": f"/uploads/{logo_path.name}"}


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
