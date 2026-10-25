import { useEffect, useState } from 'react';
import { inflightJson } from '../../shared/api/inflightFetch.js';
import { SKU_CATEGORIES, categoryLabel } from './skuLabels.js';

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
    let cancelled = false;

    inflightJson('GET /api/skus', '/api/skus', { errorMessage: 'Failed to load SKUs' })
      .then((data) => {
        if (cancelled) return;
        setSkus(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load SKUs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
    <div className="page">
      <header className="page-header">
        <div>
          <h1>SKUs</h1>
          <p className="subtitle">
            {skus.length} SKU{skus.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="primary-btn" onClick={openModal}>
            Add SKU
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading SKUs…</p>
      ) : skus.length === 0 ? (
        <p className="empty-state">No SKUs yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Model</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => (
                <tr key={sku.id}>
                  <td>
                    <strong>{sku.name}</strong>
                  </td>
                  <td className="cell-muted">{categoryLabel(sku.category)}</td>
                  <td className="cell-muted">{sku.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
