import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AtSign } from 'lucide-react';
import { api } from '../services/api';
import './Connexion.css';

export function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [soumission, setSoumission] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');
    setMessage('');
    setSoumission(true);

    try {
      const response = await api.post('/auth/mot-de-passe-oublie/', { email });
      setMessage(
        response.data?.detail
        || "Si un compte existe pour cette adresse, un email de reinitialisation a ete envoye."
      );
    } catch (error) {
      setErreur(error.response?.data?.email?.[0] || "Demande impossible. Veuillez reessayer.");
    } finally {
      setSoumission(false);
    }
  }

  return (
    <section className="connexion-page">
      <div className="connexion-panel glass-card">
        <div className="connexion-header">
          <p className="connexion-kicker">Mot de passe oublie</p>
          <h1>Reinitialisation</h1>
          <p className="connexion-copy">
            Indiquez votre adresse email. Si un compte y est associe, vous recevrez un lien
            pour choisir un nouveau mot de passe.
          </p>
        </div>

        {message ? (
          <p className="connexion-copy" style={{ color: '#9be29b' }}>{message}</p>
        ) : (
          <form className="connexion-form" onSubmit={handleSubmit}>
            <label className="champ">
              <span>Adresse email</span>
              <div className="champ-input">
                <AtSign size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            {erreur ? <p className="erreur-connexion">{erreur}</p> : null}

            <button className="btn btn-primary btn-large" type="submit" disabled={soumission}>
              {soumission ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <p className="connexion-pied">
          <Link to="/connexion">Retour a la connexion</Link>
        </p>
      </div>
    </section>
  );
}
