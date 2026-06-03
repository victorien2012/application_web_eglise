import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Connexion.css';

export function VerifierEmail() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const { estConnecte, marquerEmailVerifie } = useAuth();

  const [etat, setEtat] = useState('en_cours'); // en_cours | succes | erreur
  const dejaLance = useRef(false);

  useEffect(() => {
    if (dejaLance.current) {
      return;
    }
    dejaLance.current = true;

    if (!uid || !token) {
      setEtat('erreur');
      return;
    }

    api
      .post('/auth/verifier-email/', { uid, token })
      .then(() => {
        setEtat('succes');
        if (estConnecte) {
          marquerEmailVerifie();
        }
      })
      .catch(() => setEtat('erreur'));
  }, [uid, token, estConnecte, marquerEmailVerifie]);

  return (
    <section className="connexion-page">
      <div className="connexion-panel glass-card">
        <div className="connexion-header">
          <p className="connexion-kicker">Verification email</p>
          <h1>Adresse email</h1>
        </div>

        {etat === 'en_cours' ? (
          <p className="connexion-copy">Verification en cours...</p>
        ) : null}

        {etat === 'succes' ? (
          <p className="connexion-copy" style={{ color: '#9be29b' }}>
            Votre adresse email a bien ete verifiee. Merci !
          </p>
        ) : null}

        {etat === 'erreur' ? (
          <p className="connexion-copy" style={{ color: '#ff9b9b' }}>
            Ce lien de verification est invalide ou a expire.
          </p>
        ) : null}

        <p className="connexion-pied">
          <Link to="/">Retour a l'accueil</Link>
        </p>
      </div>
    </section>
  );
}
