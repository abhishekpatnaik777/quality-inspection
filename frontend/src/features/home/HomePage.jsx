import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import AppShell from '../../layout/AppShell.jsx';
import { fetchAllPages } from '../../shared/api/pagination.js';

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

const ADMIN_SHORTCUTS = [
  { to: '/users', title: 'Users', description: 'Manage accounts and roles' },
  { to: '/skus', title: 'SKUs', description: 'Product catalog models' },
  {
    to: '/manufacturing-units',
    title: 'Manufacturing units',
    description: 'Plant locations and capacity',
  },
  { to: '/products', title: 'Products', description: 'Generate and review batches' },
];

const ENGINEER_SHORTCUTS = [
  { to: '/inspections', title: 'Start inspection', description: 'Begin a new quality check' },
  { to: '/inspections/view', title: 'Inspections', description: 'Review past inspections' },
];

const SUPERVISOR_SHORTCUTS = [
  {
    to: '/supervisor/dashboard',
    title: 'Dashboard',
    description: 'Summary metrics over inspections logged by your team',
  },
  {
    to: '/supervisor/inspections',
    title: 'Team inspections',
    description: 'Review logged inspections from your quality engineers',
  },
];

function DashboardHome() {
  const { isAdmin, isQualityEngineer, isSupervisor, roleLabel, user } = useAuth();
  const shortcuts = isAdmin
    ? ADMIN_SHORTCUTS
    : isQualityEngineer
      ? ENGINEER_SHORTCUTS
      : isSupervisor
        ? SUPERVISOR_SHORTCUTS
        : [];
  const greetingName = user?.name || roleLabel;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Welcome{greetingName ? `, ${greetingName}` : ''}</h1>
          <p className="subtitle">
            {isAdmin
              ? 'Manage catalog data and team accounts.'
              : isQualityEngineer
                ? 'Run inspections and verify AI predictions.'
                : isSupervisor
                  ? 'Review inspections logged by your quality engineers.'
                  : 'No sections are available for this role yet.'}
          </p>
        </div>
      </header>

      {shortcuts.length > 0 ? (
        <div className="card-grid">
          {shortcuts.map((item) => (
            <Link key={item.to} to={item.to} className="shortcut-card">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty-state">No sections available for this role yet.</p>
      )}
    </div>
  );
}

function LoginHome() {
  const { login, loginRoles } = useAuth();
  const [pickerRole, setPickerRole] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [pickerError, setPickerError] = useState(null);

  async function openRolePicker(roleValue) {
    const copy = ROLE_PICKER[roleValue];
    if (!copy) return;

    setPickerRole(roleValue);
    setLoadingCandidates(true);
    setPickerError(null);
    setSelectedUserId('');
    setCandidates([]);

    try {
      const users = await fetchAllPages(`/api/users?role=${encodeURIComponent(roleValue)}`, {
        errorMessage: copy.loadError,
      });
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

  const pickerCopy = pickerRole ? ROLE_PICKER[pickerRole] : null;

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="eyebrow">Quality Inspection</p>
        <h1>Sign in</h1>
        <p className="subtitle">Choose a role to continue.</p>

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
      </div>

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

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginHome />;
  }

  return (
    <AppShell>
      <DashboardHome />
    </AppShell>
  );
}
