import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  FileText,
  Calculator,
  Save,
  RotateCcw,
} from "lucide-react";

import api from "../services/api";

function Quotations() {
  const today = new Date().toISOString().split("T")[0];

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createdQuotation, setCreatedQuotation] = useState(null);

  const [form, setForm] = useState({
    customer_id: "",
    quotation_date: today,
    valid_until: "",
    notes: "",
    terms_conditions:
      "1. Payment terms as mutually agreed.\n2. Prices are subject to applicable taxes.\n3. Quotation is valid until the mentioned date.",
  });

  const [items, setItems] = useState([
    {
      product_id: "",
      quantity: 1,
      discount_percent: 0,
    },
  ]);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      setError("");

      const [customersResponse, productsResponse] =
        await Promise.all([
          api.get("/customers"),
          api.get("/products"),
        ]);

      setCustomers(customersResponse.data);
      setProducts(productsResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load customers and products."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      {
        product_id: "",
        quantity: 1,
        discount_percent: 0,
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) {
      return;
    }

    setItems((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const getProduct = (productId) => {
    return products.find(
      (product) => product.id === Number(productId)
    );
  };

  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const product = getProduct(item.product_id);

      if (!product) {
        return {
          ...item,
          product: null,
          gross: 0,
          discount: 0,
          taxable: 0,
          gst: 0,
          total: 0,
        };
      }

      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(product.price) || 0;
      const discountPercent =
        Number(item.discount_percent) || 0;
      const gstRate = Number(product.gst_rate) || 0;

      const gross = quantity * unitPrice;

      const discount =
        gross * (discountPercent / 100);

      const taxable = gross - discount;

      const gst =
        taxable * (gstRate / 100);

      const total = taxable + gst;

      return {
        ...item,
        product,
        gross,
        discount,
        taxable,
        gst,
        total,
      };
    });
  }, [items, products]);

  const totals = useMemo(() => {
    const subtotal = calculatedItems.reduce(
      (sum, item) => sum + item.gross,
      0
    );

    const discount = calculatedItems.reduce(
      (sum, item) => sum + item.discount,
      0
    );

    const taxable = calculatedItems.reduce(
      (sum, item) => sum + item.taxable,
      0
    );

    const gst = calculatedItems.reduce(
      (sum, item) => sum + item.gst,
      0
    );

    return {
      subtotal,
      discount,
      taxable,
      gst,
      grandTotal: taxable + gst,
    };
  }, [calculatedItems]);

  const selectedCustomer = customers.find(
    (customer) =>
      customer.id === Number(form.customer_id)
  );

  const handleReset = () => {
    setForm({
      customer_id: "",
      quotation_date: today,
      valid_until: "",
      notes: "",
      terms_conditions:
        "1. Payment terms as mutually agreed.\n2. Prices are subject to applicable taxes.\n3. Quotation is valid until the mentioned date.",
    });

    setItems([
      {
        product_id: "",
        quantity: 1,
        discount_percent: 0,
      },
    ]);

    setError("");
    setSuccess("");
    setCreatedQuotation(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setCreatedQuotation(null);

    if (!form.customer_id) {
      setError("Please select a customer.");
      return;
    }

    if (!form.quotation_date) {
      setError("Please select quotation date.");
      return;
    }

    if (!form.valid_until) {
      setError("Please select quotation validity date.");
      return;
    }

    if (form.valid_until < form.quotation_date) {
      setError(
        "Valid-until date cannot be before quotation date."
      );
      return;
    }

    const invalidItem = items.some(
      (item) =>
        !item.product_id ||
        Number(item.quantity) <= 0
    );

    if (invalidItem) {
      setError(
        "Please select a product and enter a valid quantity for every item."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        customer_id: Number(form.customer_id),
        quotation_date: form.quotation_date,
        valid_until: form.valid_until,

        items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          discount_percent: Number(
            item.discount_percent
          ),
        })),

        notes: form.notes || null,
        terms_conditions:
          form.terms_conditions || null,
      };

      const response = await api.post(
        "/quotations",
        payload
      );

      setCreatedQuotation(response.data);

      setSuccess(
        `Quotation ${response.data.quotation_number} created successfully.`
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to create quotation."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        Loading quotation data...
      </div>
    );
  }

  return (
    <div className="quotation-page">

      {/* Page Header */}
<div className="page-header">
  <div>
    <h1>Create Quotation</h1>
    <p>
      Prepare a professional quotation for your customer.
    </p>
  </div>
</div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {createdQuotation && (
        <div className="quotation-success-card">
          <div className="success-icon">
            <FileText size={24} />
          </div>

          <div>
            <strong>
              {createdQuotation.quotation_number}
            </strong>

            <p>
              Draft quotation created successfully.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* Basic Information */}
        <section className="quotation-card quotation-info-card">

          <div className="quotation-card-header">
            <div>
              <h2>Quotation Information</h2>
              <p>
                Select customer and quotation dates.
              </p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>
                Customer <span>*</span>
              </label>

              <select
                name="customer_id"
                value={form.customer_id}
                onChange={handleFormChange}
              >
                <option value="">
                  Select customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Quotation Date <span>*</span>
              </label>

              <input
                type="date"
                name="quotation_date"
                value={form.quotation_date}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group">
              <label>
                Valid Until <span>*</span>
              </label>

              <input
                type="date"
                name="valid_until"
                value={form.valid_until}
                onChange={handleFormChange}
              />
            </div>

          </div>

          {selectedCustomer && (
            <div className="customer-preview">

              <div>
                <strong>
                  {selectedCustomer.company_name}
                </strong>

                <span>
                  {selectedCustomer.contact_person ||
                    "No contact person"}
                </span>
              </div>

              <div>
                <span>
                  {selectedCustomer.email ||
                    "No email"}
                </span>

                <span>
                  {selectedCustomer.phone ||
                    "No phone"}
                </span>
              </div>

              <div>
                <span>
                  State:{" "}
                  {selectedCustomer.state ||
                    "Not specified"}
                </span>

                <span>
                  GSTIN:{" "}
                  {selectedCustomer.gstin ||
                    "Not specified"}
                </span>
              </div>

            </div>
          )}

        </section>

        {/* Quotation Items */}
        <section className="quotation-card">

          <div className="quotation-card-header">

            <div>
              <h2>Quotation Items</h2>
              <p>
                Add products or services to this quotation.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={addItem}
            >
              <Plus size={17} />
              Add Item
            </button>

          </div>

          <div className="quotation-items-table-wrapper">

            <table className="quotation-items-table">

              <thead>
                <tr>
                  <th>#</th>
                  <th>Product / Service</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount %</th>
                  <th>GST %</th>
                  <th>Taxable</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>

                {calculatedItems.map(
                  (item, index) => (
                    <tr key={index}>

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <select
                          value={item.product_id}
                          onChange={(event) =>
                            handleItemChange(
                              index,
                              "product_id",
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            Select product
                          </option>

                          {products.map(
                            (product) => (
                              <option
                                key={product.id}
                                value={product.id}
                              >
                                {product.product_code} -
                                {" "}
                                {product.name}
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.quantity}
                          onChange={(event) =>
                            handleItemChange(
                              index,
                              "quantity",
                              event.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        ₹{" "}
                        {item.product
                          ? Number(
                              item.product.price
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                              }
                            )
                          : "0.00"}
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={
                            item.discount_percent
                          }
                          onChange={(event) =>
                            handleItemChange(
                              index,
                              "discount_percent",
                              event.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        {item.product
                          ? `${item.product.gst_rate}%`
                          : "-"}
                      </td>

                      <td>
                        ₹{" "}
                        {item.taxable.toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td>
                        <strong>
                          ₹{" "}
                          {item.total.toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="danger-icon-button"
                          onClick={() =>
                            removeItem(index)
                          }
                          disabled={
                            items.length === 1
                          }
                          title="Remove item"
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* Totals */}
        <section className="quotation-card">

          <div className="quotation-card-header">

            <div>
              <h2>Quotation Summary</h2>
              <p>
                Calculated automatically from quotation
                items.
              </p>
            </div>

            <Calculator size={22} />

          </div>

          <div className="quotation-summary">

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>
                ₹{" "}
                {totals.subtotal.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>

            <div className="summary-row discount-row">
              <span>Total Discount</span>
              <strong>
                - ₹{" "}
                {totals.discount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>

            <div className="summary-row">
              <span>Taxable Amount</span>
              <strong>
                ₹{" "}
                {totals.taxable.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>

            {selectedCustomer && (
              <>
                <div className="summary-row">
                  <span>CGST</span>
                  <strong>
                    ₹{" "}
                    {(
                      totals.gst / 2
                    ).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>SGST</span>
                  <strong>
                    ₹{" "}
                    {(
                      totals.gst / 2
                    ).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>
              </>
            )}

            <div className="summary-row grand-total-row">
              <span>Grand Total</span>

              <strong>
                ₹{" "}
                {totals.grandTotal.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>

          </div>

        </section>

        {/* Notes */}
<section className="quotation-card additional-info-card">

  <div className="additional-info-header">
    <div>
      <h2>Additional Information</h2>
      <p>Add notes and commercial terms.</p>
    </div>
  </div>

  <div className="additional-info-body">

    <div className="additional-info-field">
      <label>Notes</label>

      <textarea
        name="notes"
        value={form.notes}
        onChange={handleFormChange}
        rows="5"
        placeholder="Additional notes for the customer..."
      />
    </div>

    <div className="additional-info-field">
      <label>Terms &amp; Conditions</label>

      <textarea
        name="terms_conditions"
        value={form.terms_conditions}
        onChange={handleFormChange}
        rows="5"
      />
    </div>

  </div>

</section>

        {/* Submit */}
        <div className="quotation-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
          >
            <RotateCcw size={17} />
            Reset
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            <Save size={17} />

            {saving
              ? "Creating..."
              : "Create Quotation"}
          </button>

        </div>

      </form>
    </div>
  );
}

export default Quotations;
