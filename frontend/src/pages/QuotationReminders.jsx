
import { useEffect, useState } from "react";
import api from "../services/api";
import "./QuotationReminders.css";

const STATUSES = ["ALL", "PENDING", "SENT", "FAILED"];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN");
}

export default function QuotationReminders() {
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
  });

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummary() {
    const response = await api.get(
      "/quotation-reminders/summary"
    );
    setSummary(response.data);
  }

  async function loadHistory() {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        page_size: 20,
      };

      if (status !== "ALL") params.status = status;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await api.get(
        "/quotation-reminders/history",
        { params }
      );

      setItems(response.data.items);
      setTotalPages(response.data.total_pages);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load quotation reminder history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary().catch(() => {
      setError("Unable to load reminder summary.");
    });
  }, []);

  useEffect(() => {
    loadHistory();
  }, [status, dateFrom, dateTo, page]);

  function resetFilters() {
    setStatus("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="reminders-page">
      <div className="reminders-heading">
        <div>
          <h1>Quotation Reminders</h1>
          <p>
            Monitor automated expiry reminders and quotation
            follow-ups.
          </p>
        </div>

        <button
          type="button"
          className="reminder-refresh"
          onClick={() => {
            loadSummary().catch(() => {
              setError("Unable to refresh reminder summary.");
            });
            loadHistory();
          }}
        >
          Refresh
        </button>
      </div>

      <div className="reminder-metrics">
        <Metric label="Total Reminders" value={summary.total} />
        <Metric label="Sent" value={summary.sent} />
        <Metric label="Pending" value={summary.pending} />
        <Metric label="Failed" value={summary.failed} />
      </div>

      <section className="reminder-panel">
        <h2>Reminder History</h2>

        <div className="reminder-filters">
          <label>
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "All statuses" : item}
                </option>
              ))}
            </select>
          </label>

          <label>
            From date
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label>
            To date
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <button
            type="button"
            className="reminder-reset"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>

        {error && (
          <div className="reminder-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="reminder-message">Loading reminders...</p>
        ) : items.length === 0 ? (
          <p className="reminder-message">
            No reminder records found.
          </p>
        ) : (
          <div className="reminder-table-wrapper">
            <table className="reminder-table">
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Error</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.quotation_number}</td>
                    <td>{item.recipient_email}</td>
                    <td>{item.subject}</td>
                    <td>
                      <span
                        className={`reminder-status status-${(
                          item.status || ""
                        ).toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{formatDate(item.sent_at)}</td>
                    <td className="reminder-error-cell">
                      {item.error_message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="reminder-pagination">
          <span>
            Page {page} of {Math.max(totalPages, 1)}
          </span>

          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="reminder-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}