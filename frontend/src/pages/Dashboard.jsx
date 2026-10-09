import {
  Users,
  Package,
  FileText,
  IndianRupee,
} from "lucide-react";

function Dashboard() {
  const cards = [
    {
      title: "Total Customers",
      value: "0",
      icon: Users,
    },
    {
      title: "Active Products",
      value: "0",
      icon: Package,
    },
    {
      title: "Total Quotations",
      value: "0",
      icon: FileText,
    },
    {
      title: "Quotation Value",
      value: "₹0",
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

        <p>
          Quotation statistics and recent activities
          will appear here.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;