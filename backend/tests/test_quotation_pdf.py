from types import SimpleNamespace

from app.services.quotation_pdf import (
    generate_quotation_pdf,
    get_available_quotation_pdf_templates,
)


def build_sample_quotation():
    item = SimpleNamespace(
        product_name="Laptop",
        description="16GB, 512GB",
        hsn_sac="8471",
        unit="PCS",
        quantity=2,
        unit_price=45000,
        discount_percent=5,
        gst_rate=18,
        total_amount=90000,
    )

    return SimpleNamespace(
        quotation_number="Q-1001",
        quotation_date="2024-01-15",
        valid_until="2024-02-15",
        status="DRAFT",
        items=[item],
        subtotal=90000,
        discount_amount=4500,
        taxable_amount=85500,
        cgst_amount=7695,
        sgst_amount=7695,
        igst_amount=0,
        grand_total=100890,
        notes="Thank you for your enquiry.",
        terms_conditions="Payment due within 15 days.",
    )


def build_sample_customer():
    return SimpleNamespace(
        company_name="Acme Industries",
        contact_person="Amit Verma",
        billing_address="22 Market Road, Mumbai",
        address="22 Market Road, Mumbai",
        state="Maharashtra",
        phone="9876543210",
        email="amit@example.com",
        gstin="27ABCDE1234F1Z5",
    )


def build_sample_company():
    return SimpleNamespace(
        name="BluePeak Traders",
        address="12 MG Road, Bengaluru",
        state="Karnataka",
        phone="9988776655",
        email="sales@bluepeak.example",
        gstin="29ABCDE1234F1Z5",
        pan="ABCDE1234F",
        logo_path=None,
    )


def test_get_available_quotation_pdf_templates_returns_multiple_templates():
    templates = get_available_quotation_pdf_templates()

    assert isinstance(templates, list)
    assert len(templates) >= 2
    assert {item["id"] for item in templates} >= {"classic", "modern"}


def test_generate_quotation_pdf_supports_modern_template():
    buffer = generate_quotation_pdf(
        quotation=build_sample_quotation(),
        customer=build_sample_customer(),
        company=build_sample_company(),
        template_name="modern",
    )

    assert buffer is not None
    assert buffer.getvalue().startswith(b"%PDF")
