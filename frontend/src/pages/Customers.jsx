import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  UserX,
  Users,
  Upload,
  FileDown,
} from "lucide-react";
import api from "../services/api";
import Modal from "../components/Modal";
import Loading from "../components/Loading";

const emptyForm = {
  company_name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  billing_address: "",
  shipping_address: "",
  gstin: "",
  pan: "",
  state: "",
  country: "India",
};

function Customers() {
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const importInput = useRef(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers", {
        params: {
          search: search || undefined,
          limit: 100,
        },
      });

      setCustomers(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);

    setForm({
      company_name: customer.company_name || "",
      contact_person: customer.contact_person || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      billing_address:
        customer.billing_address || "",
      shipping_address:
        customer.shipping_address || "",
      gstin: customer.gstin || "",
      pan: customer.pan || "",
      state: customer.state || "",
      country: customer.country || "India",
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
  };

  const saveCustomer = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editingCustomer) {
        await api.put(
          `/customers/${editingCustomer.id}`,
          form
        );
      } else {
        await api.post("/customers", form);
      }

      setShowModal(false);

      await loadCustomers();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivateCustomer = async (customer) => {
    const confirmed = window.confirm(
      `Deactivate ${customer.company_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/customers/${customer.id}`
      );

      await loadCustomers();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to deactivate customer."
      );
    }
  };

  const importCustomers = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Select an .xlsx Excel workbook.");
      return;
    }

    setImporting(true);
    setError("");
    setImportMessage("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      const { data } = await api.post("/customers/import", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportMessage(`${data.imported} customer(s) imported; ${data.failed} row(s) need correction.`);
      if (data.errors?.length) {
        setError(data.errors.slice(0, 5).map((item) => `Row ${item.row}: ${item.message}`).join(" "));
      }
      await loadCustomers();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to import customers.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const { data } = await api.get("/customers/import/template", { responseType: "blob" });
      downloadBlob(data, "customers-import-template.xlsx");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to download the Excel template.");
    }
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Customers</h2>
          <p>
            Manage your customer master data
          </p>
        </div>

        <div className="page-title-actions">
          <button className="secondary-button" type="button" onClick={downloadTemplate}>
            <FileDown size={17} /> Excel template
          </button>
          <button className="secondary-button" type="button" onClick={() => importInput.current?.click()} disabled={importing}>
            <Upload size={17} /> {importing ? "Importing..." : "Import Excel"}
          </button>
          <input ref={importInput} className="visually-hidden-input" type="file" accept=".xlsx" onChange={importCustomers} />
          <button className="primary-button" onClick={openCreateModal}>
            <Plus size={18} /> Add Customer
          </button>
        </div>
      </div>

      {importMessage && <div className="success-message" role="status">{importMessage}</div>}

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <Loading text="Loading customers..." />
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <UsersEmpty />
            <h3>No customers found</h3>
            <p>
              Add your first customer to get started.
            </p>

            <button
              className="primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Add Customer
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>
                        {customer.company_name}
                      </strong>
                    </td>

                    <td>
                      {customer.contact_person ||
                        "-"}
                    </td>

                    <td>
                      {customer.email || "-"}
                    </td>

                    <td>
                      {customer.phone || "-"}
                    </td>

                    <td>
                      {customer.state || "-"}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="action-button"
                          onClick={() =>
                            openEditModal(customer)
                          }
                          title="Edit"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="action-button danger"
                          onClick={() =>
                            deactivateCustomer(
                              customer
                            )
                          }
                          title="Deactivate"
                        >
                          <UserX size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title={
            editingCustomer
              ? "Edit Customer"
              : "Add Customer"
          }
          onClose={closeModal}
        >
          <form
            className="customer-form"
            onSubmit={saveCustomer}
          >
            <div className="form-grid">
              <FormField
                label="Company Name"
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                required
              />

              <FormField
                label="Contact Person"
                name="contact_person"
                value={form.contact_person}
                onChange={handleChange}
              />

              <FormField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />

              <FormField
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />

              <FormField
                label="GSTIN"
                name="gstin"
                value={form.gstin}
                onChange={handleChange}
              />

              <FormField
                label="PAN"
                name="pan"
                value={form.pan}
                onChange={handleChange}
              />

              <FormField
                label="State"
                name="state"
                value={form.state}
                onChange={handleChange}
              />

              <FormField
                label="Country"
                name="country"
                value={form.country}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Address</label>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Billing Address</label>

                <textarea
                  name="billing_address"
                  value={form.billing_address}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Shipping Address</label>

                <textarea
                  name="shipping_address"
                  value={form.shipping_address}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingCustomer
                    ? "Update Customer"
                    : "Save Customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
}) {
  return (
    <div className="form-group">
      <label>
        {label}
        {required && (
          <span className="required">*</span>
        )}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  );
}

function UsersEmpty() {
  return (
    <div className="empty-icon">
      <Users size={32} />
    </div>
  );
}

export default Customers;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}