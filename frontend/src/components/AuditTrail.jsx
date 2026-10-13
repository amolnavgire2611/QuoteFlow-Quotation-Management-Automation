import { useEffect, useState } from "react";

import { getQuotationAuditLogs } from "../services/api";
import { formatDateTime } from "../utils/dates";

const AuditTrail = ({ quotationId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getQuotationAuditLogs(quotationId);

      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Failed to load audit history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [quotationId]);

  if (loading) {
    return (
      <div className="card audit-trail-card">
        <div className="card-header">
          <div>
            <h2>Audit Trail</h2>
            <p>Quotation activity history.</p>
          </div>
        </div>

        <div className="audit-loading">
          Loading audit history...
        </div>
      </div>
    );
  }

  return (
    <div className="card audit-trail-card">
      <div className="card-header">
        <div>
          <h2>Audit Trail</h2>
          <p>
            Track quotation changes and workflow activity.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!error && logs.length === 0 && (
        <div className="empty-state">
          No audit activity recorded yet.
        </div>
      )}

      {!error && logs.length > 0 && (
        <div className="audit-timeline">
          {logs.map((log) => (
            <div
              className="audit-timeline-item"
              key={log.id}
            >
              <div className="audit-timeline-marker">
                <span />
              </div>

              <div className="audit-timeline-content">
                <div className="audit-event-header">
                  <div>
                    <h3>{log.action}</h3>

                    <p className="audit-description">
                      {log.description}
                    </p>
                  </div>

                  <span className="audit-date">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>

                <div className="audit-user">
                  <span>By</span>
                  <strong>{log.user_name}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditTrail;