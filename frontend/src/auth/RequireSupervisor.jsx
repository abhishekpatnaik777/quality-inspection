import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

export default function RequireSupervisor({ children }) {
  const { isAuthenticated, isSupervisor } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isSupervisor) {
    return <Navigate to="/" replace />;
  }

  return children;
}
