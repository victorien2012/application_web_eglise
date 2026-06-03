import { Link } from 'react-router-dom';
import './PiedDePage.css';

export function PiedDePage() {
  return (
    <footer className="pied-de-page">
      <nav className="pied-de-page-liens" aria-label="Liens legaux">
        <Link to="/mentions-legales">Mentions legales</Link>
        <Link to="/confidentialite">Confidentialite</Link>
        <Link to="/cookies">Cookies</Link>
        <Link to="/conditions">Conditions d'utilisation</Link>
      </nav>
      <p className="pied-de-page-copyright">
        Plateforme Eglise — Version web. Tous droits reserves.
      </p>
    </footer>
  );
}
