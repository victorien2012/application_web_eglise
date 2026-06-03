import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, BellRing, History, Download, Trash2 } from 'lucide-react';
import { api, extraireListe } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Profil.css';

export function Profil() {
  const navigate = useNavigate();
  const { pasteur, estConnecte, deconnexion } = useAuth();
  const [actionRgpd, setActionRgpd] = useState('');
  const [favoris, setFavoris] = useState([]);
  const [abonnements, setAbonnements] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!estConnecte) {
      setChargement(false);
      return undefined;
    }
    let active = true;
    Promise.all([
      api.get('/favoris/'),
      api.get('/abonnements/'),
      api.get('/historique-lecture/'),
    ])
      .then(([favorisRes, abonnementsRes, historiqueRes]) => {
        if (!active) return;
        setFavoris(extraireListe(favorisRes.data));
        setAbonnements(extraireListe(abonnementsRes.data));
        setHistorique(extraireListe(historiqueRes.data));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChargement(false);
      });
    return () => {
      active = false;
    };
  }, [estConnecte]);

  async function exporterDonnees() {
    setActionRgpd('');
    try {
      const response = await api.get('/auth/mes-donnees/');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = 'mes-donnees.json';
      lien.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionRgpd("L'export de vos donnees a echoue.");
    }
  }

  async function supprimerCompte() {
    const confirme = window.confirm(
      'Supprimer definitivement votre compte et toutes vos donnees ? Cette action est irreversible.'
    );
    if (!confirme) return;
    try {
      await api.delete('/auth/mon-compte/');
      deconnexion();
      navigate('/', { replace: true });
    } catch {
      setActionRgpd('La suppression du compte a echoue.');
    }
  }

  if (!estConnecte) {
    return (
      <section className="glass-card profil-vide">
        <h1>Profil</h1>
        <p>
          <Link to="/connexion">Connectez-vous</Link> pour afficher les informations de votre compte.
        </p>
      </section>
    );
  }

  return (
    <div className="profil-page">
      <section className="glass-card profil-entete">
        <h1>Profil</h1>
        {pasteur ? (
          <>
            <p><strong>Nom:</strong> {pasteur.nom_affichage}</p>
            <p><strong>Eglise:</strong> {pasteur.nom_eglise || 'Non renseignee'}</p>
            <p className="profil-bio">{pasteur.biographie || 'Aucune biographie pour le moment.'}</p>
          </>
        ) : (
          <p className="profil-bio">Votre session est active. Retrouvez ci-dessous vos contenus suivis.</p>
        )}
      </section>

      <section className="glass-card profil-section">
        <h2><Heart size={18} /> Mes favoris</h2>
        {chargement ? (
          <p className="profil-info">Chargement...</p>
        ) : favoris.length ? (
          <ul className="profil-liste">
            {favoris.map((favori) => (
              <li key={favori.id}>
                <Link to={`/sermon/${favori.predication_detail?.id || favori.predication}`}>
                  {favori.predication_detail?.titre || 'Predication'}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="profil-info">Aucun favori pour le moment.</p>
        )}
      </section>

      <section className="glass-card profil-section">
        <h2><BellRing size={18} /> Mes abonnements</h2>
        {chargement ? (
          <p className="profil-info">Chargement...</p>
        ) : abonnements.length ? (
          <ul className="profil-liste">
            {abonnements.map((abonnement) => (
              <li key={abonnement.id}>
                <Link to={`/pasteurs/${abonnement.pasteur_detail?.id || abonnement.pasteur}`}>
                  {abonnement.pasteur_detail?.nom_affichage || 'Pasteur'}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="profil-info">Vous ne suivez aucun pasteur pour le moment.</p>
        )}
      </section>

      <section className="glass-card profil-section">
        <h2><History size={18} /> Historique de lecture</h2>
        {chargement ? (
          <p className="profil-info">Chargement...</p>
        ) : historique.length ? (
          <ul className="profil-liste">
            {historique.map((entree) => (
              <li key={entree.id}>
                <Link to={`/sermon/${entree.predication_detail?.id || entree.predication}`}>
                  {entree.predication_detail?.titre || 'Predication'}
                </Link>
                {entree.est_termine ? <span className="profil-badge">Termine</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="profil-info">Aucune lecture enregistree pour le moment.</p>
        )}
      </section>

      <section className="glass-card profil-section">
        <h2>Mes donnees (RGPD)</h2>
        <p className="profil-info">
          Vous pouvez exporter l'ensemble de vos donnees ou supprimer definitivement votre compte.
        </p>
        {actionRgpd ? <p className="profil-erreur">{actionRgpd}</p> : null}
        <div className="profil-rgpd-actions">
          <button type="button" className="btn app-ghost-button" onClick={exporterDonnees}>
            <Download size={15} /> Exporter mes donnees
          </button>
          <button type="button" className="btn profil-danger" onClick={supprimerCompte}>
            <Trash2 size={15} /> Supprimer mon compte
          </button>
        </div>
      </section>
    </div>
  );
}
