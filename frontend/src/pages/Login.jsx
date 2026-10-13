import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    username: "admin",
    password: "admin123",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (localStorage.getItem("quoteflow_token")) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegistering) {
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const response = await api.post("/auth/register", {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          username: form.username,
          password: form.password,
        });

        const { access_token, user } = response.data;

        localStorage.setItem("quoteflow_token", access_token);
        localStorage.setItem("quoteflow_user", JSON.stringify(user));

        setSuccess("Registration successful. Redirecting...");
        navigate("/");
        return;
      }

      const response = await api.post("/auth/login", {
        username: form.username,
        password: form.password,
      });
      const { access_token, user } = response.data;

      localStorage.setItem("quoteflow_token", access_token);
      localStorage.setItem("quoteflow_user", JSON.stringify(user));

      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || "Authentication failed.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  function handleModeSwitch(nextMode) {
    setIsRegistering(nextMode);
    setError("");
    setSuccess("");
    setForm((previous) => ({
      ...previous,
      username: nextMode ? "" : previous.username || "admin",
      full_name: nextMode ? previous.full_name : "",
      email: nextMode ? previous.email : "",
      phone: nextMode ? previous.phone : "",
      confirmPassword: "",
    }));
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">Q</div>
          <div>
            <h2>QuoteFlow</h2>
            <p>Quotation Automation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-mode-switch">
            <button
              type="button"
              className={isRegistering ? "mode-tab" : "mode-tab active"}
              onClick={() => handleModeSwitch(false)}
            >
              Sign in
            </button>
            <button
              type="button"
              className={isRegistering ? "mode-tab active" : "mode-tab"}
              onClick={() => handleModeSwitch(true)}
            >
              Register
            </button>
          </div>

          <h3>{isRegistering ? "Create account" : "Welcome back"}</h3>
          {isRegistering && (
            <p className="registration-note">Create your employee account. Your administrator can adjust access later.</p>
          )}

          {error ? <div className="error-message">{error}</div> : null}
          {success ? <div className="success-message">{success}</div> : null}

          {isRegistering ? (
            <>
              <div className="form-group">
                <label htmlFor="full-name">Full name</label>
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={150}
                  required
                  value={form.full_name}
                  onChange={(event) => setForm((previous) => ({ ...previous, full_name: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-email">Work email</label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-phone">Phone number</label>
                <input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  minLength={7}
                  maxLength={30}
                  required
                  value={form.phone}
                  onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
                />
              </div>
            </>
          ) : null}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              minLength={3}
              maxLength={100}
              required
              value={form.username}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  username: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={isRegistering ? 6 : 1}
              maxLength={255}
              required
              value={form.password}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  password: event.target.value,
                }))
              }
            />
          </div>

          {isRegistering ? (
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </div>
          ) : null}

          <button type="submit" className="primary-button login-button" disabled={loading}>
            {loading
              ? isRegistering
                ? "Registering..."
                : "Signing in..."
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
