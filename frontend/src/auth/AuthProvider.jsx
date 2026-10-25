import { useMemo, useState } from 'react';
import { AuthContext } from './authContext.js';
import { LOGIN_ROLES } from './loginRoles.js';

const STORAGE_KEY = 'qi.session';

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!LOGIN_ROLES.some((role) => role.value === parsed?.role)) return null;
    return {
      role: parsed.role,
      user: parsed.user ?? null,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const value = useMemo(
    () => ({
      role: session?.role ?? null,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.role),
      isAdmin: session?.role === 'admin',
      isSupervisor: session?.role === 'supervisor',
      isQualityEngineer: session?.role === 'quality_engineer',
      loginRoles: LOGIN_ROLES,
      login({ role, user = null }) {
        if (!LOGIN_ROLES.some((item) => item.value === role)) return;
        const next = { role, user };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
      },
      logout() {
        sessionStorage.removeItem(STORAGE_KEY);
        setSession(null);
      },
      roleLabel: LOGIN_ROLES.find((item) => item.value === session?.role)?.label ?? session?.role,
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
