from datetime import date, datetime
from io import BytesIO
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)

from app.models.company import Company
from app.models.customer import Customer
from app.models.quotation import Quotation


# ============================================================
# PDF CONSTANTS
# ============================================================

PAGE_WIDTH, PAGE_HEIGHT = A4

LEFT_MARGIN = 15 * mm
RIGHT_MARGIN = 15 * mm
TOP_MARGIN = 15 * mm
BOTTOM_MARGIN = 15 * mm


# ============================================================
# CURRENCY FORMATTER
# ============================================================

def format_currency(value: Decimal | float | int) -> str:
    """
    Format a numeric value as Indian currency.

    Example:
        130272 -> ₹ 1,30,272.00
    """

    amount = Decimal(str(value or 0))

    formatted = f"{amount:,.2f}"

    return f"₹ {formatted}"


# ============================================================
# PDF TEMPLATE REGISTRY
# ============================================================

def get_available_quotation_pdf_templates() -> list[dict[str, str]]:
    """Return the quotation PDF templates supported by the app."""

    return [
        {
            "id": "classic",
            "name": "Classic",
            "description": "Traditional quotation format with a neutral layout.",
        },
        {
            "id": "modern",
            "name": "Modern",
            "description": "A stronger brand-focused quotation layout.",
        },
    ]


def generate_quotation_pdf_sample(
    template_name: str = "classic",
) -> BytesIO:
    """Create a sample quotation PDF for preview purposes."""

    sample_quotation = SimpleNamespace(
        quotation_number="Q-1001",
        quotation_date=date(2024, 1, 15),
        valid_until=date(2024, 2, 15),
        status="DRAFT",
        items=[
            SimpleNamespace(
                product_name="Premium Office Chair",
                description="Ergonomic mesh chair",
                hsn_sac="9403",
                unit="PCS",
                quantity=2,
                unit_price=18500,
                discount_percent=5,
                gst_rate=18,
                total_amount=36900,
            )
        ],
        subtotal=37000,
        discount_amount=1850,
        taxable_amount=35150,
        cgst_amount=3163.5,
        sgst_amount=3163.5,
        igst_amount=0,
        grand_total=41477,
        notes="Thank you for your enquiry. Please confirm the final order quantity.",
        terms_conditions="Payment terms: 50% advance and balance on delivery.",
    )

    sample_customer = SimpleNamespace(
        company_name="Northwind Enterprises",
        contact_person="Nisha Patel",
        billing_address="45 Lavelle Road, Bengaluru",
        address="45 Lavelle Road, Bengaluru",
        state="Karnataka",
        phone="9988776655",
        email="nisha@northwind.example",
        gstin="29ABCDE1234F1Z5",
    )

    sample_company = SimpleNamespace(
        name="BluePeak Traders",
        address="12 MG Road, Bengaluru",
        state="Karnataka",
        phone="9988776655",
        email="sales@bluepeak.example",
        gstin="29ABCDE1234F1Z5",
        pan="ABCDE1234F",
        logo_path=None,
    )

    return generate_quotation_pdf(
        quotation=sample_quotation,
        customer=sample_customer,
        company=sample_company,
        template_name=template_name,
    )


def generate_quotation_pdf(
    quotation: Quotation,
    customer: Customer,
    company: Company,
    template_name: str = "classic",
) -> BytesIO:
    """
    Generate a quotation PDF using the requested template.

    Returns:
        BytesIO containing the generated PDF.
    """

    normalized_template = (template_name or "classic").strip().lower()

    if normalized_template == "modern":
        return generate_quotation_pdf_modern(
            quotation=quotation,
            customer=customer,
            company=company,
        )

    return generate_quotation_pdf_classic(
        quotation=quotation,
        customer=customer,
        company=company,
    )


def _as_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        return value


# ============================================================
# CLASSIC QUOTATION PDF TEMPLATE
# ============================================================

