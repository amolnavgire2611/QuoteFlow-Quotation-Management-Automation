
import { useEffect, useState } from "react";
import api from "../services/api";
import "./Settings.css";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  state: "",
  gstin: "",
  pan: "",
  logo_path: "",
};

const fields = [
  { name: "name", label: "Company Name", required: true },
  { name: "email", label: "Company Email", type: "email" },
  { name: "phone", label: "Phone Number" },
  { name: "website", label: "Website", type: "url" },
  { name: "state", label: "State" },
  { name: "gstin", label: "GSTIN" },
  { name: "pan", label: "PAN" },
  { name: "logo_path", label: "Company Logo Path" },
];

export default function Settings() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await api.get("/settings/company");

        if (active) {
          setForm({ ...initialForm, ...response.data });
        }
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 404) {
          setForm(initialForm);
        } else {
          setError(
            err.response?.data?.detail ||
              "Unable to load company settings."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        address: form.address.trim() || null,
        state: form.state.trim() || null,
        gstin: form.gstin.trim().toUpperCase() || null,
        pan: form.pan.trim().toUpperCase() || null,
        logo_path: form.logo_path.trim() || null,
      };

      const response = await api.put("/settings/company", payload);

      setForm({ ...initialForm, ...response.data });
      setMessage("Company settings saved successfully.");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        Array.isArray(detail)
          ? detail.map((item) => item.msg).join(" ")
          : detail || "Unable to save company settings."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">Loading company settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-heading">
        <div>
          <h1>Company Settings</h1>
          <p>
            Manage your business profile and the information displayed
            on quotation documents.
          </p>
        </div>
      </div>

      {message && (
        <div className="settings-alert settings-alert-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="settings-alert settings-alert-error" role="alert">
          {error}
        </div>
      )}

      <form className="settings-card" onSubmit={handleSubmit}>
        <div className="settings-section-heading">
          <h2>Business Information</h2>
          <p>Enter your official company details.</p>
        </div>

        <div className="settings-form-grid">
          {fields.map((field) => (
            <div
              className={`settings-field ${
                field.name === "logo_path" ? "settings-field-full" : ""
              }`}
              key={field.name}
            >
              <label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="settings-required"> *</span>}
              </label>

              <input
                id={field.name}
                name={field.name}
                type={field.type || "text"}
                value={form[field.name] || ""}
                onChange={handleChange}
                required={field.required || false}
                maxLength={field.name === "logo_path" ? 500 : undefined}
                placeholder={
                  field.name === "logo_path"
                    ? "Optional: server-accessible logo file path"
                    : `Enter ${field.label.toLowerCase()}`
                }
              />
            </div>
          ))}

          <div className="settings-field settings-field-full">
            <label htmlFor="address">Company Address</label>
            <textarea
              id="address"
              name="address"
              rows={3}
              value={form.address || ""}
              onChange={handleChange}
              placeholder="Enter your registered business address"
            />
          </div>
        </div>

        <div className="settings-note">
          <strong>Logo note:</strong> This field stores a file path only;
          it does not upload an image. The path must be accessible to the
          backend for PDF generation to use it.
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="settings-button settings-button-secondary"
            onClick={() => {
              setForm(initialForm);
              setMessage("");
              setError("");
            }}
            disabled={saving}
          >
            Clear Form
          </button>

          <button
            type="submit"
            className="settings-button settings-button-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}