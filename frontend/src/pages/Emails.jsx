import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { formatDateTime } from "../utils/dates";

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "sent") return "sent";
  if (normalized === "failed") return "failed";
  return "pending";
}

function getErrorMessage(error) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(" ");
  }

  return detail || "Unable to load email history.";
}

export default function Emails() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadEmails() {
      setLoading(true);
      setError("");

      try {
        const quotationsResponse = await api.get("/quotations");
        const quotations = Array.isArray(quotationsResponse.data)
          ? quotationsResponse.data
          : [];

        const emailHistory = await Promise.all(
          quotations.map(async (quotation) => {
            const response = await api.get(`/quotation-emails/${quotation.id}`);
            const history = Array.isArray(response.data?.emails)
              ? response.data.emails
              : [];

            return history.map((email) => ({
              ...email,
              quotation_id: quotation.id,
              quotation_number: response.data.quotation_number,
            }));
          })
        );

        const flattened = emailHistory
          .flat()
          .sort((a, b) => {
            const left = new Date(a.sent_at || a.created_at || 0).getTime();
            const right = new Date(b.sent_at || b.created_at || 0).getTime();
            return right - left;
          });

        if (isActive) {
          setEmails(flattened);
        }
      } catch (err) {
        if (isActive) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadEmails();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="email-page">
      <div className="page-title">
        <div>
          <h2>Email Activity</h2>
          <p>Recent quotation email delivery history</p>
        </div>
      </div>

      <div className="email-summary">
        <div>
          <span>Total Emails</span>
          <strong>{emails.length}</strong>
        </div>

        <div>
          <span>Latest Email</span>
          <strong>{emails[0] ? emails[0].quotation_number : "—"}</strong>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Loading email history...</span>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : null}

      {!loading && !error && (
        <div className="table-card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {emails.length > 0 ? (
                  emails.map((email) => (
                    <tr key={`${email.quotation_id}-${email.id}`}>
                      <td>
                        <Link to={`/quotations/${email.quotation_id}`}>
                          {email.quotation_number}
                        </Link>
                      </td>
                      <td>{email.recipient_email}</td>
                      <td>{email.subject}</td>
                      <td>
                        <span className={`email-status-badge ${getStatusClass(email.status)}`}>
                          {email.status || "Pending"}
                        </span>
                      </td>
                      <td>{formatDateTime(email.sent_at || email.created_at)}</td>
                      <td>
                        {email.error_message ? (
                          <span title={email.error_message}>View issue</span>
                        ) : (
                          "Sent"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        <div className="empty-icon">✉️</div>
                        <h3>No email history yet</h3>
                        <p>Quotation emails will appear here once sent.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
