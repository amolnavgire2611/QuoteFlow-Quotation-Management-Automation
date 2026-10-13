from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from app.database import get_db
from app.models.product import Product
from app.models.product_category import ProductCategory
from app.schemas.product import (
    ProductCreate,
    ProductCategoryCreate,
    ProductResponse,
    ProductUpdate,
)
from app.utils.excel_import import excel_template, read_excel_rows


router = APIRouter(
    prefix="/products",
    tags=["Products"],
)

PRODUCT_IMAGE_DIRECTORY = Path(__file__).resolve().parents[2] / "generated" / "product-images"
MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024
PRODUCT_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def get_or_create_category(db: Session, name: str | None) -> str | None:
    normalized = (name or "").strip()
    if not normalized:
        return None

    pending = next(
        (
            category
            for category in db.new
            if isinstance(category, ProductCategory)
            and category.name.casefold() == normalized.casefold()
        ),
        None,
    )
    if pending:
        return pending.name

    existing = (
        db.query(ProductCategory)
        .filter(ProductCategory.name.ilike(normalized))
        .first()
    )
    if existing:
        return existing.name

    db.add(ProductCategory(name=normalized))
    return normalized


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
):
    existing_product = (
        db.query(Product)
        .filter(
            Product.product_code == product_data.product_code
        )
        .first()
    )

    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product code already exists.",
        )

    values = product_data.model_dump()
    values["category"] = get_or_create_category(db, values.get("category"))
    product = Product(**values)

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


@router.get(
    "",
    response_model=list[ProductResponse],
)
def get_products(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    active_only: bool = True,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Product)

    if active_only:
        query = query.filter(
            Product.is_active.is_(True)
        )

    if search:
        search_pattern = f"%{search}%"

        query = query.filter(
            or_(
                Product.product_code.ilike(
                    search_pattern
                ),
                Product.name.ilike(
                    search_pattern
                ),
                Product.description.ilike(
                    search_pattern
                ),
                Product.hsn_sac.ilike(
                    search_pattern
                ),
                Product.category.ilike(search_pattern),
            )
        )

    if category:
        query = query.filter(Product.category == category)

    return (
        query
        .order_by(Product.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/categories")
def get_product_categories(db: Session = Depends(get_db)):
    """Return categories from the catalog and any legacy product values."""
    known = {
        category.name.casefold(): category.name
        for category in db.query(ProductCategory).order_by(ProductCategory.name).all()
    }
    for (name,) in db.query(Product.category).filter(Product.category.is_not(None)).distinct():
        if name and name.strip():
            known.setdefault(name.strip().casefold(), name.strip())
    return sorted(known.values(), key=str.casefold)


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_product_category(
    payload: ProductCategoryCreate,
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name cannot be blank.")

    existing = db.query(ProductCategory).filter(ProductCategory.name.ilike(name)).first()
    if existing:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"id": existing.id, "name": existing.name},
        )

    category = ProductCategory(name=name)
    db.add(category)
    try:
        db.commit()
        db.refresh(category)
    except Exception as exc:
        db.rollback()
        existing = db.query(ProductCategory).filter(ProductCategory.name.ilike(name)).first()
        if existing:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"id": existing.id, "name": existing.name},
            )
        raise HTTPException(status_code=409, detail="Unable to save product category.") from exc
    return {"id": category.id, "name": category.name}


@router.get("/import/template")
def product_import_template():
    return excel_template(
        "products-import-template.xlsx",
        ["product_code", "name", "category", "description", "hsn_sac", "unit", "price", "gst_rate"],
    )


@router.post("/import")
async def import_products(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if Path(file.filename or "").suffix.lower() != ".xlsx":
        raise HTTPException(status_code=400, detail="Upload an Excel .xlsx file.")

    rows = read_excel_rows(await file.read(10 * 1024 * 1024 + 1))
    if len(rows) > 2000:
        raise HTTPException(status_code=400, detail="Excel imports are limited to 2,000 data rows.")

    existing_codes = {row[0] for row in db.query(Product.product_code).all()}
    added_codes = set()
    errors = []
    imported = 0

    for row_number, raw in rows:
        try:
            product_data = ProductCreate.model_validate(raw)
            code = product_data.product_code.strip()
            if code in existing_codes or code in added_codes:
                raise ValueError(f"Product code '{code}' already exists.")
            values = product_data.model_dump()
            values["product_code"] = code
            values["name"] = values["name"].strip()
            values["category"] = get_or_create_category(db, values.get("category"))
            db.add(Product(**values))
            added_codes.add(code)
            imported += 1
        except Exception as exc:
            errors.append({"row": row_number, "message": str(exc)})

    if imported:
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="Unable to import products because of a data conflict.") from exc

    return {"imported": imported, "failed": len(errors), "errors": errors[:100]}


@router.post("/{product_id}/image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    extension = PRODUCT_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(status_code=415, detail="Upload a PNG, JPEG, or WebP image.")

    contents = await file.read(MAX_PRODUCT_IMAGE_SIZE + 1)
    if not contents or len(contents) > MAX_PRODUCT_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Product images must be non-empty and no larger than 5 MB.")
    try:
        image = Image.open(BytesIO(contents))
        if image.format not in {"PNG", "JPEG", "WEBP"}:
            raise ValueError("Unsupported image format")
        image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid image.") from exc

    PRODUCT_IMAGE_DIRECTORY.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    image_path = PRODUCT_IMAGE_DIRECTORY / filename
    image_path.write_bytes(contents)
    product.image_path = str(image_path)
    db.commit()
    return {"image_path": product.image_path, "image_url": f"/product-images/{filename}"}


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return product


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    update_data = product_data.model_dump(
        exclude_unset=True
    )

    # Check product-code uniqueness
    if "product_code" in update_data:

        duplicate = (
            db.query(Product)
            .filter(
                Product.product_code
                == update_data["product_code"],
                Product.id != product_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another product already uses this product code.",
            )

    for field, value in update_data.items():
        if field == "category":
            value = get_or_create_category(db, value)
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    product.is_active = False

    db.commit()

    return None