import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Quotations from "./pages/Quotations";
import QuotationCreate from "./pages/QuotationCreate";
import QuotationDetail from "./pages/QuotationDetail";
import RevisionEditor from "./pages/RevisionEditor";
import RevisionCompare from "./pages/RevisionCompare";
import QuotationReminders from "./pages/QuotationReminders";
import Reports from "./pages/Reports";
import Emails from "./pages/Emails";
import Login from "./pages/Login";
import Users from "./pages/Users";
import QuotationReminderSettings from "./pages/QuotationReminderSettings";
function ProtectedRoute() {
  const token = localStorage.getItem("quoteflow_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AdminRoute() {
  const storedUser = localStorage.getItem("quoteflow_user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/quotations/new" element={<QuotationCreate />} />
            <Route path="/quotations/:quotationId" element={<QuotationDetail />} />
            <Route
              path="/quotations/:quotationId/revisions/:revisionFrom/compare/:revisionTo"
              element={<RevisionCompare />}
            />
            <Route
              path="/quotations/:quotationId/revisions/:revisionNumber"
              element={<RevisionEditor />}
            />
            <Route path="/emails" element={<Emails />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/quotation-reminders" element={<QuotationReminders />} />
            <Route path="/reminder-settings" element={<QuotationReminderSettings />} />

            <Route element={<AdminRoute />}>
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;