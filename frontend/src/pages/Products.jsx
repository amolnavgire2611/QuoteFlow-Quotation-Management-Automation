import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  PackageX,
  Upload,
  FileDown,
  ImagePlus,
} from "lucide-react";

import api from "../services/api";
import Modal from "../components/Modal";
import Loading from "../components/Loading";

const emptyForm = {
  product_code: "",
  name: "",
  category: "",
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
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const importInput = useRef(null);
  const imageInput = useRef(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products", {
        params: {
          search: search || undefined,
          category: categoryFilter || undefined,
          limit: 100,
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
  }, [search, categoryFilter]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const loadCategories = async () => {
    try {
      const { data } = await api.get("/products/categories");
      setCategories(data);
    } catch {
      setCategories([]);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const { data } = await api.post("/products/categories", { name });
      await loadCategories();
      setForm((current) => ({ ...current, category: data.name }));
      setNewCategory("");
      setShowAddCategory(false);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create category.");
    }
  };

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
    setImageFile(null);
    setImagePreview("");
    setError("");
    setShowAddCategory(false);
    setNewCategory("");
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);

    setForm({
      product_code: product.product_code || "",
      name: product.name || "",
      category: product.category || "",
      description: product.description || "",
      hsn_sac: product.hsn_sac || "",
      unit: product.unit || "PCS",
      price: product.price ?? "",
      gst_rate: product.gst_rate ?? "18",
    });

    setImageFile(null);
    setImagePreview(product.image_path ? productImageUrl(product.image_path) : "");

    setError("");
    setShowAddCategory(false);
    setNewCategory("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (!saving) {
      setShowModal(false);
      setShowAddCategory(false);
      setNewCategory("");
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        category: form.category.trim() || null,
        price: Number(form.price),
        gst_rate: Number(form.gst_rate),
      };

      if (editingProduct) {
        const response = await api.put(
          `/products/${editingProduct.id}`,
          payload
        );
        if (imageFile) await uploadProductImage(response.data.id);
      } else {
        const response = await api.post(
          "/products",
          payload
        );
        setEditingProduct(response.data);
        if (imageFile) await uploadProductImage(response.data.id);
      }

      setShowModal(false);

      await loadProducts();
      await loadCategories();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadProductImage = async (productId) => {
    const payload = new FormData();
    payload.append("file", imageFile);
    await api.post(`/products/${productId}/image`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Product images must be 5 MB or smaller.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const importProducts = async (event) => {
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
      const { data } = await api.post("/products/import", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadCategories();
      setImportMessage(`${data.imported} product(s) imported; ${data.failed} row(s) need correction.`);
      if (data.errors?.length) {
        setError(data.errors.slice(0, 5).map((item) => `Row ${item.row}: ${item.message}`).join(" "));
      }
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to import products.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const { data } = await api.get("/products/import/template", { responseType: "blob" });
      downloadBlob(data, "products-import-template.xlsx");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to download the Excel template.");
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

        <div className="page-title-actions">
          <button className="secondary-button" type="button" onClick={downloadTemplate}>
            <FileDown size={17} /> Excel template
          </button>
          <button className="secondary-button" type="button" onClick={() => importInput.current?.click()} disabled={importing}>
            <Upload size={17} /> {importing ? "Importing..." : "Import Excel"}
          </button>
          <input ref={importInput} className="visually-hidden-input" type="file" accept=".xlsx" onChange={importProducts} />
          <button className="primary-button" onClick={openCreateModal}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {importMessage && <div className="success-message" role="status">{importMessage}</div>}

      <div className="toolbar">
        <div className="master-data-filters">
          <div className="search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search by code, name or HSN/SAC..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter products by category">
            <option value="">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
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
                  <th>Image</th>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Category</th>
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
                      {product.image_path ? (
                        <img className="product-thumbnail" src={productImageUrl(product.image_path)} alt={product.name} />
                      ) : <span className="product-thumbnail-placeholder"><ImagePlus size={17} /></span>}
                    </td>
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

                    <td>{product.category || "—"}</td>

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

              <div className="form-group product-category-field">
                <label htmlFor="product-category">Category</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <select
                    id="product-category"
                    name="category"
                    value={form.category}
                    onChange={(event) => {
                      if (event.target.value === "__add_category__") {
                        setShowAddCategory(true);
                        return;
                      }
                      setForm((current) => ({ ...current, category: event.target.value }));
                    }}
                    style={{ flex: 1 }}
                  >
                    <option value="">No category</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    <option value="__add_category__">＋ Add new category…</option>
                  </select>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowAddCategory((current) => !current)}
                  >
                    {showAddCategory ? "Hide" : "Add category"}
                  </button>
                </div>
                {showAddCategory && (
                  <div className="product-new-category" style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <input
                      autoFocus
                      maxLength={100}
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                      placeholder="New category name"
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="secondary-button" onClick={handleCreateCategory}>Add</button>
                    <button type="button" className="secondary-button" onClick={() => { setShowAddCategory(false); setNewCategory(""); }}>Cancel</button>
                  </div>
                )}
              </div>

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

            <div className="product-image-control">
              <div className="product-image-preview">
                {imagePreview ? <img src={imagePreview} alt="Product preview" /> : <ImagePlus size={23} />}
              </div>
              <div>
                <strong>Product image</strong>
                <p>PNG, JPEG, or WebP · Maximum 5 MB</p>
                <button type="button" className="secondary-button" onClick={() => imageInput.current?.click()}>
                  <Upload size={16} /> {imageFile ? "Change image" : "Choose image"}
                </button>
                <input ref={imageInput} className="visually-hidden-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
              </div>
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
  placeholder,
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
        placeholder={placeholder}
      />
    </div>
  );
}

function productImageUrl(imagePath) {
  const filename = String(imagePath || "").split(/[\\/]/).pop();
  return `${api.defaults.baseURL}/product-images/${encodeURIComponent(filename)}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default Products;