import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './BanniereEmail.css';

export function BanniereEmail() {
  const { estConnecte, emailVerifie, renvoyerVerification } = useAuth();
  const [etat, setEtat] = useState('initial'); // initial | envoi | envoye | erreur

  if (!estConnecte || emailVerifie) {
    return null;
  }

  async function handleRenvoi() {
    setEtat('envoi');
    try {
      await renvoyerVerification();
      setEtat('envoye');
    } catch {
      setEtat('erreur');
    }
  }

  return (
    <div className="banniere-email">
      <span className="banniere-email-texte">
        <MailWarning size={16} />
        Votre adresse email n'est pas encore verifiee. Verifiez vos emails pour activer toutes les fonctionnalites.
      </span>
      {etat === 'envoye' ? (
        <span className="banniere-email-statut">Email renvoye.</span>
      ) : (
        <button
          type="button"
          className="btn app-ghost-button banniere-email-bouton"
          onClick={handleRenvoi}
          disabled={etat === 'envoi'}
        >
          {etat === 'envoi' ? 'Envoi...' : "Renvoyer l'email"}
        </button>
      )}
      {etat === 'erreur' ? (
        <span className="banniere-email-statut">Echec de l'envoi.</span>
      ) : null}
    </div>
  );
}
