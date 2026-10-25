import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

/** Quality engineers and supervisors can view inspection detail. */
export default function RequireInspectionAccess({ children }) {
  const { isAuthenticated, isQualityEngineer, isSupervisor } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isQualityEngineer && !isSupervisor) {
    return <Navigate to="/" replace />;
  }

  return children;
}
