import { useEffect, useState } from "react";
import {
  Users,
  Package,
  FileText,
  IndianRupee,
} from "lucide-react";
import api from "../services/api";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function Dashboard() {
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    quotations: 0,
    value: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const chartMax = statusBreakdown.reduce(
    (max, item) => Math.max(max, Number(item.quotation_count || 0)),
    1
  );

  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      try {
        const [customersResponse, productsResponse, quotationsResponse, reportResponse] =
          await Promise.all([
            api.get("/customers"),
            api.get("/products"),
            api.get("/quotations"),
            api.get("/reports/summary"),
          ]);

        if (!isActive) return;

        const customers = Array.isArray(customersResponse.data)
          ? customersResponse.data
          : [];
        const products = Array.isArray(productsResponse.data)
          ? productsResponse.data
          : [];
        const quotations = Array.isArray(quotationsResponse.data)
          ? quotationsResponse.data
          : [];
        const report = reportResponse.data || {};

        setStats({
          customers: customers.length,
          products: products.length,
          quotations: quotations.length,
          value: Number(report.overview?.quoted_value || 0),
        });

        setStatusBreakdown(
          Array.isArray(report.status_breakdown)
            ? report.status_breakdown.filter((item) => Number(item.quotation_count) > 0)
            : []
        );
      } catch (err) {
        if (!isActive) return;
        setError(err.response?.data?.detail || "Unable to load dashboard data.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isActive = false;
    };
  }, []);

  const cards = [
    {
      title: "Total Customers",
      value: stats.customers,
      icon: Users,
    },
    {
      title: "Active Products",
      value: stats.products,
      icon: Package,
    },
    {
      title: "Total Quotations",
      value: stats.quotations,
      icon: FileText,
    },
    {
      title: "Quotation Value",
      value: formatCurrency(stats.value),
      icon: IndianRupee,
    },
  ];

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your quotation operations</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Loading dashboard...</span>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : null}

      <div className="stats-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div className="stat-card" key={card.title}>
              <div className="stat-icon">
                <Icon size={22} />
              </div>

              <div>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-placeholder">
        <h3>Quotation Activity</h3>

        {statusBreakdown.length > 0 ? (
          <>
            <div className="chart-card">
              {statusBreakdown.map((item) => (
                <div className="chart-column" key={item.status}>
                  <div className="chart-bar-wrap">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${(Number(item.quotation_count || 0) / chartMax) * 100}%`,
                      }}
                    />
                  </div>
                  <span>{item.status}</span>
                  <strong>{item.quotation_count}</strong>
                </div>
              ))}
            </div>

            <div className="status-list">
              {statusBreakdown.map((item) => (
                <div className="status-row" key={item.status}>
                  <span className="status-pill">{item.status}</span>
                  <strong>{item.quotation_count}</strong>
                  <small>{formatCurrency(item.quoted_value)}</small>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>No quotation activity available yet.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;