import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Connexion.css';

export function Connexion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { connexion } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');
  const [soumission, setSoumission] = useState(false);

  const depuis = location.state?.depuis;
  const info = location.state?.info;

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');
    setSoumission(true);

    try {
      const session = await connexion({ username, password });
      // Retour a la page d'origine si fournie (ex: ressource a telecharger),
      // sinon espace pasteur pour un pasteur, accueil pour un fidele.
      navigate(depuis || (session.pasteur ? '/espace-pasteur' : '/'), { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || "Connexion impossible avec ces identifiants.";
      setErreur(message);
    } finally {
      setSoumission(false);
    }
  }

  return (
    <section className="connexion-page">
      <div className="connexion-panel glass-card">
        <div className="connexion-header">
          <p className="connexion-kicker">Acces securise</p>
          <h1>Connexion</h1>
          <p className="connexion-copy">
            Connectez-vous pour telecharger les ressources, suivre vos pasteurs et,
            si vous etes pasteur, gerer vos predications.
          </p>
        </div>

        {info ? (
          <p className="connexion-copy" style={{ color: '#9be29b' }}>{info}</p>
        ) : null}

        <form className="connexion-form" onSubmit={handleSubmit}>
          <label className="champ">
            <span>Nom d'utilisateur</span>
            <div className="champ-input">
              <UserRound size={18} />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="pasteur.exemple"
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className="champ">
            <span>Mot de passe</span>
            <div className="champ-input">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {erreur ? <p className="erreur-connexion">{erreur}</p> : null}

          <button className="btn btn-primary btn-large" type="submit" disabled={soumission}>
            {soumission ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="connexion-pied">
          <Link to="/mot-de-passe-oublie">Mot de passe oublie ?</Link>
        </p>
        <p className="connexion-pied" style={{ marginTop: '0.4rem' }}>
          Pas encore de compte ?{' '}
          <Link to="/inscription" state={depuis ? { depuis } : undefined}>Inscription fidele</Link>
          {' · '}
          <Link to="/inscription-pasteur" state={depuis ? { depuis } : undefined}>Inscription pasteur</Link>
        </p>
      </div>
    </section>
  );
}
