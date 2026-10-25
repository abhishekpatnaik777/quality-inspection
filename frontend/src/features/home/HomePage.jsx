import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import AppShell from '../../layout/AppShell.jsx';
import { fetchAllPages } from '../../shared/api/pagination.js';

const ROLE_USER_PICKER = {
  supervisor: {
    label: 'Supervisor',
    loading: 'Loading supervisors…',
    empty: 'No supervisors found. Please ask an admin to add a supervisor.',
    loadError: 'Failed to load supervisors',
    placeholder: 'Select a supervisor',
  },
  quality_engineer: {
    label: 'Quality engineer',
    loading: 'Loading quality engineers…',
    empty: 'No quality engineers found. Please ask an admin to add a quality engineer.',
    loadError: 'Failed to load quality engineers',
    placeholder: 'Select a quality engineer',
  },
};

const ADMIN_SHORTCUTS = [
  {
    to: '/admin/dashboard',
    title: 'Dashboard',
    description: 'Inspection metrics across all quality engineers',
  },
  {
    to: '/admin/inspections',
    title: 'Inspections',
    description: 'Browse all logged inspections',
  },
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
              ? 'Review all inspections and manage catalog data and team accounts.'
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
  const [selectedRole, setSelectedRole] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [pickerError, setPickerError] = useState(null);

  const needsUser = Boolean(ROLE_USER_PICKER[selectedRole]);
  const pickerCopy = ROLE_USER_PICKER[selectedRole] ?? null;

  useEffect(() => {
    if (!needsUser || !pickerCopy) {
      setCandidates([]);
      setSelectedUserId('');
      setPickerError(null);
      setLoadingCandidates(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingCandidates(true);
    setPickerError(null);
    setSelectedUserId('');
    setCandidates([]);

    fetchAllPages(`/api/users?role=${encodeURIComponent(selectedRole)}`, {
      errorMessage: pickerCopy.loadError,
    })
      .then((users) => {
        if (cancelled) return;
        const list = users.filter(
          (u) => u.status === 'active' && Array.isArray(u.roles) && u.roles.includes(selectedRole)
        );
        setCandidates(list);
        if (list.length === 1) {
          setSelectedUserId(String(list[0].id));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPickerError(err.message || pickerCopy.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [needsUser, pickerCopy, selectedRole]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedRole) return;

    if (!needsUser) {
      login({ role: selectedRole });
      return;
    }

    const selected = candidates.find((c) => String(c.id) === selectedUserId);
    if (!selected) return;

    login({
      role: selectedRole,
      user: {
        id: selected.id,
        name: selected.name,
        email: selected.email,
      },
    });
  }

  const canSubmit =
    Boolean(selectedRole) &&
    (!needsUser || (Boolean(selectedUserId) && !loadingCandidates && !pickerError));

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="eyebrow">Quality Inspection</p>
        <h1>Sign in</h1>
        <p className="subtitle">Choose a role to continue.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Role
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} required>
              <option value="" disabled>
                Select a role
              </option>
              {loginRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          {needsUser && pickerCopy ? (
            <>
              {loadingCandidates ? (
                <p className="muted">{pickerCopy.loading}</p>
              ) : pickerError ? (
                <p className="error">{pickerError}</p>
              ) : candidates.length === 0 ? (
                <p className="empty-message">{pickerCopy.empty}</p>
              ) : (
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
              )}
            </>
          ) : null}

          <button type="submit" className="primary-btn login-submit" disabled={!canSubmit}>
            Login
          </button>
        </form>
      </div>
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
