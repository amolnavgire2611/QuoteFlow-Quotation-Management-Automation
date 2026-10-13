import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RevisionHistory from "../components/RevisionHistory";
import AuditTrail from "../components/AuditTrail";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  FileDown,
  Mail,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";

import api from "../services/api";
import { formatDate as formatCalendarDate } from "../utils/dates";


function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}


function formatDate(dateValue) {
  return formatCalendarDate(dateValue);
}


function getStatusClass(status) {
  switch (status) {
    case "DRAFT":
      return "status-badge status-draft";

    case "SENT":
      return "status-badge status-sent";

    case "ACCEPTED":
      return "status-badge status-accepted";

    case "REJECTED":
      return "status-badge status-rejected";

    case "EXPIRED":
      return "status-badge status-expired";

    case "CONVERTED":
      return "status-badge status-converted";

    default:
      return "status-badge";
  }
}


function getStatusIcon(status) {
  switch (status) {
    case "DRAFT":
      return <Clock size={14} />;

    case "SENT":
      return <Send size={14} />;

    case "ACCEPTED":
      return <CheckCircle size={14} />;

    case "REJECTED":
      return <XCircle size={14} />;

    case "EXPIRED":
      return <Clock size={14} />;

    case "CONVERTED":
      return <CheckCircle size={14} />;

    default:
      return null;
  }
}


// ============================================================
// MAIN COMPONENT
// ============================================================

function QuotationDetail() {
  const navigate = useNavigate();
  const { quotationId } = useParams();

  const [quotation, setQuotation] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [statusLoading, setStatusLoading] = useState(false);

  const [statusError, setStatusError] = useState("");

  const [pdfTemplate, setPdfTemplate] = useState("classic");

  const [availableTemplates, setAvailableTemplates] = useState([]);


  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const { data } = await api.get("/quotations/pdf/templates");
        setAvailableTemplates(data);
        if (data?.length && !data.some((item) => item.id === pdfTemplate)) {
          setPdfTemplate(data[0].id);
        }
      } catch {
        setAvailableTemplates([]);
      }
    };

    loadTemplates();
  }, []);


  // ============================================================
  // LOAD QUOTATION
  // ============================================================

  const loadQuotation = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/quotations/${quotationId}`
      );

      setQuotation(response.data);

    } catch (err) {
      console.error(
        "Failed to load quotation:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Failed to load quotation."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (quotationId) {
      loadQuotation();
    }
  }, [quotationId]);


  // ============================================================
  // GENERATE PDF
  // ============================================================

  const handleGeneratePdf = () => {
    if (!quotation?.id) {
      return;
    }

    const pdfUrl = new URL(`http://127.0.0.1:8000/quotations/${quotation.id}/pdf`);
    pdfUrl.searchParams.set("template", pdfTemplate);
    window.open(pdfUrl.toString(), "_blank");
  };

  const handlePreviewPdfSample = () => {
    const sampleUrl = new URL("http://127.0.0.1:8000/quotations/pdf/sample");
    sampleUrl.searchParams.set("template", pdfTemplate);
    window.open(sampleUrl.toString(), "_blank");
  };


  // ============================================================
  // STATUS CHANGE
  // ============================================================

  const handleStatusChange = async (newStatus) => {
    if (!quotation?.id) {
      return;
    }

    try {
      setStatusLoading(true);
      setStatusError("");

      const response = await api.patch(
        `/quotations/${quotation.id}/status`,
        {
          status: newStatus,
        }
      );

      setQuotation(response.data);

    } catch (err) {
      console.error(
        "Failed to update quotation status:",
        err
      );

      setStatusError(
        err.response?.data?.detail ||
          "Failed to update quotation status."
      );

    } finally {
      setStatusLoading(false);
    }
  };


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="quotation-detail-page">

        <div className="page-loading">

          <RefreshCw
            size={22}
            className="loading-spinner"
          />

          <span>
            Loading quotation...
          </span>

        </div>

      </div>
    );
  }


  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="quotation-detail-page">

        <div className="page-header">

          <div>

            <button
              type="button"
              className="back-button"
              onClick={() =>
                navigate("/quotations")
              }
            >
              <ArrowLeft size={17} />
              Back to Quotations
            </button>

            <h1>
              Quotation Details
            </h1>

          </div>

        </div>


        <div className="error-message">
          {error}
        </div>

      </div>
    );
  }


  // ============================================================
  // QUOTATION NOT FOUND
  // ============================================================

  if (!quotation) {
    return (
      <div className="quotation-detail-page">

        <div className="empty-state">

          <h2>
            Quotation not found
          </h2>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate("/quotations")
            }
          >
            <ArrowLeft size={17} />
            Back to Quotations
          </button>

        </div>

      </div>
    );
  }


  return (
    <QuotationDetailContent
      quotation={quotation}
      navigate={navigate}
      handleGeneratePdf={handleGeneratePdf}
      handleStatusChange={handleStatusChange}
      statusLoading={statusLoading}
      statusError={statusError}
    />
  );
}


