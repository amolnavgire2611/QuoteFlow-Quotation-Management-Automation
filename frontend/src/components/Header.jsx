import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, UserCircle } from "lucide-react";

function Header({ onMenuClick }) {
  const [user, setUser] = useState({ username: "Administrator", role: "Admin" });

  useEffect(() => {
    const storedUser = localStorage.getItem("quoteflow_user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({ username: "Administrator", role: "Admin" });
      }
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("quoteflow_token");
    localStorage.removeItem("quoteflow_user");
    window.location.href = "/login";
  }

  return (
    <header className="header">
      <div>
        <button
          type="button"
          className="mobile-menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={19} />
        </button>
        <h1>Quotation Management</h1>
        <p>Manage customers, products and quotations</p>
      </div>

      <div className="header-actions">
        <button className="icon-button" type="button" aria-label="Notifications">
          <Bell size={20} />
        </button>

        <div className="user-profile">
          <UserCircle size={32} />

          <div>
            <strong>{user.username}</strong>
            <span>{user.role}</span>
          </div>
        </div>

        <button className="secondary-button logout-button" type="button" onClick={handleLogout} aria-label="Log out">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;