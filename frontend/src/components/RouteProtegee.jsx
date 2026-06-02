import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RouteProtegee({ children, pasteurUniquement = false }) {
  const location = useLocation();
  const { estConnecte, estPasteur, loading } = useAuth();

  if (loading) {
    return <p>Chargement de votre session...</p>;
  }

  if (!estConnecte) {
    return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />;
  }

  if (pasteurUniquement && !estPasteur) {
    return <Navigate to="/" replace />;
  }

  return children;
}
