import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

export default function RequireQualityEngineer({ children }) {
  const { isAuthenticated, isQualityEngineer } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isQualityEngineer) {
    return <Navigate to="/" replace />;
  }

  return children;
}
