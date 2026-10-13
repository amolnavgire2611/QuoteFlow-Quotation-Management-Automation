import { formatDateTime } from "../utils/dates";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createQuotationRevision,
  getQuotationRevisions,
} from "../services/api";

const RevisionHistory = ({ quotationId }) => {
  const navigate = useNavigate();

  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadRevisions = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getQuotationRevisions(quotationId);

      setRevisions(data.revisions || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Failed to load revision history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevisions();
  }, [quotationId]);

  const handleCreateRevision = async () => {
    try {
      setCreating(true);
      setError("");

      const data = await createQuotationRevision(quotationId);

      navigate(
        `/quotations/${quotationId}/revisions/${data.revision_number}`
      );
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Failed to create revision."
      );
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "DRAFT":
        return "revision-status revision-status-draft";

      case "FINALIZED":
        return "revision-status revision-status-finalized";

      case "SENT":
        return "revision-status revision-status-sent";

      case "ACCEPTED":
        return "revision-status revision-status-accepted";

      case "REJECTED":
        return "revision-status revision-status-rejected";

      default:
        return "revision-status";
    }
  };

  if (loading) {
    return (
      <section className="revision-history-card">

        <div className="revision-history-header">
          <div>
            <h2>Revision History</h2>

            <p>
              Manage quotation versions and revisions.
            </p>
          </div>
        </div>

        <div className="revision-history-loading">
          <div className="revision-history-spinner"></div>

          <span>Loading revisions...</span>
        </div>

      </section>
    );
  }

  return (
    <section className="revision-history-card">

      {/* Header */}

      <div className="revision-history-header">

        <div className="revision-history-title">

          <div className="revision-history-icon">
            ↻
          </div>

          <div>
            <h2>Revision History</h2>

            <p>
              Manage quotation versions and revisions.
            </p>
          </div>

        </div>

        <button
          type="button"
          className="revision-create-button"
          onClick={handleCreateRevision}
          disabled={creating}
        >
          {creating ? (
            <>
              <span className="revision-button-spinner"></span>
              Creating...
            </>
          ) : (
            <>
              <span className="revision-plus">+</span>
              Create Revision
            </>
          )}
        </button>

      </div>

      {/* Error */}

      {error && (
        <div className="revision-history-error">
          {error}
        </div>
      )}

      {/* Empty */}

      {revisions.length === 0 ? (
        <div className="revision-history-empty">

          <div className="revision-empty-icon">
            ↻
          </div>

          <h3>No revisions found</h3>

          <p>
            Create a revision to keep track of quotation changes.
          </p>

          <button
            type="button"
            className="revision-create-button"
            onClick={handleCreateRevision}
            disabled={creating}
          >
            {creating ? "Creating..." : "+ Create Revision"}
          </button>

        </div>
      ) : (
        <div className="revision-history-table-wrapper">

          <table className="revision-history-table">

            <thead>
              <tr>
                <th>Revision</th>
                <th>Status</th>
                <th>Items</th>
                <th className="revision-total-column">
                  Grand Total
                </th>
                <th>Created</th>
                <th className="revision-actions-column">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {revisions.map((revision) => (

                <tr key={revision.id}>

                  {/* Revision */}

                  <td>
                    <div className="revision-number-cell">

                      <div className="revision-number-icon">
                        R{revision.revision_number}
                      </div>

                      <div>
                        <strong>
                          Revision #{revision.revision_number}
                        </strong>

                        <span>
                          {revision.quotation_number}
                        </span>
                      </div>

                    </div>
                  </td>

                  {/* Status */}

                  <td>
                    <span
                      className={getStatusClass(
                        revision.status
                      )}
                    >
                      <span className="revision-status-dot"></span>

                      {revision.status}
                    </span>
                  </td>

                  {/* Items */}

                  <td>
                    <span className="revision-item-count">
                      {revision.items?.length || 0}
                    </span>

                    <span className="revision-item-label">
                      {revision.items?.length === 1
                        ? " item"
                        : " items"}
                    </span>
                  </td>

                  {/* Grand Total */}

                  <td className="revision-total-column">

                    <strong className="revision-grand-total">
                      {formatCurrency(
                        revision.grand_total
                      )}
                    </strong>

                  </td>

                  {/* Created */}

                  <td>
                    <span className="revision-created-date">
                      {formatDateTime(
                        revision.created_at
                      )}
                    </span>
                  </td>

                  {/* Actions */}

                  <td className="revision-actions-column">

                    <div className="revision-actions">

                      <button
                        type="button"
                        className="revision-view-button"
                        onClick={() =>
                          navigate(
                            `/quotations/${quotationId}/revisions/${revision.revision_number}`
                          )
                        }
                      >
                        View
                      </button>

                      {revision.revision_number > 1 && (
                        <button
                          type="button"
                          className="revision-compare-button"
                          onClick={() =>
                            navigate(
                              `/quotations/${quotationId}/revisions/${revision.revision_number - 1}/compare/${revision.revision_number}`
                            )
                          }
                        >
                          Compare
                        </button>
                      )}

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      )}

    </section>
  );
};

export default RevisionHistory;