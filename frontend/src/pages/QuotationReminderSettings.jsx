
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BellRing } from "lucide-react";
import api from "../services/api";
import "./QuotationReminderSettings.css";

const DEFAULT_SETTINGS = {
  enabled: true,
  expiry_reminder_days: 3,
  final_expiry_reminder_days: 1,
  follow_up_after_days: 7,
  scheduler_hour: 9,
  scheduler_minute: 0,
  scheduler_timezone: "Asia/Kolkata",
};

const TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

export default function QuotationReminderSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/reminder-settings");

        if (active) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...response.data,
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Unable to load reminder settings."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  function validateSettings() {
    const firstExpiry = Number(settings.expiry_reminder_days);
    const finalExpiry = Number(
      settings.final_expiry_reminder_days
    );
    const followUp = Number(settings.follow_up_after_days);
    const hour = Number(settings.scheduler_hour);
    const minute = Number(settings.scheduler_minute);

    if (
      !Number.isInteger(firstExpiry) ||
      firstExpiry < 1 ||
      firstExpiry > 365
    ) {
      return "First expiry reminder must be between 1 and 365 days.";
    }

    if (
      !Number.isInteger(finalExpiry) ||
      finalExpiry < 1 ||
      finalExpiry > 365
    ) {
      return "Final expiry reminder must be between 1 and 365 days.";
    }

    if (finalExpiry >= firstExpiry) {
      return "The final expiry reminder must be closer to expiry than the first reminder.";
    }

    if (
      !Number.isInteger(followUp) ||
      followUp < 1 ||
      followUp > 365
    ) {
      return "Follow-up interval must be between 1 and 365 days.";
    }

    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23
    ) {
      return "Scheduler hour must be between 0 and 23.";
    }

    if (
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 59
    ) {
      return "Scheduler minute must be between 0 and 59.";
    }

    if (!settings.scheduler_timezone) {
      return "Please select a scheduler timezone.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateSettings();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const payload = {
      enabled: settings.enabled,
      expiry_reminder_days: Number(
        settings.expiry_reminder_days
      ),
      final_expiry_reminder_days: Number(
        settings.final_expiry_reminder_days
      ),
      follow_up_after_days: Number(
        settings.follow_up_after_days
      ),
      scheduler_hour: Number(settings.scheduler_hour),
      scheduler_minute: Number(settings.scheduler_minute),
      scheduler_timezone: settings.scheduler_timezone,
    };

    try {
      const response = await api.put(
        "/reminder-settings",
        payload
      );

      setSettings({
        ...DEFAULT_SETTINGS,
        ...response.data,
      });

      setSuccess("Reminder settings saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to save reminder settings."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="reminder-settings-page">
        <p className="reminder-settings-message">
          Loading reminder settings...
        </p>
      </div>
    );
  }

  return (
    <div className="reminder-settings-page">
      <div className="reminder-settings-header">
        <div>
          <Link className="reminder-settings-back" to="/quotation-reminders">
            <ArrowLeft size={16} /> View reminder activity
          </Link>
          <h1>Quotation Reminder Settings</h1>
          <p>
            Configure quotation expiry notifications,
            customer follow-ups, and the scheduled run time.
          </p>
        </div>
      </div>

      {error && (
        <div className="reminder-settings-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div
          className="reminder-settings-alert success"
          role="status"
        >
          {success}
        </div>
      )}

      <form
        className="reminder-settings-form"
        onSubmit={handleSubmit}
      >
        <section className="reminder-settings-card">
          <div className="reminder-settings-card-heading">
            <div>
              <h2><BellRing size={19} /> Automation</h2>
              <p>
                Control whether scheduled quotation reminders
                should be processed.
              </p>
            </div>
          </div>

          <label className="reminder-toggle-row">
            <span>
              <strong>Enable automated reminders</strong>
              <small>
                Turn off to pause automatic reminder processing.
              </small>
            </span>

            <input
              type="checkbox"
              checked={Boolean(settings.enabled)}
              onChange={(event) =>
                updateField("enabled", event.target.checked)
              }
            />
          </label>
        </section>

        <section className="reminder-settings-card">
          <h2>Quotation Expiry Reminders</h2>
          <p className="reminder-settings-description">
            Configure when customers should be reminded before
            their quotation expires.
          </p>

          <div className="reminder-settings-grid">
            <label>
              First expiry reminder (days before expiry)
              <input
                type="number"
                min="2"
                max="365"
                required
                value={settings.expiry_reminder_days}
                onChange={(event) =>
                  updateField(
                    "expiry_reminder_days",
                    event.target.value
                  )
                }
              />
              <small>Default: 3 days</small>
            </label>

            <label>
              Final expiry reminder (days before expiry)
              <input
                type="number"
                min="1"
                max="364"
                required
                value={settings.final_expiry_reminder_days}
                onChange={(event) =>
                  updateField(
                    "final_expiry_reminder_days",
                    event.target.value
                  )
                }
              />
              <small>Default: 1 day</small>
            </label>
          </div>
        </section>

        <section className="reminder-settings-card">
          <h2>Customer Follow-up</h2>
          <p className="reminder-settings-description">
            Set how long to wait after the original quotation email
            before sending a follow-up.
          </p>

          <div className="reminder-settings-grid">
            <label>
              Follow-up interval (days)
              <input
                type="number"
                min="1"
                max="365"
                required
                value={settings.follow_up_after_days}
                onChange={(event) =>
                  updateField(
                    "follow_up_after_days",
                    event.target.value
                  )
                }
              />
              <small>Default: 7 days</small>
            </label>
          </div>
        </section>

        <section className="reminder-settings-card">
          <h2>Scheduler</h2>
          <p className="reminder-settings-description">
            Choose the daily time when the reminder scheduler
            should run.
          </p>

          <div className="reminder-settings-grid">
            <label>
              Hour (24-hour format)
              <input
                type="number"
                min="0"
                max="23"
                required
                value={settings.scheduler_hour}
                onChange={(event) =>
                  updateField(
                    "scheduler_hour",
                    event.target.value
                  )
                }
              />
              <small>For example, 9 means 9 AM.</small>
            </label>

            <label>
              Minute
              <input
                type="number"
                min="0"
                max="59"
                required
                value={settings.scheduler_minute}
                onChange={(event) =>
                  updateField(
                    "scheduler_minute",
                    event.target.value
                  )
                }
              />
              <small>For example, 30 means half past the hour.</small>
            </label>

            <label>
              Timezone
              <select
                value={settings.scheduler_timezone}
                onChange={(event) =>
                  updateField(
                    "scheduler_timezone",
                    event.target.value
                  )
                }
                required
              >
                {!TIMEZONES.includes(
                  settings.scheduler_timezone
                ) && (
                  <option value={settings.scheduler_timezone}>
                    {settings.scheduler_timezone}
                  </option>
                )}

                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="reminder-settings-actions">
          <button
            type="submit"
            disabled={saving}
            className="reminder-settings-save"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      <div className="reminder-settings-notice">
        <strong>Schedule preview:</strong> When enabled, the scheduler
        checks quotations daily at {String(settings.scheduler_hour).padStart(2, "0")}:
        {String(settings.scheduler_minute).padStart(2, "0")} ({settings.scheduler_timezone}).
        Changes are applied when you save.
      </div>
    </div>
  );
}
