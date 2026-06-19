import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BellRing, BellOff, Loader2 } from 'lucide-react';
import { SermonCard } from '../../sermons/components/SermonCard';
import { api, extraireListe } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useAbonnement } from '../../../hooks/useEngagement';
import { useTranslation } from 'react-i18next';
import './PasteurDetail.css';
export function PasteurDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { estConnecte } = useAuth();
  const { estAbonne, basculer, pret: abonnementPret } = useAbonnement(id);
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
          setPredications(extraireListe(predicationsResponse.data));
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || t('pastor_detail.load_error'));
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
    return (
      <div className="pasteur-detail-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={32} style={{ margin: '0 auto 1rem', display: 'block', animation: 'spin 1s linear infinite' }} />
          <p>{t('pastor_detail.loading')}</p>
        </div>
      </div>
    );
  }

  if (erreur || !pasteur) {
    return (
      <div className="pasteur-detail-container">
        <p style={{ color: '#ef4444', textAlign: 'center', padding: '3rem' }}>{erreur || t('pastor_detail.not_found')}</p>
      </div>
    );
  }

  return (
    <section className="pasteur-detail-container">
      {/* BANDEAU HERO */}
      <div className="pasteur-detail-hero-wrapper">
        <div className="pasteur-detail-hero">
          <div className="pasteur-detail-avatar">
            {pasteur.avatar ? (
              <img src={pasteur.avatar} alt={pasteur.nom_affichage} />
            ) : (
              <span>{pasteur.nom_affichage.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="pasteur-detail-copy">
            <p className="section-kicker">{t('pastor_detail.kicker')}</p>
            <h1>{pasteur.nom_affichage}</h1>
            <p className="pasteur-detail-eglise">{pasteur.nom_eglise || t('pastors.unknown_church')}</p>
            <p className="pasteur-detail-bio">
              {pasteur.biographie || t('pastor_detail.default_bio')}
            </p>
            <div className="pasteur-detail-actions">
              <a href="/videos" className="btn-premium btn-premium-primary">
                {t('pastor_detail.explore_sermons')}
              </a>
              {estConnecte ? (
                <button
                  type="button"
                  className={`btn-premium ${estAbonne ? 'btn-premium-secondary' : 'btn-premium-primary'}`}
                  onClick={basculer}
                  disabled={!abonnementPret}
                >
                  {estAbonne ? <BellOff size={18} /> : <BellRing size={18} />}
                  {estAbonne ? t('pastor_detail.unsubscribe') : t('pastor_detail.subscribe')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* CORPS */}
      <div className="pasteur-detail-content">

        <section className="pasteur-detail-stats">
          <div className="pasteur-stat">
            <span>{t('pastor_detail.stat_sermons')}</span>
            <strong>{predications.length}</strong>
          </div>
          <div className="pasteur-stat">
            <span>{t('pastor_detail.stat_duration')}</span>
            <strong>{dureeMinutes} min</strong>
          </div>
        </section>

        <section className="pasteur-detail-list">
          <div className="section-heading">
            <h2>{t('pastor_detail.latest_pubs')}</h2>
            <p>{t('pastor_detail.latest_pubs_desc')}</p>
          </div>

          {predications.length ? (
            <div className="sermon-grid">
              {predications.map((predication) => (
                <SermonCard key={predication.id} sermon={predication} />
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontStyle: 'italic', padding: '2rem 0' }}>{t('pastor_detail.no_pubs')}</p>
          )}
        </section>
      </div>
    </section>
  );
}

export default PasteurDetail;
