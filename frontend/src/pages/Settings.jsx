
import { useEffect, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
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
];

export default function Settings() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await api.get("/settings/company");

        if (active) {
          setForm({ ...initialForm, ...response.data });
          if (response.data.logo_path) {
            const filename = response.data.logo_path.split(/[\\/]/).pop();
            setLogoPreview(`${api.defaults.baseURL}/uploads/${encodeURIComponent(filename)}`);
          }
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

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setError("Choose a PNG or JPEG image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo files must be 5 MB or smaller.");
      return;
    }

    setUploadingLogo(true);
    setError("");
    setMessage("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      const { data } = await api.post("/settings/company/logo", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((current) => ({ ...current, logo_path: data.logo_path }));
      setLogoPreview(`${api.defaults.baseURL}${data.logo_url}`);
      setMessage("Logo uploaded. Save settings to apply it to quotations.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to upload company logo.");
    } finally {
      setUploadingLogo(false);
    }
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
      window.dispatchEvent(new Event("company-branding-updated"));
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
          <div>
            <span className="settings-eyebrow">COMPANY PROFILE</span>
            <h2>Business Information</h2>
            <p>Enter your official company details.</p>
          </div>
        </div>

        <section className="settings-brand-panel" aria-label="Company logo">
          <div className="settings-logo-preview">
            {logoPreview ? (
              <img src={logoPreview} alt="Company logo preview" />
            ) : (
              <ImagePlus size={28} />
            )}
          </div>
          <div className="settings-brand-copy">
            <strong>Company logo</strong>
            <span>PNG or JPEG, up to 5 MB. Used on quotation PDFs and in the navigation.</span>
            <div className="settings-brand-actions">
              <label className="settings-upload-button">
                <Upload size={16} />
                {uploadingLogo ? "Uploading..." : logoPreview ? "Replace logo" : "Upload logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo || saving}
                />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  className="settings-remove-logo"
                  onClick={() => {
                    setLogoPreview("");
                    setForm((current) => ({ ...current, logo_path: "" }));
                    setMessage("Logo removed. Save settings to apply this change.");
                  }}
                  disabled={saving || uploadingLogo}
                >
                  <X size={15} /> Remove
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="settings-form-grid">
          {fields.map((field) => (
            <div className="settings-field" key={field.name}>
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
                placeholder={`Enter ${field.label.toLowerCase()}`}
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

        <div className="settings-actions">
          <button
            type="button"
            className="settings-button settings-button-secondary"
            onClick={() => {
              setForm(initialForm);
              setLogoPreview("");
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