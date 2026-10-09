import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  RefreshCw,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Quotations() {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);

  const [search, setSearch] = useState("");
  const [quotationStatus, setQuotationStatus] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadQuotations();
  }, [quotationStatus]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (quotationStatus) {
        params.quotation_status =
          quotationStatus;
      }

      const response = await api.get(
        "/quotations",
        { params }
      );

      setQuotations(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load quotations."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    loadQuotations();
  };

  const formatCurrency = (value) => {
    return Number(value).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString("en-IN");
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status.toLowerCase()}`;
  };

  return (
    <div className="quotation-page">

      {/* Header */}
      <div className="page-header">

        <div>
          <h1>Quotations</h1>

          <p>
            Manage customer quotations and
            quotation status.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            navigate("/quotations/new")
          }
        >
          <Plus size={17} />
          New Quotation
        </button>

      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Filters */}
      <section className="quotation-card quotation-filter-card">

        <form
          className="quotation-filters"
          onSubmit={handleSearch}
        >

          <div className="quotation-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Search quotation number..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

          </div>

          <select
            value={quotationStatus}
            onChange={(event) =>
              setQuotationStatus(
                event.target.value
              )
            }
          >
            <option value="">
              All Statuses
            </option>

            <option value="DRAFT">
              Draft
            </option>

            <option value="SENT">
              Sent
            </option>

            <option value="ACCEPTED">
              Accepted
            </option>

            <option value="REJECTED">
              Rejected
            </option>

            <option value="EXPIRED">
              Expired
            </option>

            <option value="CONVERTED">
              Converted
            </option>
          </select>

          <button
            type="submit"
            className="secondary-button"
          >
            <Search size={16} />
            Search
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={loadQuotations}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </form>

      </section>

      {/* Table */}
      <section className="quotation-card">

        <div className="quotation-card-header">

          <div>
            <h2>Quotation List</h2>

            <p>
              {quotations.length} quotation
              {quotations.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

        </div>

        {loading ? (
          <div className="loading-state">
            Loading quotations...
          </div>
        ) : quotations.length === 0 ? (
          <div className="empty-state">

            <FileTextIcon />

            <h3>
              No quotations found
            </h3>

            <p>
              Create your first quotation
              to get started.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate(
                  "/quotations/new"
                )
              }
            >
              <Plus size={17} />
              Create Quotation
            </button>

          </div>
        ) : (
          <div className="quotation-list-wrapper">

            <table className="quotation-list-table">

              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {quotations.map(
                  (quotation) => (
                    <tr key={quotation.id}>

                      <td>
                        <strong>
                          {quotation.quotation_number}
                        </strong>
                      </td>

                      <td>
  <strong>
    {quotation.customer_name}
  </strong>
</td>

                      <td>
                        {formatDate(
                          quotation.quotation_date
                        )}
                      </td>

                      <td>
                        {formatDate(
                          quotation.valid_until
                        )}
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            quotation.status
                          )}
                        >
                          {quotation.status}
                        </span>
                      </td>

                      <td>
                        <strong>
                          ₹{" "}
                          {formatCurrency(
                            quotation.grand_total
                          )}
                        </strong>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          title="View quotation"
                          onClick={() =>
                            navigate(
                              `/quotations/${quotation.id}`
                            )
                          }
                        >
                          <Eye size={18} />
                        </button>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}

function FileTextIcon() {
  return (
    <div className="empty-state-icon">
      <Search size={28} />
    </div>
  );
}

export default Quotations;