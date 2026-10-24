import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './UsersPage.css';

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

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/manufacturing-units');
      if (!res.ok) throw new Error('Failed to load manufacturing units');
      setUnits(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message || 'Unable to load manufacturing units');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      setModalOpen(false);
      await load();
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
          <h1>Manufacturing Unit</h1>
          <p className="subtitle">
            {units.length} unit{units.length === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={openModal}>
          Add unit
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading manufacturing units…</p>
      ) : units.length === 0 ? (
        <p className="muted">No manufacturing units yet.</p>
      ) : (
        <ul className="user-list">
          {units.map((unit) => (
            <li key={unit.id} className="user-row">
              <div className="user-meta">
                <strong>{unit.name}</strong>
                <span className="muted-line">
                  {unit.location} · capacity {unit.capacity}
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
