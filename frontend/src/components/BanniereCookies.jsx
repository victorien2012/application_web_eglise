import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import './BanniereCookies.css';

const CLE_CONSENTEMENT = 'cookie_consent';

export function BanniereCookies() {
  const [accepte, setAccepte] = useState(() => {
    try {
      return window.localStorage.getItem(CLE_CONSENTEMENT) === 'true';
    } catch {
      return true;
    }
  });

  if (accepte) {
    return null;
  }

  function accepter() {
    try {
      window.localStorage.setItem(CLE_CONSENTEMENT, 'true');
    } catch {
      // ignore
    }
    setAccepte(true);
  }

  return (
    <div className="banniere-cookies" role="dialog" aria-label="Consentement aux cookies">
      <span className="banniere-cookies-texte">
        <Cookie size={16} />
        Nous utilisons uniquement un stockage technique necessaire a votre session.
        En savoir plus dans notre <Link to="/cookies">politique de cookies</Link>.
      </span>
      <button type="button" className="btn btn-primary banniere-cookies-bouton" onClick={accepter}>
        J'ai compris
      </button>
    </div>
  );
}
