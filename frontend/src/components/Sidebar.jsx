import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Mail,
  BarChart3,
  Settings,
  Shield,
  Bell,
  Clock3,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import api from "../services/api";

function Sidebar({ isMobileOpen = false, onNavigate }) {
  const [user, setUser] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("quoteflow_user");
      setUser(storedUser ? JSON.parse(storedUser) : null);
    } catch {
      setUser(null);
    }

    const loadBranding = () => {
      api.get("/settings/company").then(({ data }) => {
        if (data.logo_path) {
          const filename = data.logo_path.split(/[\\/]/).pop();
          setLogoUrl(`${api.defaults.baseURL}/uploads/${encodeURIComponent(filename)}`);
        } else {
          setLogoUrl("");
        }
      }).catch(() => setLogoUrl(""));
    };

    loadBranding();
    window.addEventListener("company-branding-updated", loadBranding);
    return () => window.removeEventListener("company-branding-updated", loadBranding);
  }, []);

  const menuItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      label: "Customers",
      path: "/customers",
      icon: Users,
    },
    {
      label: "Products",
      path: "/products",
      icon: Package,
    },
    {
      label: "Quotations",
      path: "/quotations",
      icon: FileText,
    },
    {
      label: "Emails",
      path: "/emails",
      icon: Mail,
    },
    {
      label: "Reminders",
      path: "/quotation-reminders",
      icon: Bell,
    },
    {
      label: "Reminder Settings",
      path: "/reminder-settings",
      icon: Clock3,
    },
    {
      label: "Reports",
      path: "/reports",
      icon: BarChart3,
    },
    ...(user?.role === "admin"
      ? [
          {
            label: "Users",
            path: "/users",
            icon: Shield,
          },
        ]
      : []),
    {
      label: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className={`sidebar ${isMobileOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-logo">
        {logoUrl ? (
          <img className="sidebar-brand-image" src={logoUrl} alt="Company logo" />
        ) : (
          <div className="logo-icon">Q</div>
        )}

        <div>
          <h2>QuoteFlow</h2>
          <span>Automation</span>
        </div>
      </div>

      <nav className="sidebar-menu" aria-label="Main navigation">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={onNavigate}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;