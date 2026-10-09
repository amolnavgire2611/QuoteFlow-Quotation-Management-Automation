import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import AppLayout from "./layouts/AppLayout";

import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Quotations from "./pages/Quotations";
import QuotationCreate from "./pages/QuotationCreate";
import QuotationDetail from "./pages/QuotationDetail";
import RevisionEditor from "./pages/RevisionEditor";
import RevisionCompare from "./pages/RevisionCompare";
function Placeholder({ title }) {
  return (
    <div className="placeholder-page">
      <h2>{title}</h2>
      <p>This module will be implemented next.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route element={<AppLayout />}>

          {/* Dashboard */}
          <Route
            path="/"
            element={<Dashboard />}
          />

          {/* Customers */}
          <Route
            path="/customers"
            element={<Customers />}
          />

          {/* Products */}
          <Route
            path="/products"
            element={<Products />}
          />

          {/* Quotations */}
          <Route
            path="/quotations"
            element={<Quotations />}
          />

          {/* Create Quotation */}
          <Route
            path="/quotations/new"
            element={<QuotationCreate />}
          />

          {/* Quotation Detail */}
          <Route
            path="/quotations/:quotationId"
            element={<QuotationDetail />}
          />
          <Route
  path="/quotations/:quotationId/revisions/:revisionFrom/compare/:revisionTo"
  element={<RevisionCompare />}
/>

          {/* Revision Editor */}
          <Route
            path="/quotations/:quotationId/revisions/:revisionNumber"
            element={<RevisionEditor />}
          />

          {/* Emails */}
          <Route
            path="/emails"
            element={
              <Placeholder title="Emails" />
            }
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <Placeholder title="Reports" />
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <Placeholder title="Settings" />
            }
          />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;