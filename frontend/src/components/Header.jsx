import { Bell, UserCircle } from "lucide-react";

function Header() {
  return (
    <header className="header">
      <div>
        <h1>Quotation Management</h1>
        <p>Manage customers, products and quotations</p>
      </div>

      <div className="header-actions">
        <button className="icon-button">
          <Bell size={20} />
        </button>

        <div className="user-profile">
          <UserCircle size={32} />

          <div>
            <strong>Administrator</strong>
            <span>Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;