import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

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
