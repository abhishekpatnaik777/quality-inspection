import { useEffect, useState } from 'react';
import { inflightJson } from '../lib/inflightFetch.js';

const emptyForm = {
  name: '',
  location: '',
  capacity: '',
};

export default function ManufacturingUnitsPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    inflightJson('GET /api/manufacturing-units', '/api/manufacturing-units', {
      errorMessage: 'Failed to load manufacturing units',
    })
      .then((data) => {
        if (cancelled) return;
        setUnits(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load manufacturing units');
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
      const res = await fetch('/api/manufacturing-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          location: form.location.trim(),
          capacity: Number(form.capacity),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to create manufacturing unit');
      setUnits((prev) => [...prev, body]);
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
          <h1>Manufacturing units</h1>
          <p className="subtitle">
            {units.length} unit{units.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="primary-btn" onClick={openModal}>
            Add unit
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading manufacturing units…</p>
      ) : units.length === 0 ? (
        <p className="empty-state">No manufacturing units yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <strong>{unit.name}</strong>
                  </td>
                  <td className="cell-muted">{unit.location}</td>
                  <td className="cell-muted">{unit.capacity}</td>
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
            aria-labelledby="add-unit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="add-unit-title">Add manufacturing unit</h2>
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
                Location
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  required
                  disabled={submitting}
                />
              </label>
              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
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
                  {submitting ? 'Saving…' : 'Create unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
