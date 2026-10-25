import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { sharedInflight } from '../lib/inflightFetch.js';
import './AppShell.css';

const ADMIN_NAV = [
  { to: '/users', label: 'Users' },
  { to: '/skus', label: 'SKUs' },
  { to: '/manufacturing-units', label: 'Manufacturing units' },
  { to: '/products', label: 'Products' },
];

const ENGINEER_NAV = [
  { to: '/inspections', label: 'Start inspection', end: true },
  { to: '/inspections/view', label: 'Inspections' },
];

const SUPERVISOR_NAV = [
  { to: '/supervisor/dashboard', label: 'Dashboard' },
  { to: '/supervisor/inspections', label: 'Team inspections' },
];

function fetchHealth() {
  return sharedInflight('GET /api/health', () =>
    fetch('/api/health')
      .then((res) => res.json())
      .catch(() => ({ status: 'down', database: 'unknown' }))
  );
}

export default function AppShell({ children }) {
  const { isAdmin, isQualityEngineer, isSupervisor, logout, roleLabel, user } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [health, setHealth] = useState(null);

  const navItems = isAdmin
    ? ADMIN_NAV
    : isQualityEngineer
      ? ENGINEER_NAV
      : isSupervisor
        ? SUPERVISOR_NAV
        : [];

  useEffect(() => {
    let cancelled = false;
    fetchHealth().then((data) => {
      if (!cancelled) setHealth(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!navOpen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setNavOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const healthOk = health?.database === 'connected';
  const healthLabel = health ? `API ${health.status} · DB ${health.database}` : 'Checking…';

  return (
    <div className={`app-shell${navOpen ? ' nav-open' : ''}`}>
      <div className="app-overlay" role="presentation" onClick={() => setNavOpen(false)} />

      <aside className="app-sidebar" aria-label="Main navigation">
        <Link to="/" className="app-brand" onClick={() => setNavOpen(false)}>
          <span className="app-brand-mark" aria-hidden="true">
            QI
          </span>
          <span className="app-brand-text">Quality Inspection</span>
        </Link>

        <nav className="app-nav">
          {navItems.length === 0 ? (
            <p className="app-nav-empty">No sections available for this role yet.</p>
          ) : (
            navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}
                onClick={() => setNavOpen(false)}
              >
                {item.label}
              </NavLink>
            ))
          )}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <button
              type="button"
              className="app-menu-btn"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen}
              onClick={() => setNavOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {navOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>

          <div className="app-topbar-right">
            <div className={`health-pill ${healthOk ? 'ok' : 'bad'}`} title={healthLabel}>
              <span className="dot" />
              <span className="health-label">{healthLabel}</span>
            </div>
            <div className="app-user">
              <span className="app-user-name">{user?.name || roleLabel}</span>
              <span className="app-user-role">{user?.name ? roleLabel : 'Signed in'}</span>
            </div>
            <button type="button" className="ghost-btn" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <main className="app-content">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
