import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { api } from '../services/api';
import './Connexion.css';

export function ReinitialiserMotDePasse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [soumission, setSoumission] = useState(false);

  const lienValide = Boolean(uid && token);

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');

    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSoumission(true);
    try {
      await api.post('/auth/reinitialiser-mot-de-passe/', {
        uid,
        token,
        nouveau_mot_de_passe: motDePasse,
      });
      navigate('/connexion', {
        replace: true,
        state: { info: 'Mot de passe reinitialise. Vous pouvez vous connecter.' },
      });
    } catch (error) {
      const data = error.response?.data;
      const message = data?.nouveau_mot_de_passe?.[0]
        || data?.detail
        || "Reinitialisation impossible. Le lien est peut-etre expire.";
      setErreur(message);
    } finally {
      setSoumission(false);
    }
  }

  return (
    <section className="connexion-page">
      <div className="connexion-panel glass-card">
        <div className="connexion-header">
          <p className="connexion-kicker">Nouveau mot de passe</p>
          <h1>Reinitialisation</h1>
        </div>

        {!lienValide ? (
          <>
            <p className="connexion-copy" style={{ color: '#ff9b9b' }}>
              Ce lien de reinitialisation est incomplet ou invalide.
            </p>
            <p className="connexion-pied">
              <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
            </p>
          </>
        ) : (
          <>
            <form className="connexion-form" onSubmit={handleSubmit}>
              <label className="champ">
                <span>Nouveau mot de passe</span>
                <div className="champ-input">
                  <LockKeyhole size={18} />
                  <input
                    type="password"
                    value={motDePasse}
                    onChange={(event) => setMotDePasse(event.target.value)}
                    placeholder="Au moins 8 caracteres"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              <label className="champ">
                <span>Confirmer le mot de passe</span>
                <div className="champ-input">
                  <LockKeyhole size={18} />
                  <input
                    type="password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="Repetez le mot de passe"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              {erreur ? <p className="erreur-connexion">{erreur}</p> : null}

              <button className="btn btn-primary btn-large" type="submit" disabled={soumission}>
                {soumission ? 'Enregistrement...' : 'Definir le mot de passe'}
              </button>
            </form>

            <p className="connexion-pied">
              <Link to="/connexion">Retour a la connexion</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
