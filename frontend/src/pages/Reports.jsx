
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import "./Reports.css";

const initialFilters = {
  date_from: "",
  date_to: "",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN");
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeCsv = (value) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const content = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(" ");
  }

  return detail || "Unable to load reports. Please try again.";
}

export default function Reports() {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadReports = useCallback(async (activeFilters) => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (activeFilters.date_from) {
        params.date_from = activeFilters.date_from;
      }

      if (activeFilters.date_to) {
        params.date_to = activeFilters.date_to;
      }

      const response = await api.get("/reports/summary", { params });
      setReport(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(initialFilters);
  }, [loadReports]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();

    if (
      filters.date_from &&
      filters.date_to &&
      filters.date_from > filters.date_to
    ) {
      setError("Start date cannot be after end date.");
      return;
    }

    loadReports(filters);
  }

  function handleClearFilters() {
    setFilters(initialFilters);
    loadReports(initialFilters);
  }

  function handleExportQuotations() {
    if (!report?.quotations?.length) return;

    setExporting(true);

    try {
      const rows = report.quotations.map((quotation) => ({
        quotation_number: quotation.quotation_number,
        customer_name: quotation.customer_name,
        quotation_date: quotation.quotation_date,
        valid_until: quotation.valid_until,
        status: quotation.status,
        subtotal: quotation.subtotal,
        discount_amount: quotation.discount_amount,
        taxable_amount: quotation.taxable_amount,
        cgst_amount: quotation.cgst_amount,
        sgst_amount: quotation.sgst_amount,
        igst_amount: quotation.igst_amount,
        grand_total: quotation.grand_total,
      }));

      downloadCsv("quotation-report.csv", rows);
    } finally {
      setExporting(false);
    }
  }

  function handleExportCustomers() {
    if (!report?.customer_summary?.length) return;

    const rows = report.customer_summary.map((customer) => ({
      customer_name: customer.customer_name,
      quotation_count: customer.quotation_count,
      quoted_value: customer.quoted_value,
    }));

    downloadCsv("customer-quotation-summary.csv", rows);
  }

  const overview = report?.overview;
  const hasQuotations = Boolean(report?.quotations?.length);

  return (
    <div className="reports-page">
      <div className="reports-heading">
        <div>
          <h1>Quotation Reports</h1>
          <p>
            Review quotation values, workflow status, and customer activity.
          </p>
        </div>

        <button
          type="button"
          className="reports-button reports-button-primary"
          onClick={handleExportQuotations}
          disabled={loading || exporting || !hasQuotations}
        >
          {exporting ? "Preparing CSV..." : "Export Quotations CSV"}
        </button>
      </div>

      <form className="reports-filter-card" onSubmit={handleApplyFilters}>
        <div className="reports-filter-field">
          <label htmlFor="report-date-from">From Date</label>
          <input
            id="report-date-from"
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleFilterChange}
          />
        </div>

        <div className="reports-filter-field">
          <label htmlFor="report-date-to">To Date</label>
          <input
            id="report-date-to"
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleFilterChange}
          />
        </div>

        <div className="reports-filter-actions">
          <button
            type="submit"
            className="reports-button reports-button-primary"
            disabled={loading}
          >
            Apply Filters
          </button>

          <button
            type="button"
            className="reports-button reports-button-secondary"
            onClick={handleClearFilters}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="reports-alert" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="reports-state">Loading reports...</div>
      ) : report ? (
        <>
          <section className="reports-metrics">
            <article className="reports-metric-card">
              <span className="reports-metric-label">
                Total Quotations
              </span>
              <strong>{overview.quotation_count}</strong>
              <span className="reports-metric-footnote">
                In the selected period
              </span>
            </article>

            <article className="reports-metric-card">
              <span className="reports-metric-label">
                Total Quoted Value
              </span>
              <strong>{formatCurrency(overview.quoted_value)}</strong>
              <span className="reports-metric-footnote">
                All quotation statuses
              </span>
            </article>

            <article className="reports-metric-card">
              <span className="reports-metric-label">
                Accepted Quotation Value
              </span>
              <strong>{formatCurrency(overview.accepted_value)}</strong>
              <span className="reports-metric-footnote">
                Currently accepted
              </span>
            </article>

            <article className="reports-metric-card">
              <span className="reports-metric-label">
                Converted Quotation Value
              </span>
              <strong>{formatCurrency(overview.converted_value)}</strong>
              <span className="reports-metric-footnote">
                Currently converted
              </span>
            </article>
          </section>

          <section className="reports-panel">
            <div className="reports-panel-heading">
              <div>
                <h2>Quotation Status Breakdown</h2>
                <p>Count and quoted value by current status.</p>
              </div>
            </div>

            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Quotation Count</th>
                    <th>Quoted Value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.status_breakdown.map((item) => (
                    <tr key={item.status}>
                      <td>
                        <span
                          className={`reports-status reports-status-${item.status.toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>{item.quotation_count}</td>
                      <td>{formatCurrency(item.quoted_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="reports-panel">
            <div className="reports-panel-heading">
              <div>
                <h2>Customer Summary</h2>
                <p>Customers ranked by total quoted value.</p>
              </div>

              <button
                type="button"
                className="reports-button reports-button-secondary"
                onClick={handleExportCustomers}
                disabled={!report.customer_summary.length}
              >
                Export Customers CSV
              </button>
            </div>

            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Quotation Count</th>
                    <th>Quoted Value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.customer_summary.length ? (
                    report.customer_summary.map((customer) => (
                      <tr key={customer.customer_id}>
                        <td>{customer.customer_name}</td>
                        <td>{customer.quotation_count}</td>
                        <td>{formatCurrency(customer.quoted_value)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="reports-empty">
                        No customer data for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="reports-panel">
            <div className="reports-panel-heading">
              <div>
                <h2>Quotation Details</h2>
                <p>
                  {report.quotations.length} records match the selected period.
                </p>
              </div>
            </div>

            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Quotation No.</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Valid Until</th>
                    <th>Status</th>
                    <th>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.quotations.length ? (
                    report.quotations.map((quotation) => (
                      <tr key={quotation.id}>
                        <td className="reports-quotation-number">
                          {quotation.quotation_number}
                        </td>
                        <td>{quotation.customer_name}</td>
                        <td>{formatDate(quotation.quotation_date)}</td>
                        <td>{formatDate(quotation.valid_until)}</td>
                        <td>
                          <span
                            className={`reports-status reports-status-${quotation.status.toLowerCase()}`}
                          >
                            {quotation.status}
                          </span>
                        </td>
                        <td>{formatCurrency(quotation.grand_total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="reports-empty">
                        No quotations found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="reports-state">
          No report data is available. Try refreshing the page.
        </div>
      )}

      <p className="reports-disclaimer">
        Quoted values represent quotation totals, not collected payments or
        recognized revenue. Status summaries use each quotation&apos;s current
        status.
      </p>
    </div>
  );
}