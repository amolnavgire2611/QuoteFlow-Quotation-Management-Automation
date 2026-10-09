import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  PackageX,
} from "lucide-react";

import api from "../services/api";
import Modal from "../components/Modal";
import Loading from "../components/Loading";

const emptyForm = {
  product_code: "",
  name: "",
  description: "",
  hsn_sac: "",
  unit: "PCS",
  price: "",
  gst_rate: "18",
};

function Products() {
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products", {
        params: {
          search: search || undefined,
        },
      });

      setProducts(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);

    setForm({
      product_code: product.product_code || "",
      name: product.name || "",
      description: product.description || "",
      hsn_sac: product.hsn_sac || "",
      unit: product.unit || "PCS",
      price: product.price ?? "",
      gst_rate: product.gst_rate ?? "18",
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (!saving) {
      setShowModal(false);
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        price: Number(form.price),
        gst_rate: Number(form.gst_rate),
      };

      if (editingProduct) {
        await api.put(
          `/products/${editingProduct.id}`,
          payload
        );
      } else {
        await api.post(
          "/products",
          payload
        );
      }

      setShowModal(false);

      await loadProducts();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivateProduct = async (product) => {
    const confirmed = window.confirm(
      `Deactivate ${product.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/products/${product.id}`
      );

      await loadProducts();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to deactivate product."
      );
    }
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Products</h2>

          <p>
            Manage products, pricing and GST
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openCreateModal}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search by code, name or HSN/SAC..."
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
          <Loading text="Loading products..." />
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <PackageX size={32} />
            </div>

            <h3>No products found</h3>

            <p>
              Add your first product to get started.
            </p>

            <button
              className="primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>HSN/SAC</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>GST</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>
                        {product.product_code}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {product.name}
                      </strong>

                      {product.description && (
                        <div className="table-description">
                          {product.description}
                        </div>
                      )}
                    </td>

                    <td>
                      {product.hsn_sac || "-"}
                    </td>

                    <td>
                      {product.unit}
                    </td>

                    <td>
                      ₹
                      {Number(
                        product.price
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      {Number(
                        product.gst_rate
                      )}%
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="action-button"
                          onClick={() =>
                            openEditModal(product)
                          }
                          title="Edit"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="action-button danger"
                          onClick={() =>
                            deactivateProduct(
                              product
                            )
                          }
                          title="Deactivate"
                        >
                          <PackageX size={17} />
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
            editingProduct
              ? "Edit Product"
              : "Add Product"
          }
          onClose={closeModal}
        >
          <form
            className="product-form"
            onSubmit={saveProduct}
          >
            <div className="form-grid">
              <FormField
                label="Product Code"
                name="product_code"
                value={form.product_code}
                onChange={handleChange}
                required
              />

              <FormField
                label="Product Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />

              <FormField
                label="HSN / SAC"
                name="hsn_sac"
                value={form.hsn_sac}
                onChange={handleChange}
              />

              <div className="form-group">
                <label>Unit</label>

                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                >
                  <option value="PCS">
                    PCS
                  </option>

                  <option value="SET">
                    SET
                  </option>

                  <option value="BOX">
                    BOX
                  </option>

                  <option value="KG">
                    KG
                  </option>

                  <option value="MTR">
                    MTR
                  </option>

                  <option value="MONTH">
                    MONTH
                  </option>

                  <option value="YEAR">
                    YEAR
                  </option>

                  <option value="SERVICE">
                    SERVICE
                  </option>
                </select>
              </div>

              <FormField
                label="Price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
              />

              <FormField
                label="GST Rate (%)"
                name="gst_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.gst_rate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="4"
                placeholder="Product description..."
              />
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
                  : editingProduct
                    ? "Update Product"
                    : "Save Product"}
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
  min,
  max,
  step,
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
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

export default Products;