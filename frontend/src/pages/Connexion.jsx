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

  const destination = location.state?.depuis || '/espace-pasteur';

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');
    setSoumission(true);

    try {
      const session = await connexion({ username, password });
      navigate(session.pasteur ? destination : '/', { replace: true });
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
            Connectez-vous pour acceder a votre espace pasteur et gerer vos predications.
          </p>
        </div>

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
          Pas encore de compte ? <Link to="/inscription">Creer un compte</Link>
        </p>
      </div>
    </section>
  );
}
