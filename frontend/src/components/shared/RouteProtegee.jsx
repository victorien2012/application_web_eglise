import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function RouteProtegee({ children, pasteurUniquement = false, adminUniquement = false }) {
  const location = useLocation();
  const { estConnecte, estPasteur, estAdmin, loading } = useAuth();

  if (loading) {
    return <p>Chargement de votre session...</p>;
  }

  if (!estConnecte) {
    // Envoyer un visiteur vers le bon formulaire de connexion : viser l'espace
    // pasteur puis atterrir sur la connexion « fidèle » obligeait a repartir
    // chercher soi-meme le bon ecran.
    const pageConnexion = pasteurUniquement ? '/compte-pasteur' : '/compte-fidele';
    return <Navigate to={pageConnexion} replace state={{ depuis: location.pathname }} />;
  }

  if (pasteurUniquement && !estPasteur) {
    return <Navigate to="/" replace />;
  }

  if (adminUniquement && !estAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
