import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, extraireListe } from '../services/api';
import './Pasteurs.css';

export function Pasteurs() {
  const { t } = useTranslation();
  const [pasteurs, setPasteurs] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let active = true;

    async function charger() {
      try {
        setChargement(true);
        const response = await api.get('/pasteurs/', {
          params: recherche.trim() ? { search: recherche.trim() } : {},
        });
        if (active) {
          setPasteurs(extraireListe(response.data));
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || t('pastors.load_error'));
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
  }, [recherche]);

  const pasteursAffiches = useMemo(() => pasteurs, [pasteurs]);

  return (
    <section className="pasteurs-container">
      {/* HERO */}
      <div className="pasteurs-hero-wrapper">
        <header className="pasteurs-hero">
          <p className="section-kicker">{t('pastors.kicker')}</p>
          <h1>{t('pastors.title')}</h1>
          <p>
            {t('pastors.subtitle')}
          </p>
          {!chargement && !erreur ? (
            <div className="pasteurs-summary">
              <span>{pasteursAffiches.length} {pasteursAffiches.length > 1 ? t('pastors.profile_plural') : t('pastors.profile_singular')} {pasteursAffiches.length > 1 ? t('pastors.registered_plural') : t('pastors.registered_singular')}</span>
            </div>
          ) : null}
        </header>
      </div>

      {/* CORPS */}
      <div className="pasteurs-body">

      <section className="pasteurs-toolbar">
        <div className="pasteurs-search">
          <Search className="search-icon-large" size={20} />
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder={t('pastors.search_placeholder')}
          />
        </div>
      </section>

      {chargement && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={32} style={{ margin: '0 auto 1rem', display: 'block', animation: 'spin 1s linear infinite' }} />
          <p>{t('pastors.loading')}</p>
        </div>
      )}
      
      {erreur && <p className="page-state" style={{ color: '#ef4444' }}>{erreur}</p>}

      {!chargement && !erreur ? (
        pasteursAffiches.length ? (
          <div className="pasteurs-grid">
            {pasteursAffiches.map((pasteur) => (
              <Link key={pasteur.id} to={`/pasteurs/${pasteur.id}`} className="pasteur-card">
                <div className="pasteur-avatar">
                  {pasteur.avatar ? (
                    <img src={pasteur.avatar} alt={pasteur.nom_affichage} />
                  ) : (
                    <span>{pasteur.nom_affichage.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <h2>{pasteur.nom_affichage}</h2>
                <p className="pasteur-eglise">{pasteur.nom_eglise || t('pastors.unknown_church')}</p>
                <p className="pasteur-bio">
                  {pasteur.biographie || t('pastors.no_bio')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="page-state">{t('pastors.no_pastors_found')}</p>
        )
      ) : null}
      </div>{/* fin pasteurs-body */}
    </section>
  );
}

export default Pasteurs;
