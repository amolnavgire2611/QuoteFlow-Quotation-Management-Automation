from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.api.quotation_emails import router as quotation_email_router
from app.models import (
    Company,
    Customer,
    Product,
    Quotation,
    QuotationItem,
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
from app.api.audit_logs import router as audit_log_router
Base.metadata.create_all(
    bind=engine
)


app = FastAPI(
    title="Quotation Automation System",
    description="Quotation management and automation API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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