from decimal import Decimal, ROUND_HALF_UP


MONEY = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return value.quantize(
        MONEY,
        rounding=ROUND_HALF_UP,
    )


def calculate_item(
    quantity: Decimal,
    unit_price: Decimal,
    discount_percent: Decimal,
    gst_rate: Decimal,
):
    gross_amount = quantity * unit_price

    discount_amount = (
        gross_amount
        * discount_percent
        / Decimal("100")
    )

    taxable_amount = (
        gross_amount - discount_amount
    )

    gst_amount = (
        taxable_amount
        * gst_rate
        / Decimal("100")
    )

    total_amount = (
        taxable_amount + gst_amount
    )

    return {
        "gross_amount": money(gross_amount),
        "discount_amount": money(discount_amount),
        "taxable_amount": money(taxable_amount),
        "gst_amount": money(gst_amount),
        "total_amount": money(total_amount),
    }


def calculate_quotation_totals(
    items,
    is_same_state: bool,
):
    subtotal = Decimal("0.00")
    discount_amount = Decimal("0.00")
    taxable_amount = Decimal("0.00")

    cgst_amount = Decimal("0.00")
    sgst_amount = Decimal("0.00")
    igst_amount = Decimal("0.00")

    for item in items:
        subtotal += item["gross_amount"]

        discount_amount += (
            item["discount_amount"]
        )

        taxable_amount += (
            item["taxable_amount"]
        )

        if is_same_state:
            cgst_amount += (
                item["gst_amount"] / Decimal("2")
            )

            sgst_amount += (
                item["gst_amount"] / Decimal("2")
            )

        else:
            igst_amount += item["gst_amount"]

    grand_total = (
        taxable_amount
        + cgst_amount
        + sgst_amount
        + igst_amount
    )

    return {
        "subtotal": money(subtotal),
        "discount_amount": money(discount_amount),
        "taxable_amount": money(taxable_amount),
        "cgst_amount": money(cgst_amount),
        "sgst_amount": money(sgst_amount),
        "igst_amount": money(igst_amount),
        "grand_total": money(grand_total),
    }