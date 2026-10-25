import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchJson, inflightJson } from '../../shared/api/inflightFetch.js';
import { USER_ROLES, roleLabel, userStatusBadge } from './userLabels.js';

const emptyForm = {
  name: '',
  email: '',
  role: 'quality_engineer',
  supervisor_id: '',
};

function usersUrl(query) {
  const qs = query ? `?q=${encodeURIComponent(query)}` : '';
  return `/api/users${qs}`;
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const searchRef = useRef(search);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const supervisors = useMemo(
    () =>
      users.filter(
        (u) => u.status === 'active' && Array.isArray(u.roles) && u.roles.includes('supervisor')
      ),
    [users]
  );

  useEffect(() => {
    let cancelled = false;
    const query = search.trim();
    const delayMs = query ? 250 : 0;

    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      const url = usersUrl(query);
      inflightJson(`GET ${url}`, url, { errorMessage: 'Failed to load users' })
        .then((data) => {
          if (cancelled) return;
          setUsers(data);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message || 'Unable to load users');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const countLabel = useMemo(() => {
    const n = users.length;
    return `${n} user${n === 1 ? '' : 's'}`;
  }, [users.length]);

  function openModal() {
    setForm({
      ...emptyForm,
      supervisor_id: supervisors[0] ? String(supervisors[0].id) : '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  async function reloadUsers() {
    setLoading(true);
    setError(null);
    try {
      const query = searchRef.current.trim();
      const url = usersUrl(query);
      setUsers(await fetchJson(url, { errorMessage: 'Failed to load users' }));
    } catch (err) {
      setError(err.message || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    if (form.role === 'quality_engineer' && !form.supervisor_id) {
      setFormError('Please select a supervisor');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      if (form.role === 'quality_engineer') {
        payload.supervisor_id = Number(form.supervisor_id);
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to create user');
      setModalOpen(false);
      setForm(emptyForm);
      await reloadUsers();
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
          <h1>Users</h1>
          <p className="subtitle">{countLabel}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="primary-btn" onClick={openModal}>
            Add user
          </button>
        </div>
      </header>

      <div className="search-row">
        <input
          type="search"
          className="search-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="empty-state">No users found.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Supervisor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                  </td>
                  <td className="cell-muted">{user.email}</td>
                  <td>
                    <div className="row-tags">
                      {(user.roles || []).map((role) => (
                        <span key={role} className="badge badge-neutral">
                          {roleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="cell-muted">{user.supervisor?.name || '—'}</td>
                  <td>
                    <span className={userStatusBadge(user.status)}>{user.status}</span>
                  </td>
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
            aria-labelledby="add-user-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="add-user-title">Add user</h2>
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
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  disabled={submitting}
                />
              </label>
              <label>
                Role
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value,
                      supervisor_id:
                        e.target.value === 'quality_engineer'
                          ? f.supervisor_id || (supervisors[0] ? String(supervisors[0].id) : '')
                          : '',
                    }))
                  }
                  required
                  disabled={submitting}
                >
                  {USER_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              {form.role === 'quality_engineer' && (
                <label>
                  Supervisor
                  <select
                    value={form.supervisor_id}
                    onChange={(e) => setForm((f) => ({ ...f, supervisor_id: e.target.value }))}
                    required
                    disabled={submitting || supervisors.length === 0}
                  >
                    <option value="" disabled>
                      {supervisors.length === 0
                        ? 'No supervisors available'
                        : 'Select a supervisor'}
                    </option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name} ({supervisor.email})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {form.role === 'quality_engineer' && supervisors.length === 0 && (
                <p className="error">Add a supervisor first before creating a quality engineer.</p>
              )}

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
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    submitting || (form.role === 'quality_engineer' && supervisors.length === 0)
                  }
                >
                  {submitting ? 'Saving…' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
