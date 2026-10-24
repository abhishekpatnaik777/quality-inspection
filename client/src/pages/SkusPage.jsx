import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SKU_CATEGORIES, categoryLabel } from '../lib/catalog.js';
import './UsersPage.css';

const emptyForm = {
  name: '',
  category: 'electronics',
  model: '',
};

export default function SkusPage() {
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSkus() {
      try {
        const res = await fetch('/api/skus', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load SKUs');
        const data = await res.json();
        setSkus(data);
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Unable to load SKUs');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSkus();
    return () => controller.abort();
  }, []);

  function openModal() {
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          model: form.model.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to create SKU');
      setSkus((prev) => [...prev, body]);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="users-page">
      <header className="users-header">
        <div>
          <Link to="/" className="back-link">
            ← Dashboard
          </Link>
          <h1>SKU</h1>
          <p className="subtitle">
            {skus.length} SKU{skus.length === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={openModal}>
          Add SKU
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading SKUs…</p>
      ) : skus.length === 0 ? (
        <p className="muted">No SKUs yet.</p>
      ) : (
        <ul className="user-list">
          {skus.map((sku) => (
            <li key={sku.id} className="user-row">
              <div className="user-meta">
                <strong>{sku.name}</strong>
                <span className="muted-line">
                  {categoryLabel(sku.category)} · {sku.model}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-sku-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="add-sku-title">Add SKU</h2>
              <button
                type="button"
                className="ghost-btn"
                onClick={closeModal}
                disabled={submitting}
              >
                Close
              </button>
            </div>
            <form className="modal-form" onSubmit={handleCreate}>
              <label>
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  disabled={submitting}
                  autoFocus
                />
              </label>
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                  disabled={submitting}
                >
                  {SKU_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Model
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  required
                  disabled={submitting}
                />
              </label>
              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Create SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
