import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

/** Quality engineers, supervisors, and admins can view inspection detail. */
export default function RequireInspectionAccess({ children }) {
  const { isAuthenticated, isAdmin, isQualityEngineer, isSupervisor } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin && !isQualityEngineer && !isSupervisor) {
    return <Navigate to="/" replace />;
  }

  return children;
}