def generate_quotation_pdf_classic(
    quotation: Quotation,
    customer: Customer,
    company: Company,
) -> BytesIO:
    """Generate the original quotation PDF layout."""

    buffer = BytesIO()

    # --------------------------------------------------------
    # Document
    # --------------------------------------------------------

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=RIGHT_MARGIN,
        leftMargin=LEFT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title=quotation.quotation_number,
        author=company.name,
    )

    # --------------------------------------------------------
    # Styles
    # --------------------------------------------------------

    styles = getSampleStyleSheet()

    company_style = ParagraphStyle(
        "CompanyName",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        spaceAfter=4,
    )

    quotation_title_style = ParagraphStyle(
        "QuotationTitle",
        parent=styles["Heading2"],
        fontSize=15,
        leading=18,
        alignment=TA_CENTER,
        spaceAfter=12,
    )

    normal_style = ParagraphStyle(
        "NormalText",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
    )

    small_style = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER,
    )

    right_style = ParagraphStyle(
        "RightText",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        alignment=TA_RIGHT,
    )

    total_style = ParagraphStyle(
        "TotalStyle",
        parent=styles["Normal"],
        fontSize=12,
        leading=15,
        alignment=TA_RIGHT,
    )

    # --------------------------------------------------------
    # Story
    # --------------------------------------------------------

    story = []

    # ========================================================
    # COMPANY HEADER
    # ========================================================

    story.append(
        Paragraph(
            company.name,
            company_style,
        )
    )

    company_details = []

    if company.address:
        company_details.append(
            company.address
        )

    if company.state:
        company_details.append(
            company.state
        )

    if company.phone:
        company_details.append(
            f"Phone: {company.phone}"
        )

    if company.email:
        company_details.append(
            f"Email: {company.email}"
        )

    if company.gstin:
        company_details.append(
            f"GSTIN: {company.gstin}"
        )

    if company.pan:
        company_details.append(
            f"PAN: {company.pan}"
        )

    company_details_text = "<br/>".join(
        company_details
    )

    if company_details_text:
        story.append(
            Paragraph(
                company_details_text,
                small_style,
            )
        )

    story.append(
        Spacer(1, 6 * mm)
    )

    # ========================================================
    # QUOTATION TITLE
    # ========================================================

    story.append(
        Paragraph(
            "QUOTATION",
            quotation_title_style,
        )
    )

    # ========================================================
    # QUOTATION INFORMATION
    # ========================================================

    quotation_info = [
        [
            Paragraph(
                "<b>Quotation No.</b>",
                normal_style,
            ),
            Paragraph(
                quotation.quotation_number,
                normal_style,
            ),
            Paragraph(
                "<b>Quotation Date</b>",
                normal_style,
            ),
            Paragraph(
                quotation.quotation_date.strftime(
                    "%d/%m/%Y"
                ),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Valid Until</b>",
                normal_style,
            ),
            Paragraph(
                quotation.valid_until.strftime(
                    "%d/%m/%Y"
                ),
                normal_style,
            ),
            Paragraph(
                "<b>Status</b>",
                normal_style,
            ),
            Paragraph(
                quotation.status,
                normal_style,
            ),
        ],
    ]

    quotation_info_table = Table(
        quotation_info,
        colWidths=[
            32 * mm,
            58 * mm,
            32 * mm,
            58 * mm,
        ],
    )

    quotation_info_table.setStyle(
        TableStyle(
            [
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor("#d1d5db"),
                ),
                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor("#f3f4f6"),
                ),
                (
                    "BACKGROUND",
                    (2, 0),
                    (2, -1),
                    colors.HexColor("#f3f4f6"),
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(
        quotation_info_table
    )

    story.append(
        Spacer(1, 6 * mm)
    )

    # ========================================================
    # CUSTOMER INFORMATION
    # ========================================================

    customer_address = (
        customer.billing_address
        or customer.address
        or "-"
    )

    customer_details = [
        f"<b>{customer.company_name}</b>",
    ]

    if customer.contact_person:
        customer_details.append(
            f"Contact: {customer.contact_person}"
        )

    customer_details.append(
        customer_address
    )

    if customer.state:
        customer_details.append(
            customer.state
        )

    if customer.phone:
        customer_details.append(
            f"Phone: {customer.phone}"
        )

    if customer.email:
        customer_details.append(
            f"Email: {customer.email}"
        )

    if customer.gstin:
        customer_details.append(
            f"GSTIN: {customer.gstin}"
        )

    customer_text = "<br/>".join(
        customer_details
    )

    customer_table = Table(
        [
            [
                Paragraph(
                    "<b>BILL TO</b>",
                    normal_style,
                ),
            ],
            [
                Paragraph(
                    customer_text,
                    normal_style,
                ),
            ],
        ],
        colWidths=[180 * mm],
    )

    customer_table.setStyle(
        TableStyle(
            [
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor("#d1d5db"),
                ),
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#f3f4f6"),
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
            ]
        )
    )

    story.append(
        customer_table
    )

    story.append(
        Spacer(1, 7 * mm)
    )

    # ========================================================
    # ITEMS TABLE
    # ========================================================

    item_header = [
        Paragraph("#", table_header_style),
        Paragraph("Product", table_header_style),
        Paragraph("HSN/SAC", table_header_style),
        Paragraph("Qty", table_header_style),
        Paragraph("Rate", table_header_style),
        Paragraph("Disc.", table_header_style),
        Paragraph("GST", table_header_style),
        Paragraph("Amount", table_header_style),
    ]

    item_rows = [
        item_header
    ]

    for index, item in enumerate(
        quotation.items,
        start=1,
    ):
        product_text = (
            f"<b>{item.product_name}</b>"
        )

        if item.description:
            product_text += (
                f"<br/>"
                f"<font size='7' color='#6b7280'>"
                f"{item.description}"
                f"</font>"
            )

        item_rows.append(
            [
                Paragraph(
                    str(index),
                    small_style,
                ),

                Paragraph(
                    product_text,
                    small_style,
                ),

                Paragraph(
                    item.hsn_sac or "-",
                    small_style,
                ),

                Paragraph(
                    f"{item.quantity} {item.unit}",
                    small_style,
                ),

                Paragraph(
                    format_currency(
                        item.unit_price
                    ),
                    right_style,
                ),

                Paragraph(
                    f"{item.discount_percent:.2f}%",
                    right_style,
                ),

                Paragraph(
                    f"{item.gst_rate:.2f}%",
                    right_style,
                ),

                Paragraph(
                    format_currency(
                        item.total_amount
                    ),
                    right_style,
                ),
            ]
        )

    items_table = Table(
        item_rows,
        colWidths=[
            9 * mm,
            55 * mm,
            20 * mm,
            20 * mm,
            25 * mm,
            18 * mm,
            17 * mm,
            26 * mm,
        ],
        repeatRows=1,
    )

    items_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#1f2937"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor("#d1d5db"),
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor("#f9fafb"),
                    ],
                ),
            ]
        )
    )

    story.append(
        items_table
    )

    story.append(
        Spacer(1, 5 * mm)
    )

    # ========================================================
    # TOTALS
    # ========================================================

    totals_data = [
        [
            "",
            Paragraph(
                "Subtotal",
                normal_style,
            ),
            Paragraph(
                format_currency(
                    quotation.subtotal
                ),
                right_style,
            ),
        ],
        [
            "",
            Paragraph(
                "Discount",
                normal_style,
            ),
            Paragraph(
                f"- {format_currency(quotation.discount_amount)}",
                right_style,
            ),
        ],
        [
            "",
            Paragraph(
                "Taxable Amount",
                normal_style,
            ),
            Paragraph(
                format_currency(
                    quotation.taxable_amount
                ),
                right_style,
            ),
        ],
    ]

    # --------------------------------------------------------
    # GST
    # --------------------------------------------------------

    if quotation.cgst_amount > 0:
        totals_data.append(
            [
                "",
                Paragraph(
                    "CGST",
                    normal_style,
                ),
                Paragraph(
                    format_currency(
                        quotation.cgst_amount
                    ),
                    right_style,
                ),
            ]
        )

    if quotation.sgst_amount > 0:
        totals_data.append(
            [
                "",
                Paragraph(
                    "SGST",
                    normal_style,
                ),
                Paragraph(
                    format_currency(
                        quotation.sgst_amount
                    ),
                    right_style,
                ),
            ]
        )

    if quotation.igst_amount > 0:
        totals_data.append(
            [
                "",
                Paragraph(
                    "IGST",
                    normal_style,
                ),
                Paragraph(
                    format_currency(
                        quotation.igst_amount
                    ),
                    right_style,
                ),
            ]
        )

    totals_data.append(
        [
            "",
            Paragraph(
                "<b>GRAND TOTAL</b>",
                total_style,
            ),
            Paragraph(
                f"<b>{format_currency(quotation.grand_total)}</b>",
                total_style,
            ),
        ]
    )

    totals_table = Table(
        totals_data,
        colWidths=[
            90 * mm,
            45 * mm,
            45 * mm,
        ],
    )

    totals_table.setStyle(
        TableStyle(
            [
                (
                    "LINEABOVE",
                    (1, -1),
                    (-1, -1),
                    1.2,
                    colors.HexColor("#111827"),
                ),
                (
                    "TOPPADDING",
                    (1, -1),
                    (-1, -1),
                    8,
                ),
                (
                    "BOTTOMPADDING",
                    (1, -1),
                    (-1, -1),
                    8,
                ),
                (
                    "ALIGN",
                    (1, 0),
                    (-1, -1),
                    "RIGHT",
                ),
            ]
        )
    )

    story.append(
        totals_table
    )

    story.append(
        Spacer(1, 7 * mm)
    )

    # ========================================================
    # NOTES
    # ========================================================

    if quotation.notes:

        notes_content = [
            [
                Paragraph(
                    "<b>NOTES</b>",
                    normal_style,
                )
            ],
            [
                Paragraph(
                    quotation.notes.replace(
                        "\n",
                        "<br/>",
                    ),
                    small_style,
                )
            ],
        ]

        notes_table = Table(
            notes_content,
            colWidths=[180 * mm],
        )

        notes_table.setStyle(
            TableStyle(
                [
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.HexColor("#d1d5db"),
                    ),
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor("#f3f4f6"),
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                ]
            )
        )

        story.append(
            notes_table
        )

        story.append(
            Spacer(1, 5 * mm)
        )

    # ========================================================
    # TERMS AND CONDITIONS
    # ========================================================

    if quotation.terms_conditions:

        terms_content = [
            [
                Paragraph(
                    "<b>TERMS & CONDITIONS</b>",
                    normal_style,
                )
            ],
            [
                Paragraph(
                    quotation.terms_conditions.replace(
                        "\n",
                        "<br/>",
                    ),
                    small_style,
                )
            ],
        ]

        terms_table = Table(
            terms_content,
            colWidths=[180 * mm],
        )

        terms_table.setStyle(
            TableStyle(
                [
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.HexColor("#d1d5db"),
                    ),
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor("#f3f4f6"),
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                ]
            )
        )

        story.append(
            terms_table
        )

        story.append(
            Spacer(1, 8 * mm)
        )

    # ========================================================
    # FOOTER
    # ========================================================

    story.append(
        Paragraph(
            "This is a computer-generated quotation.",
            ParagraphStyle(
                "Footer",
                parent=small_style,
                alignment=TA_CENTER,
                textColor=colors.HexColor(
                    "#6b7280"
                ),
            ),
        )
    )

    # ========================================================
    # BUILD PDF
    # ========================================================

    document.build(story)

    buffer.seek(0)

    return buffer


