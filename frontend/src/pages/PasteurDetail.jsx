import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SermonCard } from '../components/SermonCard';
import { api } from '../services/api';
import './PasteurDetail.css';

export function PasteurDetail() {
  const { id } = useParams();
  const [pasteur, setPasteur] = useState(null);
  const [predications, setPredications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let active = true;

    async function charger() {
      try {
        setChargement(true);
        const [pasteurResponse, predicationsResponse] = await Promise.all([
          api.get(`/pasteurs/${id}/`),
          api.get('/predications/', { params: { pasteur: id } }),
        ]);
        if (active) {
          setPasteur(pasteurResponse.data);
          setPredications(predicationsResponse.data);
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || 'Impossible de charger ce profil pasteur.');
        }
      } finally {
        if (active) {
          setChargement(false);
        }
      }
    }

    charger();
    return () => {
      active = false;
    };
  }, [id]);

  const totalDurees = useMemo(
    () => predications.reduce((total, predication) => total + (predication.duree_secondes || 0), 0),
    [predications]
  );
  const dureeMinutes = Math.round(totalDurees / 60);

  if (chargement) {
    return <p className="page-state">Chargement du profil pasteur...</p>;
  }

  if (erreur || !pasteur) {
    return <p className="page-state error">{erreur || 'Profil introuvable.'}</p>;
  }

  return (
    <section className="pasteur-detail-page">
      <header className="glass-card pasteur-detail-hero">
        <div className="pasteur-detail-avatar">
          {pasteur.avatar ? (
            <img src={pasteur.avatar} alt={pasteur.nom_affichage} />
          ) : (
            <span>{pasteur.nom_affichage.charAt(0)}</span>
          )}
        </div>
        <div className="pasteur-detail-copy">
          <p className="section-kicker">Ministere</p>
          <h1>{pasteur.nom_affichage}</h1>
          <p className="pasteur-detail-eglise">{pasteur.nom_eglise || 'Eglise non renseignee'}</p>
          <p className="pasteur-detail-bio">
            {pasteur.biographie || 'Ce profil sera bientot complete avec une presentation detaillee du ministere.'}
          </p>
          <div className="pasteur-detail-actions">
            <Link to="/decouvrir" className="btn btn-primary">
              Explorer les predications
            </Link>
          </div>
        </div>
      </header>

      <section className="pasteur-detail-stats">
        <div className="glass-card pasteur-stat">
          <span>Predications</span>
          <strong>{predications.length}</strong>
        </div>
        <div className="glass-card pasteur-stat">
          <span>Duree cumulee</span>
          <strong>{dureeMinutes} min</strong>
        </div>
      </section>

      <section className="pasteur-detail-list">
        <div className="section-heading">
          <h2>Dernieres publications</h2>
          <p>Toutes les predications publiques de ce pasteur.</p>
        </div>

        {predications.length ? (
          <div className="grid sermon-grid">
            {predications.map((predication) => (
              <SermonCard key={predication.id} sermon={predication} />
            ))}
          </div>
        ) : (
          <p className="page-state">Aucune predication publique pour le moment.</p>
        )}
      </section>
    </section>
  );
}
