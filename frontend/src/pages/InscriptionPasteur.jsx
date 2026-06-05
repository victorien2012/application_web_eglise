import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Church, LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Connexion.css';

// Inscription dediee aux pasteurs (publication de predications).
export function InscriptionPasteur() {
  const navigate = useNavigate();
  const location = useLocation();
  const { inscription } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomAffichage, setNomAffichage] = useState('');
  const [nomEglise, setNomEglise] = useState('');
  const [erreur, setErreur] = useState('');
  const [soumission, setSoumission] = useState(false);

  const depuis = location.state?.depuis;

  function extraireErreur(error) {
    const data = error.response?.data;
    if (!data) {
      return "Inscription impossible. Veuillez reessayer.";
    }
    if (typeof data === 'string') {
      return data;
    }
    const premier = Object.values(data)[0];
    if (Array.isArray(premier)) {
      return premier[0];
    }
    return premier || "Inscription impossible. Veuillez reessayer.";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');
    setSoumission(true);

    try {
      const session = await inscription({
        username,
        email,
        password,
        est_pasteur: true,
        nom_affichage: nomAffichage,
        nom_eglise: nomEglise,
      });
      navigate(session.pasteur ? '/espace-pasteur' : depuis || '/', { replace: true });
    } catch (error) {
      setErreur(extraireErreur(error));
    } finally {
      setSoumission(false);
    }
  }

  return (
    <section className="connexion-page">
      <div className="connexion-panel glass-card">
        <div className="connexion-header">
          <p className="connexion-kicker">Compte pasteur</p>
          <h1>Inscription pasteur</h1>
          <p className="connexion-copy">
            Creez un compte pasteur pour publier vos predications, gerer votre
            bibliotheque et suivre l'audience de vos messages.
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

          <label className="champ">
            <span>Mot de passe</span>
            <div className="champ-input">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Au moins 8 caracteres"
                autoComplete="new-password"
                required
              />
            </div>
          </label>

          <label className="champ">
            <span>Nom d'affichage</span>
            <div className="champ-input">
              <UserRound size={18} />
              <input
                value={nomAffichage}
                onChange={(event) => setNomAffichage(event.target.value)}
                placeholder="Pasteur Jean Dupont"
                required
              />
            </div>
          </label>

          <label className="champ">
            <span>Nom de l'eglise (optionnel)</span>
            <div className="champ-input">
              <Church size={18} />
              <input
                value={nomEglise}
                onChange={(event) => setNomEglise(event.target.value)}
                placeholder="Eglise de la Grace"
              />
            </div>
          </label>

          {erreur ? <p className="erreur-connexion">{erreur}</p> : null}

          <button className="btn btn-primary btn-large" type="submit" disabled={soumission}>
            {soumission ? 'Creation du compte...' : "S'inscrire comme pasteur"}
          </button>
        </form>

        <p className="connexion-pied">
          Vous etes un fidele ?{' '}
          <Link to="/inscription" state={depuis ? { depuis } : undefined}>
            Inscription fidele
          </Link>
        </p>
        <p className="connexion-pied" style={{ marginTop: '0.4rem' }}>
          Deja un compte ?{' '}
          <Link to="/connexion" state={depuis ? { depuis } : undefined}>Se connecter</Link>
        </p>
      </div>
    </section>
  );
}