def generate_quotation_pdf_modern(
    quotation: Quotation,
    customer: Customer,
    company: Company,
) -> BytesIO:
    """Generate a modern quotation PDF layout with a more polished presentation."""

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=RIGHT_MARGIN,
        leftMargin=LEFT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title=quotation.quotation_number,
        author=getattr(company, "name", "Quotation"),
    )

    styles = getSampleStyleSheet()
    brand = colors.HexColor("#1d4ed8")
    soft = colors.HexColor("#eff6ff")
    dark = colors.HexColor("#111827")
    muted = colors.HexColor("#6b7280")

    title_style = ParagraphStyle(
        "ModernTitle",
        parent=styles["Heading1"],
        fontSize=22,
        leading=26,
        textColor=brand,
        alignment=TA_CENTER,
        spaceAfter=5,
    )
    subtitle_style = ParagraphStyle(
        "ModernSubtitle",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        textColor=muted,
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    card_title_style = ParagraphStyle(
        "CardTitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=12,
        textColor=brand,
        fontName="Helvetica-Bold",
        spaceAfter=6,
    )
    normal_style = ParagraphStyle(
        "ModernNormal",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=dark,
    )
    right_style = ParagraphStyle(
        "ModernRight",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        alignment=TA_RIGHT,
        textColor=dark,
    )
    small_style = ParagraphStyle(
        "ModernSmall",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=muted,
    )
    header_style = ParagraphStyle(
        "ModernHeader",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.white,
        fontName="Helvetica-Bold",
    )

    story = []
    story.append(Paragraph(getattr(company, "name", "Quotation"), title_style))
    story.append(Paragraph("QUOTATION", subtitle_style))

    company_details = []
    if getattr(company, "address", None):
        company_details.append(company.address)
    if getattr(company, "state", None):
        company_details.append(company.state)
    if getattr(company, "phone", None):
        company_details.append(f"Phone: {company.phone}")
    if getattr(company, "email", None):
        company_details.append(f"Email: {company.email}")
    if getattr(company, "gstin", None):
        company_details.append(f"GSTIN: {company.gstin}")

    if company_details:
        story.append(Paragraph("<br/>".join(company_details), small_style))

    story.append(Spacer(1, 4 * mm))

    quote_info = [
        [Paragraph("Quotation No.", card_title_style), Paragraph(quotation.quotation_number, normal_style), Paragraph("Date", card_title_style), Paragraph(_as_date(quotation.quotation_date).strftime("%d/%m/%Y") if _as_date(quotation.quotation_date) else "-", normal_style)],
        [Paragraph("Valid Until", card_title_style), Paragraph(_as_date(quotation.valid_until).strftime("%d/%m/%Y") if _as_date(quotation.valid_until) else "-", normal_style), Paragraph("Status", card_title_style), Paragraph(quotation.status, normal_style)],
    ]
    info_table = Table(quote_info, colWidths=[32 * mm, 58 * mm, 32 * mm, 58 * mm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), soft),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dbeafe")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6 * mm))

    customer_data = [
        [Paragraph("Bill To", card_title_style)],
        [Paragraph(
            "<b>{}</b><br/>{}<br/>{}<br/>{}<br/>{}<br/>{}".format(
                getattr(customer, "company_name", "Customer"),
                getattr(customer, "contact_person", ""),
                getattr(customer, "billing_address", None) or getattr(customer, "address", "-"),
                getattr(customer, "state", ""),
                f"Phone: {customer.phone}" if getattr(customer, "phone", None) else "",
                f"Email: {customer.email}" if getattr(customer, "email", None) else "",
            ).replace("<br/>{}", "<br/>") if False else "",
            normal_style,
        )],
    ]
    customer_text_lines = [f"<b>{getattr(customer, 'company_name', 'Customer')}</b>"]
    if getattr(customer, 'contact_person', None):
        customer_text_lines.append(f"Contact: {customer.contact_person}")
    customer_text_lines.append(getattr(customer, 'billing_address', None) or getattr(customer, 'address', '-'))
    if getattr(customer, 'state', None):
        customer_text_lines.append(customer.state)
    if getattr(customer, 'phone', None):
        customer_text_lines.append(f"Phone: {customer.phone}")
    if getattr(customer, 'email', None):
        customer_text_lines.append(f"Email: {customer.email}")
    if getattr(customer, 'gstin', None):
        customer_text_lines.append(f"GSTIN: {customer.gstin}")

    customer_table = Table([[Paragraph("BILL TO", card_title_style)], [Paragraph("<br/>".join(customer_text_lines), normal_style)]], colWidths=[180 * mm])
    customer_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, brand),
        ("BACKGROUND", (0, 0), (-1, 0), soft),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(customer_table)
    story.append(Spacer(1, 6 * mm))

    item_header = [Paragraph("#", header_style), Paragraph("Product", header_style), Paragraph("HSN/SAC", header_style), Paragraph("Qty", header_style), Paragraph("Rate", header_style), Paragraph("Disc.", header_style), Paragraph("GST", header_style), Paragraph("Amount", header_style)]
    item_rows = [item_header]
    for index, item in enumerate(quotation.items, start=1):
        product_text = f"<b>{item.product_name}</b>"
        if getattr(item, 'description', None):
            product_text += f"<br/><font size='7' color='#6b7280'>{item.description}</font>"
        item_rows.append([
            Paragraph(str(index), small_style),
            Paragraph(product_text, small_style),
            Paragraph(item.hsn_sac or "-", small_style),
            Paragraph(f"{item.quantity} {item.unit}", small_style),
            Paragraph(format_currency(item.unit_price), right_style),
            Paragraph(f"{item.discount_percent:.2f}%", right_style),
            Paragraph(f"{item.gst_rate:.2f}%", right_style),
            Paragraph(format_currency(item.total_amount), right_style),
        ])

    item_table = Table(item_rows, colWidths=[9 * mm, 55 * mm, 20 * mm, 20 * mm, 25 * mm, 18 * mm, 17 * mm, 26 * mm], repeatRows=1)
    item_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dbeafe")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fbff")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 5 * mm))

    totals = [
        ["", "Subtotal", format_currency(quotation.subtotal)],
        ["", "Discount", f"- {format_currency(quotation.discount_amount)}"],
        ["", "Taxable Amount", format_currency(quotation.taxable_amount)],
    ]
    if quotation.cgst_amount > 0:
        totals.append(["", "CGST", format_currency(quotation.cgst_amount)])
    if quotation.sgst_amount > 0:
        totals.append(["", "SGST", format_currency(quotation.sgst_amount)])
    if quotation.igst_amount > 0:
        totals.append(["", "IGST", format_currency(quotation.igst_amount)])
    totals.append(["", "<b>GRAND TOTAL</b>", f"<b>{format_currency(quotation.grand_total)}</b>"])
    totals_table = Table(totals, colWidths=[90 * mm, 45 * mm, 45 * mm])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("LINEABOVE", (1, -1), (-1, -1), 1.2, brand),
        ("TOPPADDING", (1, -1), (-1, -1), 8),
        ("BOTTOMPADDING", (1, -1), (-1, -1), 8),
    ]))
    story.append(totals_table)
    if quotation.notes:
        story.append(Spacer(1, 5 * mm))
        story.append(Table([[Paragraph("NOTES", card_title_style)], [Paragraph(quotation.notes.replace("\n", "<br/>"), small_style)]], colWidths=[180 * mm]))
    if quotation.terms_conditions:
        story.append(Spacer(1, 5 * mm))
        story.append(Table([[Paragraph("TERMS & CONDITIONS", card_title_style)], [Paragraph(quotation.terms_conditions.replace("\n", "<br/>"), small_style)]], colWidths=[180 * mm]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("This is a computer-generated quotation.", ParagraphStyle("Footer", parent=small_style, alignment=TA_CENTER, textColor=muted)))
    document.build(story)
    buffer.seek(0)
    return buffer


from types import SimpleNamespace


from types import SimpleNamespace


def generate_revision_pdf(revision, quotation, customer, company):
    """
    Generate a PDF using revision snapshots.

    For older revisions with missing snapshot fields, fall back
    to the original quotation, customer, and company records.
    """

    # Use the historical quotation details saved with this revision.
    revision_quotation = SimpleNamespace(
        quotation_number=(
            f"{revision.quotation_number} "
            f"/ REV-{revision.revision_number:02d}"
        ),
        quotation_date=(
            revision.quotation_date
            if revision.quotation_date is not None
            else quotation.quotation_date
        ),
        valid_until=(
            revision.valid_until
            if revision.valid_until is not None
            else quotation.valid_until
        ),
        status=revision.status,
        items=revision.items,
        subtotal=revision.subtotal,
        discount_amount=revision.discount_amount,
        taxable_amount=revision.taxable_amount,
        cgst_amount=revision.cgst_amount,
        sgst_amount=revision.sgst_amount,
        igst_amount=revision.igst_amount,
        grand_total=revision.grand_total,
        notes=revision.notes,
        terms_conditions=revision.terms_conditions,
    )

    # Use snapshot values when available; otherwise use live customer data.
    revision_customer = SimpleNamespace(
        company_name=(
            revision.customer_name
            if revision.customer_name is not None
            else customer.company_name
        ),
        contact_person=getattr(customer, "contact_person", None),
        address=(
            revision.customer_address
            if revision.customer_address is not None
            else (
                getattr(customer, "billing_address", None)
                or customer.address
            )
        ),
        billing_address=(
            revision.customer_address
            if revision.customer_address is not None
            else getattr(customer, "billing_address", None)
        ),
        email=(
            revision.customer_email
            if revision.customer_email is not None
            else customer.email
        ),
        phone=getattr(customer, "phone", None),
        gstin=(
            revision.customer_gst_number
            if revision.customer_gst_number is not None
            else customer.gstin
        ),
    )

    # Use snapshot values when available; otherwise use live company data.
    revision_company = SimpleNamespace(
        name=(
            revision.company_name
            if revision.company_name is not None
            else company.name
        ),
        address=(
            revision.company_address
            if revision.company_address is not None
            else company.address
        ),
        email=(
            revision.company_email
            if revision.company_email is not None
            else company.email
        ),
        phone=(
            revision.company_phone
            if revision.company_phone is not None
            else company.phone
        ),
        gstin=(
            revision.company_gst_number
            if revision.company_gst_number is not None
            else company.gstin
        ),
        website=getattr(company, "website", None),
        logo_path=getattr(company, "logo_path", None),
        state=getattr(company, "state", None),
    )

    return generate_quotation_pdf(
        revision_quotation,
        revision_customer,
        revision_company,
    )