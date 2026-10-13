from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.auth import router as auth_router
from app.api.settings import router as settings_router
from app.database import Base, engine
from app.api.reports import router as reports_router
from app.api.quotation_emails import router as quotation_email_router
from app.api.users import router as users_router
from app.api.reminder_controls import (
    router as reminder_controls_router,
)
from app.api.reminder_settings import (
    router as reminder_settings_router,
)
from app.models import (
    Company,
    Customer,
    Product,
    Quotation,
    QuotationItem,
)
from app.api.quotation_reminders import (
    router as quotation_reminders_router,
)

from app.api.customers import (
    router as customer_router
)

from app.api.products import (
    router as product_router
)

from app.api.quotations import (
    router as quotation_router
)
from app.api.quotation_revisions import (
    router as quotation_revision_router,
)
from app.services.quotation_scheduler import (
    start_quotation_scheduler,
    stop_quotation_scheduler,
)
from app.api.audit_logs import router as audit_log_router
Base.metadata.create_all(
    bind=engine
)


def migrate_optional_profile_and_product_columns():
    """Add newly introduced nullable fields to existing SQLite installs."""
    if engine.dialect.name != "sqlite":
        return

    additions = {
        "products": {
            "category": "VARCHAR(100)",
            "image_path": "VARCHAR(500)",
        },
        "users": {
            "full_name": "VARCHAR(150)",
            "email": "VARCHAR(255)",
            "phone": "VARCHAR(30)",
        },
    }

    with engine.begin() as connection:
        for table_name, columns in additions.items():
            existing = {
                column["name"]
                for column in __import__("sqlalchemy").inspect(connection).get_columns(table_name)
            }
            for column_name, column_type in columns.items():
                if column_name not in existing:
                    connection.exec_driver_sql(
                        f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {column_type}'
                    )


migrate_optional_profile_and_product_columns()


app = FastAPI(
    title="Quotation Automation System",
    description="Quotation management and automation API",
    version="1.0.0",
)
LOGO_DIRECTORY = Path(__file__).resolve().parents[1] / "generated" / "logos"
LOGO_DIRECTORY.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=LOGO_DIRECTORY), name="uploads")
PRODUCT_IMAGE_DIRECTORY = Path(__file__).resolve().parents[1] / "generated" / "product-images"
PRODUCT_IMAGE_DIRECTORY.mkdir(parents=True, exist_ok=True)
app.mount("/product-images", StaticFiles(directory=PRODUCT_IMAGE_DIRECTORY), name="product-images")

@app.on_event("startup")
def startup_quotation_scheduler():
    start_quotation_scheduler()


@app.on_event("shutdown")
def shutdown_quotation_scheduler():
    stop_quotation_scheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(users_router)

app.include_router(
    customer_router
)

app.include_router(
    product_router
)

app.include_router(
    quotation_router
)
app.include_router(quotation_email_router)
app.include_router(quotation_revision_router)
app.include_router(audit_log_router)
app.include_router(settings_router)
app.include_router(reports_router)
app.include_router(quotation_reminders_router)
app.include_router(reminder_controls_router)
app.include_router(reminder_settings_router)
@app.get("/")
def root():
    return {
        "message": "Quotation Automation System API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }