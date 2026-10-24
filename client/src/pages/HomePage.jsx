import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import './HomePage.css';

const ROLE_PICKER = {
  supervisor: {
    title: 'Select supervisor',
    label: 'Supervisor',
    loading: 'Loading supervisors…',
    empty: 'No supervisors found. Please ask an admin to add a supervisor.',
    loadError: 'Failed to load supervisors',
    placeholder: 'Select a supervisor',
  },
  quality_engineer: {
    title: 'Select quality engineer',
    label: 'Quality engineer',
    loading: 'Loading quality engineers…',
    empty: 'No quality engineers found. Please ask an admin to add a quality engineer.',
    loadError: 'Failed to load quality engineers',
    placeholder: 'Select a quality engineer',
  },
};

export default function HomePage() {
  const { isAuthenticated, isAdmin, login, logout, loginRoles, roleLabel, user } = useAuth();
  const [health, setHealth] = useState(null);
  const [pickerRole, setPickerRole] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [pickerError, setPickerError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth({ status: 'down', database: 'unknown' });
      }
    }

    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openRolePicker(roleValue) {
    const copy = ROLE_PICKER[roleValue];
    if (!copy) return;

    setPickerRole(roleValue);
    setLoadingCandidates(true);
    setPickerError(null);
    setSelectedUserId('');
    setCandidates([]);

    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error(copy.loadError);
      const users = await res.json();
      const list = users.filter(
        (u) => u.status === 'active' && Array.isArray(u.roles) && u.roles.includes(roleValue)
      );
      setCandidates(list);
      if (list.length === 1) {
        setSelectedUserId(String(list[0].id));
      }
    } catch (err) {
      setPickerError(err.message || copy.loadError);
    } finally {
      setLoadingCandidates(false);
    }
  }

  function closeRolePicker() {
    setPickerRole(null);
    setPickerError(null);
  }

  function confirmRoleLogin(e) {
    e.preventDefault();
    const selected = candidates.find((c) => String(c.id) === selectedUserId);
    if (!selected || !pickerRole) return;

    login({
      role: pickerRole,
      user: {
        id: selected.id,
        name: selected.name,
        email: selected.email,
      },
    });
    setPickerRole(null);
  }

  function handleLoginClick(roleValue) {
    if (roleValue === 'supervisor' || roleValue === 'quality_engineer') {
      openRolePicker(roleValue);
      return;
    }
    login({ role: roleValue });
  }

  const signedInLabel = user?.name ? `${roleLabel} (${user.name})` : roleLabel;
  const pickerCopy = pickerRole ? ROLE_PICKER[pickerRole] : null;

  return (
    <div className="home">
      <header className="home-header">
        <div>
          <p className="eyebrow">Quality Inspection</p>
          <h1>{isAuthenticated ? 'Dashboard' : 'Welcome'}</h1>
          <p className="subtitle">
            {isAuthenticated ? `Signed in as ${signedInLabel}.` : 'Choose a role to continue.'}
          </p>
        </div>
        <div className="home-header-actions">
          <div className={`health ${health?.database === 'connected' ? 'ok' : 'bad'}`}>
            <span className="dot" />
            {health ? `API ${health.status} · DB ${health.database}` : 'Checking…'}
          </div>
          {isAuthenticated && (
            <button type="button" className="logout-btn" onClick={logout}>
              Log out
            </button>
          )}
        </div>
      </header>

      {!isAuthenticated ? (
        <div className="login-actions" aria-label="Login options">
          {loginRoles.map((role) => (
            <button
              key={role.value}
              type="button"
              className="login-btn"
              onClick={() => handleLoginClick(role.value)}
            >
              Login as {role.label}
            </button>
          ))}
        </div>
      ) : isAdmin ? (
        <nav className="home-tabs" aria-label="Sections">
          <Link to="/users" className="home-tab">
            Users
          </Link>
        </nav>
      ) : (
        <p className="muted">No sections available for this role yet.</p>
      )}

      {pickerCopy && (
        <div className="modal-backdrop" role="presentation" onClick={closeRolePicker}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-login-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="role-login-title">{pickerCopy.title}</h2>
              <button type="button" className="ghost-btn" onClick={closeRolePicker}>
                Close
              </button>
            </div>

            {loadingCandidates ? (
              <p className="muted">{pickerCopy.loading}</p>
            ) : pickerError ? (
              <p className="error">{pickerError}</p>
            ) : candidates.length === 0 ? (
              <p className="empty-message">{pickerCopy.empty}</p>
            ) : (
              <form className="modal-form" onSubmit={confirmRoleLogin}>
                <label>
                  {pickerCopy.label}
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      {pickerCopy.placeholder}
                    </option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} ({candidate.email})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="modal-actions">
                  <button type="button" className="ghost-btn" onClick={closeRolePicker}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn" disabled={!selectedUserId}>
                    Continue
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
