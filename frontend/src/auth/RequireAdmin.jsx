import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

export default function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