// ============================================================
// DETAIL CONTENT COMPONENT
// ============================================================

function QuotationDetailContent({
  quotation,
  navigate,
  handleGeneratePdf,
  handleStatusChange,
  statusLoading,
  statusError,
}) {

  // ============================================================
  // CUSTOMER STATE
  // ============================================================

  const [customer, setCustomer] = useState(null);

  const [customerLoading, setCustomerLoading] = useState(true);


  // ============================================================
  // EMAIL STATE
  // ============================================================

  const [showEmailModal, setShowEmailModal] = useState(false);

  const [emailAddress, setEmailAddress] = useState("");

  const [emailSubject, setEmailSubject] = useState("");

  const [emailMessage, setEmailMessage] = useState("");

  const [emailSending, setEmailSending] = useState(false);

  const [emailError, setEmailError] = useState("");

  const [emailSuccess, setEmailSuccess] = useState("");


  // ============================================================
  // LOAD CUSTOMER
  // ============================================================

  useEffect(() => {

    const loadCustomer = async () => {

      try {

        setCustomerLoading(true);

        const response = await api.get(
          `/customers/${quotation.customer_id}`
        );

        setCustomer(response.data);

      } catch (err) {

        console.error(
          "Failed to load customer:",
          err
        );

        setCustomer(null);

      } finally {

        setCustomerLoading(false);

      }
    };


    if (quotation?.customer_id) {
      loadCustomer();
    }

  }, [quotation?.customer_id]);


  // ============================================================
  // PREPARE EMAIL CONTENT
  // ============================================================

  useEffect(() => {

    if (!customer || !quotation) {
      return;
    }


    setEmailAddress(
      customer.email || ""
    );


    setEmailSubject(
      `Quotation ${quotation.quotation_number}`
    );


    setEmailMessage(
      `Dear ${
        customer.contact_person ||
        customer.company_name ||
        ""
      },

Please find attached our quotation ${
        quotation.quotation_number
      }.

Quotation Date: ${
        formatDate(quotation.quotation_date)
      }

Valid Until: ${
        formatDate(quotation.valid_until)
      }

Grand Total: ${
        formatCurrency(quotation.grand_total)
      }

Please feel free to contact us if you have any questions.

Regards,
QuoteFlow`
    );

  }, [customer, quotation]);


  // ============================================================
  // SEND EMAIL
  // ============================================================

  const handleSendEmail = async () => {

    if (!emailAddress.trim()) {

      setEmailError(
        "Customer email address is required."
      );

      return;
    }


    try {

      setEmailSending(true);

      setEmailError("");

      setEmailSuccess("");


      const response = await api.post(
        `/quotations/${quotation.id}/send-email`,
        {
          recipient_email: emailAddress,
          subject: emailSubject,
          message: emailMessage,
        }
      );


      setEmailSuccess(
        response.data.message ||
          "Quotation email sent successfully."
      );


      setTimeout(() => {

        setShowEmailModal(false);

        setEmailSuccess("");

      }, 2000);


    } catch (err) {

      console.error(
        "Failed to send quotation email:",
        err
      );


      setEmailError(
        err.response?.data?.detail ||
          "Failed to send quotation email."
      );


    } finally {

      setEmailSending(false);

    }
  };


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="quotation-detail-page">


      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="page-header quotation-detail-header">

        <div>

          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate("/quotations")
            }
          >
            <ArrowLeft size={17} />
            Back to Quotations
          </button>


          <div className="quotation-title-row">

            <div>

              <h1>
                {quotation.quotation_number}
              </h1>

              <p>
                Quotation details and customer information
              </p>

            </div>


            <div
              className={getStatusClass(
                quotation.status
              )}
            >

              {getStatusIcon(
                quotation.status
              )}

              {quotation.status}

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          STATUS ERROR
      ====================================================== */}

      {statusError && (
        <div className="error-message">
          {statusError}
        </div>
      )}


      {/* ======================================================
          ACTION BUTTONS
      ====================================================== */}

      <div className="quotation-action-bar">

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <label htmlFor="quotation-pdf-template" style={{ fontWeight: 600 }}>Template</label>
          <select
            id="quotation-pdf-template"
            value={pdfTemplate}
            onChange={(event) => setPdfTemplate(event.target.value)}
            style={{ minWidth: "130px" }}
          >
            {availableTemplates.length > 0 ? (
              availableTemplates.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))
            ) : (
              <>
                <option value="classic">Classic</option>
                <option value="modern">Modern</option>
              </>
            )}
          </select>
          <button type="button" className="secondary-button" onClick={handlePreviewPdfSample}>
            <FileDown size={17} />
            Sample
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleGeneratePdf}
          >
            <FileDown size={17} />
            Generate PDF
          </button>
        </div>


        {quotation.status === "DRAFT" && (

          <button
            type="button"
            className="primary-button"
            disabled={statusLoading}
            onClick={() =>
              handleStatusChange("SENT")
            }
          >

            <Send size={17} />

            {statusLoading
              ? "Updating..."
              : "Mark as Sent"}

          </button>

        )}


        {quotation.status === "SENT" && (

          <>

            <button
              type="button"
              className="success-button"
              disabled={statusLoading}
              onClick={() =>
                handleStatusChange("ACCEPTED")
              }
            >

              <CheckCircle size={17} />

              {statusLoading
                ? "Updating..."
                : "Accept"}

            </button>


            <button
              type="button"
              className="danger-button"
              disabled={statusLoading}
              onClick={() =>
                handleStatusChange("REJECTED")
              }
            >

              <XCircle size={17} />

              {statusLoading
                ? "Updating..."
                : "Reject"}

            </button>


            <button
              type="button"
              className="warning-button"
              disabled={statusLoading}
              onClick={() =>
                handleStatusChange("EXPIRED")
              }
            >

              <Clock size={17} />

              {statusLoading
                ? "Updating..."
                : "Expire"}

            </button>

          </>

        )}


        {quotation.status === "ACCEPTED" && (

          <button
            type="button"
            className="success-button"
            disabled={statusLoading}
            onClick={() =>
              handleStatusChange("CONVERTED")
            }
          >

            <CheckCircle size={17} />

            {statusLoading
              ? "Updating..."
              : "Mark as Converted"}

          </button>

        )}

      </div>


      {/* ======================================================
          QUOTATION INFORMATION
      ====================================================== */}

      <section className="detail-card">

        <div className="detail-card-header">

          <div>

            <h2>
              Quotation Information
            </h2>

            <p>
              Basic quotation information.
            </p>

          </div>

        </div>


        <div className="detail-grid">


          <div className="detail-field">

            <span>
              Quotation Number
            </span>

            <strong>
              {quotation.quotation_number}
            </strong>

          </div>


          <div className="detail-field">

            <span>
              Status
            </span>

            <strong>

              <span
                className={getStatusClass(
                  quotation.status
                )}
              >

                {getStatusIcon(
                  quotation.status
                )}

                {quotation.status}

              </span>

            </strong>

          </div>


          <div className="detail-field">

            <span>
              Quotation Date
            </span>

            <strong>
              {formatDate(
                quotation.quotation_date
              )}
            </strong>

          </div>


          <div className="detail-field">

            <span>
              Valid Until
            </span>

            <strong>
              {formatDate(
                quotation.valid_until
              )}
            </strong>

          </div>


          <div className="detail-field">

            <span>
              Created
            </span>

            <strong>
              {formatDate(
                quotation.created_at
              )}
            </strong>

          </div>


          <div className="detail-field">

            <span>
              Last Updated
            </span>

            <strong>
              {formatDate(
                quotation.updated_at
              )}
            </strong>

          </div>


        </div>

      </section>


      {/* ======================================================
          CUSTOMER INFORMATION
      ====================================================== */}

      <section className="detail-card">

        <div className="detail-card-header">

          <div>

            <h2>
              Customer Information
            </h2>

            <p>
              Customer associated with this quotation.
            </p>

          </div>

        </div>


        {customerLoading ? (

          <div className="inline-loading">

            <RefreshCw
              size={18}
              className="loading-spinner"
            />

            Loading customer...

          </div>

        ) : customer ? (

          <div className="customer-detail-grid">


            <div className="customer-main">

              <h3>
                {customer.company_name}
              </h3>


              {customer.contact_person && (

                <p>

                  <strong>
                    Contact:
                  </strong>{" "}

                  {customer.contact_person}

                </p>

              )}


              {customer.email && (

                <p>

                  <strong>
                    Email:
                  </strong>{" "}

                  {customer.email}

                </p>

              )}


              {customer.phone && (

                <p>

                  <strong>
                    Phone:
                  </strong>{" "}

                  {customer.phone}

                </p>

              )}

            </div>


            <div className="customer-secondary">


              {customer.gstin && (

                <p>

                  <strong>
                    GSTIN:
                  </strong>{" "}

                  {customer.gstin}

                </p>

              )}


              {customer.pan && (

                <p>

                  <strong>
                    PAN:
                  </strong>{" "}

                  {customer.pan}

                </p>

              )}


              {customer.state && (

                <p>

                  <strong>
                    State:
                  </strong>{" "}

                  {customer.state}

                </p>

              )}


              {customer.country && (

                <p>

                  <strong>
                    Country:
                  </strong>{" "}

                  {customer.country}

                </p>

              )}

            </div>


            <div className="customer-address">

              <strong>
                Billing Address
              </strong>

              <p>
                {customer.billing_address ||
                  customer.address ||
                  "-"}
              </p>

            </div>


            <div className="customer-address">

              <strong>
                Shipping Address
              </strong>

              <p>
                {customer.shipping_address ||
                  customer.address ||
                  "-"}
              </p>

            </div>


          </div>

        ) : (

          <div className="empty-inline">
            Customer information unavailable.
          </div>

        )}

      </section>


      {/* ======================================================
          QUOTATION ITEMS
      ====================================================== */}

      <section className="detail-card">

        <div className="detail-card-header">

          <div>

            <h2>
              Quotation Items
            </h2>

            <p>
              Products and services included in this quotation.
            </p>

          </div>


          <div className="item-count">

            {quotation.items?.length || 0}{" "}

            {quotation.items?.length === 1
              ? "Item"
              : "Items"}

          </div>

        </div>


        <div className="quotation-items-wrapper">

          <table className="quotation-detail-table">

            <thead>

              <tr>

                <th>
                  #
                </th>

                <th>
                  Product
                </th>

                <th>
                  HSN/SAC
                </th>

                <th>
                  Qty
                </th>

                <th>
                  Unit
                </th>

                <th>
                  Unit Price
                </th>

                <th>
                  Discount
                </th>

                <th>
                  GST
                </th>

                <th>
                  Total
                </th>

              </tr>

            </thead>


            <tbody>

              {quotation.items?.map(
                (item, index) => (

                  <tr key={item.id}>

                    <td>
                      {index + 1}
                    </td>


                    <td>

                      <div className="quotation-product">

                        <strong>
                          {item.product_name}
                        </strong>


                        {item.product_code && (

                          <span>
                            {item.product_code}
                          </span>

                        )}


                        {item.description && (

                          <small>
                            {item.description}
                          </small>

                        )}

                      </div>

                    </td>


                    <td>
                      {item.hsn_sac || "-"}
                    </td>


                    <td>
                      {item.quantity}
                    </td>


                    <td>
                      {item.unit}
                    </td>


                    <td className="text-right">

                      {formatCurrency(
                        item.unit_price
                      )}

                    </td>


                    <td className="text-right">

                      {Number(
                        item.discount_percent
                      ).toFixed(2)}
                      %

                      <small className="discount-amount">

                        -
                        {formatCurrency(
                          item.discount_amount
                        )}

                      </small>

                    </td>


                    <td className="text-right">

                      {Number(
                        item.gst_rate
                      ).toFixed(2)}
                      %

                      <small className="gst-amount">

                        {formatCurrency(
                          item.gst_amount
                        )}

                      </small>

                    </td>


                    <td className="text-right total-cell">

                      {formatCurrency(
                        item.total_amount
                      )}

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <section className="detail-card">

        <div className="detail-card-header">

          <div>

            <h2>
              Quotation Summary
            </h2>

            <p>
              Final amounts calculated by the backend.
            </p>

          </div>

        </div>


        <div className="quotation-summary">

          <div className="summary-spacer" />


          <div className="summary-values">


            <div className="summary-row">

              <span>
                Subtotal
              </span>

              <strong>
                {formatCurrency(
                  quotation.subtotal
                )}
              </strong>

            </div>


            <div className="summary-row discount-row">

              <span>
                Total Discount
              </span>

              <strong>
                -{" "}
                {formatCurrency(
                  quotation.discount_amount
                )}
              </strong>

            </div>


            <div className="summary-row">

              <span>
                Taxable Amount
              </span>

              <strong>
                {formatCurrency(
                  quotation.taxable_amount
                )}
              </strong>

            </div>


            {Number(
              quotation.cgst_amount
            ) > 0 && (

              <div className="summary-row">

                <span>
                  CGST
                </span>

                <strong>
                  {formatCurrency(
                    quotation.cgst_amount
                  )}
                </strong>

              </div>

            )}


            {Number(
              quotation.sgst_amount
            ) > 0 && (

              <div className="summary-row">

                <span>
                  SGST
                </span>

                <strong>
                  {formatCurrency(
                    quotation.sgst_amount
                  )}
                </strong>

              </div>

            )}


            {Number(
              quotation.igst_amount
            ) > 0 && (

              <div className="summary-row">

                <span>
                  IGST
                </span>

                <strong>
                  {formatCurrency(
                    quotation.igst_amount
                  )}
                </strong>

              </div>

            )}


            <div className="summary-grand-total">

              <span>
                Grand Total
              </span>

              <strong>
                {formatCurrency(
                  quotation.grand_total
                )}
              </strong>

            </div>


          </div>

        </div>

      </section>


      {/* ======================================================
          NOTES AND TERMS
      ====================================================== */}

      {(quotation.notes ||
        quotation.terms_conditions) && (

        <section className="detail-card">

          <div className="detail-card-header">

            <div>

              <h2>
                Additional Information
              </h2>

              <p>
                Notes and commercial terms.
              </p>

            </div>

          </div>


          <div className="additional-information-grid">


            {quotation.notes && (

              <div className="information-box">

                <h3>
                  Notes
                </h3>

                <p className="preserve-lines">
                  {quotation.notes}
                </p>

              </div>

            )}


            {quotation.terms_conditions && (

              <div className="information-box">

                <h3>
                  Terms & Conditions
                </h3>

                <p className="preserve-lines">
                  {quotation.terms_conditions}
                </p>

              </div>

            )}


          </div>

        </section>

      )}


      {/* ======================================================
          BOTTOM ACTIONS
      ====================================================== */}

      <div className="quotation-bottom-actions">


        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            navigate("/quotations")
          }
        >

          <ArrowLeft size={17} />

          Back to Quotations

        </button>


        <button
          type="button"
          className="secondary-button"
          onClick={handleGeneratePdf}
        >

          <Download size={17} />

          Generate PDF

        </button>


        <button
          type="button"
          className="primary-button"
          onClick={() => {

            setEmailError("");

            setEmailSuccess("");

            setShowEmailModal(true);

          }}
        >

          <Mail size={17} />

          Send Quotation

        </button>


      </div>


      {/* ======================================================
          SEND QUOTATION EMAIL MODAL
      ====================================================== */}

      {showEmailModal && (

        <div className="modal-overlay">

          <div className="modal email-modal">


            {/* MODAL HEADER */}

            <div className="modal-header">

              <h2>
                Send Quotation
              </h2>


              <button
                type="button"
                className="icon-button"
                onClick={() =>
                  setShowEmailModal(false)
                }
              >
                ×
              </button>

            </div>


            {/* MODAL BODY */}

            <div className="modal-body">


              {emailError && (

                <div className="error-message">

                  {emailError}

                </div>

              )}


              {emailSuccess && (

                <div className="success-message">

                  {emailSuccess}

                </div>

              )}


              {/* RECIPIENT */}

              <div className="form-group">

                <label>
                  To
                </label>

                <input
                  type="email"
                  value={emailAddress}
                  onChange={(event) =>
                    setEmailAddress(
                      event.target.value
                    )
                  }
                  placeholder="customer@example.com"
                />

              </div>


              {/* SUBJECT */}

              <div className="form-group">

                <label>
                  Subject
                </label>

                <input
                  type="text"
                  value={emailSubject}
                  onChange={(event) =>
                    setEmailSubject(
                      event.target.value
                    )
                  }
                />

              </div>


              {/* MESSAGE */}

              <div className="form-group">

                <label>
                  Message
                </label>

                <textarea
                  rows="10"
                  value={emailMessage}
                  onChange={(event) =>
                    setEmailMessage(
                      event.target.value
                    )
                  }
                />

              </div>


              {/* PDF ATTACHMENT INFORMATION */}

              <div className="email-attachment-info">

                <FileDown size={17} />

                <span>
                  Quotation PDF will be attached automatically.
                </span>

              </div>


              {/* MODAL FOOTER */}

              <div className="modal-footer">


                <button
                  type="button"
                  className="secondary-button"
                  disabled={emailSending}
                  onClick={() =>
                    setShowEmailModal(false)
                  }
                >

                  Cancel

                </button>


                <button
                  type="button"
                  className="primary-button"
                  disabled={emailSending}
                  onClick={handleSendEmail}
                >

                  <Mail size={17} />

                  {emailSending
                    ? "Sending..."
                    : "Send Email"}

                </button>


              </div>


            </div>

          </div>

        </div>

      )}

      <RevisionHistory
      quotationId={quotation.id}
    />
    <AuditTrail
  quotationId={quotation.id}
/>


    </div>
  );
}


export default QuotationDetail;