import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

export default function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
