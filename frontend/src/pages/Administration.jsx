import { useEffect, useState } from 'react';
import { ShieldCheck, Flag, BadgeCheck, BarChart3 } from 'lucide-react';
import { api, extraireListe } from '../services/api';
import './Administration.css';

const LIBELLES_STATUT = {
  NOUVEAU: 'Nouveau',
  EN_COURS: 'En cours',
  TRAITE: 'Traite',
  REJETE: 'Rejete',
};

export function Administration() {
  const [stats, setStats] = useState(null);
  const [pasteurs, setPasteurs] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  async function charger() {
    setChargement(true);
    try {
      const [statsRes, pasteursRes, signalementsRes] = await Promise.all([
        api.get('/admin/statistiques/'),
        api.get('/pasteurs/a_valider/'),
        api.get('/signalements/'),
      ]);
      setStats(statsRes.data);
      setPasteurs(extraireListe(pasteursRes.data));
      setSignalements(extraireListe(signalementsRes.data));
      setErreur('');
    } catch (error) {
      setErreur(error.response?.data?.detail || "Impossible de charger l'espace d'administration.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validerPasteur(pasteur) {
    try {
      await api.post(`/pasteurs/${pasteur.id}/valider/`, { est_valide: true });
      setPasteurs((actuels) => actuels.filter((item) => item.id !== pasteur.id));
    } catch {
      setErreur('La validation a echoue.');
    }
  }

  async function changerStatut(signalement, statut) {
    try {
      const response = await api.post(`/signalements/${signalement.id}/changer_statut/`, { statut });
      setSignalements((actuels) =>
        actuels.map((item) => (item.id === signalement.id ? { ...item, statut: response.data.statut } : item))
      );
    } catch {
      setErreur('Le changement de statut a echoue.');
    }
  }

  if (chargement) {
    return <p className="page-state">Chargement de l'espace d'administration...</p>;
  }

  return (
    <div className="admin-page">
      <section className="glass-card admin-intro">
        <h1><ShieldCheck size={24} /> Administration</h1>
        <p>Validez les pasteurs et traitez les signalements de la plateforme.</p>
        {erreur ? <p className="admin-erreur">{erreur}</p> : null}
      </section>

      {stats ? (
        <section className="glass-card admin-section">
          <h2><BarChart3 size={20} /> Statistiques globales</h2>
          <div className="admin-kpis">
            <div className="admin-kpi"><span>Utilisateurs</span><strong>{stats.total_utilisateurs}</strong></div>
            <div className="admin-kpi"><span>Pasteurs ({stats.total_pasteurs_valides} valides)</span><strong>{stats.total_pasteurs}</strong></div>
            <div className="admin-kpi"><span>Predications ({stats.total_predications_publiees} publiees)</span><strong>{stats.total_predications}</strong></div>
            <div className="admin-kpi"><span>Vues cumulees</span><strong>{stats.total_vues}</strong></div>
            <div className="admin-kpi"><span>Telechargements</span><strong>{stats.total_telechargements}</strong></div>
            <div className="admin-kpi"><span>Commentaires</span><strong>{stats.total_commentaires}</strong></div>
            <div className="admin-kpi"><span>Favoris</span><strong>{stats.total_favoris}</strong></div>
            <div className="admin-kpi"><span>Abonnements</span><strong>{stats.total_abonnements}</strong></div>
          </div>
        </section>
      ) : null}

      <section className="glass-card admin-section">
        <h2><BadgeCheck size={20} /> Pasteurs en attente de validation</h2>
        {pasteurs.length ? (
          <div className="admin-liste">
            {pasteurs.map((pasteur) => (
              <article key={pasteur.id} className="admin-card">
                <div>
                  <strong>{pasteur.nom_affichage}</strong>
                  <p>{pasteur.nom_eglise || 'Eglise non renseignee'} · {pasteur.email}</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => validerPasteur(pasteur)}>
                  Valider
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-info">Aucun pasteur en attente.</p>
        )}
      </section>

      <section className="glass-card admin-section">
        <h2><Flag size={20} /> Signalements</h2>
        {signalements.length ? (
          <div className="admin-liste">
            {signalements.map((signalement) => (
              <article key={signalement.id} className="admin-card">
                <div>
                  <strong>{signalement.raison}</strong>
                  <p>{signalement.details || 'Sans details'}</p>
                  <span className={`admin-statut admin-statut-${signalement.statut}`}>
                    {LIBELLES_STATUT[signalement.statut] || signalement.statut}
                  </span>
                </div>
                <div className="admin-actions">
                  <button type="button" className="btn app-ghost-button" onClick={() => changerStatut(signalement, 'EN_COURS')}>
                    En cours
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => changerStatut(signalement, 'TRAITE')}>
                    Traiter
                  </button>
                  <button type="button" className="btn app-ghost-button" onClick={() => changerStatut(signalement, 'REJETE')}>
                    Rejeter
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-info">Aucun signalement.</p>
        )}
      </section>
    </div>
  );
}
