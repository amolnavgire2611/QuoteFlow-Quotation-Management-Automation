import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { downloadRevisionPdf } from "../services/api";
import {
  getQuotationRevisions,
  getProducts,
  updateQuotationRevision,
  updateRevisionStatus,
} from "../services/api";

const RevisionEditor = () => {
  const { quotationId, revisionNumber } = useParams();
  const navigate = useNavigate();

  const [revision, setRevision] = useState(null);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);

  const [notes, setNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadRevision();
    loadProducts();
  }, [quotationId, revisionNumber]);

  const loadRevision = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getQuotationRevisions(quotationId);

      const selectedRevision = data.revisions.find(
        (item) =>
          item.revision_number === Number(revisionNumber)
      );

      if (!selectedRevision) {
        setError("Revision not found.");
        return;
      }

      setRevision(selectedRevision);
      setItems(selectedRevision.items || []);
      setNotes(selectedRevision.notes || "");
      setTermsConditions(
        selectedRevision.terms_conditions || ""
      );
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Failed to load revision."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts();

      setProducts(
        Array.isArray(data)
          ? data
          : data.products || []
      );
    } catch (err) {
      console.error(err);
    }
  };

  const addProduct = (event) => {
    const productId = Number(event.target.value);

    if (!productId) {
      return;
    }

    const product = products.find(
      (item) => item.id === productId
    );

    if (!product) {
      return;
    }

    const alreadyExists = items.some(
      (item) => item.product_id === productId
    );

    if (alreadyExists) {
      setError("This product is already added.");
      event.target.value = "";
      return;
    }

    const newItem = {
      product_id: product.id,
      product_code: product.product_code,
      product_name: product.name,
      description: product.description,
      hsn_sac: product.hsn_sac,
      unit: product.unit,
      quantity: 1,
      unit_price: Number(product.price),
      discount_percent: 0,
      gst_rate: Number(product.gst_rate),
    };

    setItems((previousItems) => [
      ...previousItems,
      newItem,
    ]);

    setError("");
    event.target.value = "";
  };

  const updateItem = (index, field, value) => {
    setItems((previousItems) =>
      previousItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const removeItem = (index) => {
    setItems((previousItems) =>
      previousItems.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  };

  const calculateItem = (item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const discountPercent =
      Number(item.discount_percent) || 0;
    const gstRate = Number(item.gst_rate) || 0;

    const grossAmount =
      quantity * unitPrice;

    const discountAmount =
      grossAmount * discountPercent / 100;

    const taxableAmount =
      grossAmount - discountAmount;

    const gstAmount =
      taxableAmount * gstRate / 100;

    const totalAmount =
      taxableAmount + gstAmount;

    return {
      grossAmount,
      discountAmount,
      taxableAmount,
      gstAmount,
      totalAmount,
    };
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let gstAmount = 0;

    items.forEach((item) => {
      const calculated = calculateItem(item);

      subtotal += calculated.grossAmount;
      discountAmount += calculated.discountAmount;
      taxableAmount += calculated.taxableAmount;
      gstAmount += calculated.gstAmount;
    });

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      gstAmount,
      grandTotal: taxableAmount + gstAmount,
    };
  };


const handleDownloadPdf = async () => {
  try {
    const pdfBlob = await downloadRevisionPdf(
      quotationId,
      revisionNumber
    );

    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `quotation-${quotationId}-REV-${String(
      revisionNumber
    ).padStart(2, "0")}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download revision PDF:", error);
    alert("Unable to download the revision PDF. Please try again.");
  }
};

  const saveRevision = async () => {
    if (items.length === 0) {
      setError(
        "Add at least one product before saving."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          discount_percent:
            Number(item.discount_percent) || 0,
        })),

        notes: notes || null,

        terms_conditions:
          termsConditions || null,
      };

      await updateQuotationRevision(
        quotationId,
        revisionNumber,
        payload
      );

      setSuccess(
        "Revision saved successfully."
      );

      await loadRevision();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Failed to save revision."
      );
    } finally {
      setSaving(false);
    }
  };
  const changeRevisionStatus = async (newStatus) => {
  try {
    setSaving(true);
    setError("");
    setSuccess("");

    await updateRevisionStatus(
      quotationId,
      revisionNumber,
      newStatus
    );

    setSuccess(
      `Revision status changed to ${newStatus}.`
    );

    await loadRevision();
  } catch (err) {
    console.error(err);

    setError(
      err.response?.data?.detail ||
      "Failed to update revision status."
    );
  } finally {
    setSaving(false);
  }
};

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="page-container revision-editor-page">
        <h2>Loading revision...</h2>
      </div>
    );
  }

  if (error && !revision) {
    return (
      <div className="page-container revision-editor-page">
        <h2>{error}</h2>

        <button
          onClick={() =>
            navigate(`/quotations/${quotationId}`)
          }
        >
          Back to Quotation
        </button>
      </div>
    );
  }

  if (!revision) {
    return null;
  }

  const totals = calculateTotals();

  const isEditable =
    revision.status === "DRAFT";

  return (
    <div className="page-container revision-editor-page">

      {/* Header */}

      <div className="page-header revision-editor-header">
        <div>
          <h1>
            Edit Revision #{revision.revision_number}
          </h1>

          <p>
            Quotation:{" "}
            <strong>
              {revision.quotation_number}
            </strong>
          </p>
        </div>

    <div className="revision-status-container">
  <span className="revision-status-label">
    Status
  </span>

  <span
    className={`revision-status-badge revision-status-${revision.status.toLowerCase()}`}
  >
    {revision.status}
  </span>
</div>
      </div>

      {/* Messages */}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {/* Product Section */}

      <div className="card revision-card">

        <div className="card-header revision-card-header">
          <h2>Products</h2>

          {isEditable && (
           <select
  className="revision-product-select"
  defaultValue=""
  onChange={addProduct}
>
              <option value="">
                + Add Product
              </option>

              {products
                .filter(
                  (product) => product.is_active
                )
                .map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.product_code} -{" "}
                    {product.name}
                  </option>
                ))}
            </select>
          )}
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            No products added.
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="revision-items-table">

              <thead>
                <tr>
                  <th>Product</th>
                  <th>HSN/SAC</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Discount %</th>
                  <th>GST %</th>
                  <th>Total</th>
                  {isEditable && (
                    <th>Action</th>
                  )}
                </tr>
              </thead>

              <tbody>

                {items.map((item, index) => {

                  const calculated =
                    calculateItem(item);

                  return (
                    <tr key={index}>

                      <td>
                        <strong>
                          {item.product_name}
                        </strong>

                        <br />

                        <small>
                          {item.product_code}
                        </small>
                      </td>

                      <td>
                        {item.hsn_sac || "-"}
                      </td>

                      <td>
                        {isEditable ? (
                          <input
                          className="revision-number-input"
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(
                                index,
                                "quantity",
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>

                      <td>
                        {item.unit}
                      </td>

                      <td>
                        {formatCurrency(
                          item.unit_price
                        )}
                      </td>

                      <td>
                        {isEditable ? (
                          <input
                          className="revision-number-input"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              item.discount_percent
                            }
                            onChange={(event) =>
                              updateItem(
                                index,
                                "discount_percent",
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          `${item.discount_percent}%`
                        )}
                      </td>

                      <td>
                        {item.gst_rate}%
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            calculated.totalAmount
                          )}
                        </strong>
                      </td>

                      {isEditable && (
                        <td>
                        <button
  type="button"
  className="revision-remove-button"
  onClick={() =>
    removeItem(index)
  }
>
  Remove
</button>
                        </td>
                      )}

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* Totals */}

     <div className="card revision-card revision-summary-card">

        <h2>Quotation Summary</h2>

        <div className="revision-total-row">
          <span>Subtotal</span>
          <strong>
            {formatCurrency(
              totals.subtotal
            )}
          </strong>
        </div>

        <div className="revision-total-row">
          <span>Discount</span>
          <strong>
            {formatCurrency(
              totals.discountAmount
            )}
          </strong>
        </div>

        <div className="revision-total-row">
          <span>Taxable Amount</span>
          <strong>
            {formatCurrency(
              totals.taxableAmount
            )}
          </strong>
        </div>

        <div className="revision-total-row">
          <span>GST</span>
          <strong>
            {formatCurrency(
              totals.gstAmount
            )}
          </strong>
        </div>

       <div className="revision-total-row revision-grand-total">
          <span>Grand Total</span>
          <strong>
            {formatCurrency(
              totals.grandTotal
            )}
          </strong>
        </div>

      </div>

      {/* Notes */}

      <div className="card revision-card revision-information-card">

        <div className="revision-section-title">
  <h2>Notes</h2>
  <p>Add any additional information for this quotation.</p>
</div>
        <textarea
        className="revision-textarea"
          rows="4"
          value={notes}
          disabled={!isEditable}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          placeholder="Enter quotation notes..."
        />

      </div>

      {/* Terms */}

      <div className="card revision-card revision-information-card">

        <div className="revision-section-title">
  <h2>Terms & Conditions</h2>
  <p>Define the commercial terms applicable to this quotation.</p>
</div>

        <textarea
        className="revision-textarea"
          rows="6"
          value={termsConditions}
          disabled={!isEditable}
          onChange={(event) =>
            setTermsConditions(
              event.target.value
            )
          }
          placeholder="Enter terms and conditions..."
        />

      </div>

      {/* Actions */}

  <div className="revision-action-bar">

<button
  type="button"
  className="secondary-button"
  onClick={() =>
    navigate(
      `/quotations/${quotationId}`
    )
  }
>
  Back to Quotation
</button>

  {revision.status === "DRAFT" && (
    <>
     <button
  type="button"
  className="primary-button"
  onClick={saveRevision}
  disabled={saving}
>
        {saving
          ? "Saving..."
          : "Save Revision"}
      </button>
    
    <button
  type="button"
  className="primary-button"
  onClick={handleDownloadPdf}
>
  Download Revision PDF
</button>

   <button
  type="button"
  className="success-button"
  onClick={() =>
    changeRevisionStatus("FINALIZED")
  }
  disabled={saving || items.length === 0}
>
        Finalize Revision
      </button>
    </>
  )}

  {revision.status === "FINALIZED" && (
 <button
  type="button"
  className="primary-button"
  onClick={() =>
    changeRevisionStatus("SENT")
  }
  disabled={saving}
>
  Mark as Sent
</button>
  )}

  {revision.status === "SENT" && (
    <>
    <button
  type="button"
  className="success-button"
  onClick={() =>
    changeRevisionStatus("ACCEPTED")
  }
  disabled={saving}
>
  Mark as Accepted
</button>

 <button
  type="button"
  className="danger-button"
  onClick={() =>
    changeRevisionStatus("REJECTED")
  }
  disabled={saving}
>
  Mark as Rejected
</button>
    </>
  )}

</div>

    </div>
  );
};

export default RevisionEditor;