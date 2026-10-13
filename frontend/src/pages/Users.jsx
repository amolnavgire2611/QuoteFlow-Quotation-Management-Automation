import { useEffect, useState } from "react";
import api from "../services/api";

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  username: "",
  password: "",
  role: "employee",
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        full_name: form.full_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      };

      if (!payload.username) {
        throw new Error("Username is required.");
      }

      if (!editingId && !payload.password) {
        throw new Error("Password is required.");
      }

      if (editingId) {
        await api.put(`/users/${editingId}`, {
          password: payload.password || undefined,
          role: payload.role,
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
        });
      } else {
        await api.post("/users", payload);
      }

      setForm(initialForm);
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="users-page">
      <div className="page-title">
        <div>
          <h2>User Management</h2>
          <p>Maintain admin, manager and viewer access</p>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="user-layout">
        <div className="card-panel">
          <h3>{editingId ? "Edit User" : "Add Employee / User"}</h3>

          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-group">
              <label htmlFor="user-full-name">Employee name</label>
              <input id="user-full-name" value={form.full_name} onChange={(event) => setForm((previous) => ({ ...previous, full_name: event.target.value }))} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label htmlFor="user-name">Username</label>
              <input
                id="user-name"
                value={form.username}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, username: event.target.value }))
                }
                placeholder="Enter username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-email">Email</label>
              <input id="user-email" type="email" value={form.email} onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))} placeholder="employee@company.com" />
            </div>

            <div className="form-group">
              <label htmlFor="user-phone">Phone</label>
              <input id="user-phone" type="tel" value={form.phone} onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))} placeholder="Phone number" />
            </div>

            <div className="form-group">
              <label htmlFor="user-password">Password</label>
              <input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, password: event.target.value }))
                }
                placeholder={editingId ? "Update password" : "Enter password"}
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-role">Role</label>
              <select
                id="user-role"
                value={form.role}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, role: event.target.value }))
                }
              >
                <option value="employee">Employee</option>
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-actions-inline">
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? (editingId ? "Saving..." : "Creating...") : editingId ? "Update User" : "Create User"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="card-panel">
          <h3>Existing Users</h3>

          {loading ? (
            <div className="loading">
              <div className="spinner" />
              <span>Loading users...</span>
            </div>
          ) : (
            <div className="user-list">
              {users.length > 0 ? (
                users.map((user) => (
                  <div className="user-item" key={user.id}>
                    <div>
                      <strong>{user.username}</strong>
                      <small>{user.role}</small>
                    </div>

                    <div className="user-item-actions">
                      <span className={`user-role-badge ${user.role}`}>
                        {user.role}
                      </span>

                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => {
                          setEditingId(user.id);
                          setForm({
                            full_name: user.full_name || "",
                            email: user.email || "",
                            phone: user.phone || "",
                            username: user.username,
                            password: "",
                            role: user.role,
                          });
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p>No users found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
