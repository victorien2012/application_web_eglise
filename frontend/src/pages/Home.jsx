import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HomeHeroPanel } from '../components/HomeHeroPanel';
import { SermonCard } from '../components/SermonCard';
import { api } from '../services/api';
import './Home.css';

export function Home() {
  const [predications, setPredications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let active = true;

    async function charger() {
      try {
        const response = await api.get('/predications/');
        if (active) {
          setPredications(response.data);
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || 'Impossible de charger les predications.');
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
  }, []);

  const aLaUne = predications[0];
  const tendances = predications.slice(1, 4);
  const dernieres = predications.slice(0, 6);
  const stats = useMemo(() => {
    const audio = predications.filter((item) => item.type_media === 'AUDIO').length;
    const video = predications.filter((item) => item.type_media !== 'AUDIO').length;
    return {
      total: predications.length,
      audio,
      video,
    };
  }, [predications]);

  return (
    <section className="home-page">
      <header className="home-hero">
        <div className="home-hero-copy">
          <div className="home-kicker-row">
            <p className="section-kicker home-kicker-pill">Plateforme web</p>
            <span className="home-kicker-note">Contenus publics disponibles en audio et video</span>
          </div>
          <h1 className="title">Ecouter, regarder et retrouver les predications qui nourrissent votre semaine.</h1>
          <p className="home-copy">
            Une experience simple pour explorer les messages publics, suivre les pasteurs et
            passer de l'audio au video sans friction.
          </p>
          <div className="home-hero-points">
            <span>Predications publiques</span>
            <span>Navigation par pasteur</span>
            <span>Lecture immediate</span>
          </div>
          <div className="home-actions">
            <Link to="/decouvrir" className="btn btn-primary">
              Explorer maintenant
            </Link>
            <Link to="/pasteurs" className="btn home-secondary-btn">
              Voir les pasteurs
            </Link>
          </div>
        </div>

        <HomeHeroPanel total={stats.total} audio={stats.audio} video={stats.video} />
      </header>

      {aLaUne ? (
        <section className="home-highlight glass-card">
          <div className="home-highlight-copy">
            <p className="section-kicker">A la une</p>
            <h2>{aLaUne.titre}</h2>
            <p>{aLaUne.description || 'Une predication a retrouver des maintenant sur la plateforme.'}</p>
            <div className="home-highlight-meta">
              <span>{aLaUne.pasteur.nom_affichage}</span>
              <span>{aLaUne.type_media}</span>
              <span>{aLaUne.duree_secondes}s</span>
            </div>
            <Link to={`/sermon/${aLaUne.id}`} className="btn btn-primary">
              Ouvrir la predication <ArrowRight size={16} />
            </Link>
          </div>
          <div className="home-highlight-visual">
            {aLaUne.image_couverture ? (
              <>
                <img src={aLaUne.image_couverture} alt={aLaUne.titre} />
                <div className="home-highlight-overlay">
                  <span className="home-highlight-chip">{aLaUne.type_media}</span>
                  <div className="home-highlight-overlay-copy">
                    <strong>{aLaUne.titre}</strong>
                    <span>{aLaUne.pasteur.nom_affichage}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="home-highlight-fallback">
                <div className="home-highlight-fallback-top">
                  <span className="home-highlight-chip">{aLaUne.type_media}</span>
                  <span className="home-highlight-duration">{aLaUne.duree_secondes}s</span>
                </div>
                <div className="home-highlight-fallback-copy">
                  <span>{aLaUne.pasteur.nom_affichage}</span>
                  <strong>{aLaUne.titre}</strong>
                  <p>{aLaUne.description || 'Une predication a retrouver des maintenant sur la plateforme.'}</p>
                </div>
                <div className="home-highlight-fallback-metrics">
                  <div>
                    <small>Vues</small>
                    <strong>{aLaUne.nombre_vues}</strong>
                  </div>
                  <div>
                    <small>Telechargements</small>
                    <strong>{aLaUne.nombre_telechargements}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="home-section">
        <div className="section-heading">
          <h2>Tendances du moment</h2>
          <p>Une selection rapide pour commencer l'exploration.</p>
        </div>
        {chargement ? <p className="page-state">Chargement des predications...</p> : null}
        {erreur ? <p className="page-state error">{erreur}</p> : null}
        {!chargement && !erreur ? (
          tendances.length ? (
            <div className="grid sermon-grid">
              {tendances.map((predication) => (
                <SermonCard key={predication.id} sermon={predication} />
              ))}
            </div>
          ) : (
            <p className="page-state">Aucune tendance disponible pour le moment.</p>
          )
        ) : null}
      </section>

      <section className="home-section home-public-paths">
        <div className="glass-card home-path-card">
          <h2>Explorer les messages</h2>
          <p>Utilisez la recherche publique, les filtres et les categories pour trouver la bonne predication.</p>
          <Link to="/decouvrir" className="btn btn-primary">
            Aller vers Decouvrir
          </Link>
        </div>
        <div className="glass-card home-path-card">
          <h2>Suivre un ministere</h2>
          <p>Retrouvez les profils des pasteurs, leurs eglises et leurs publications recentes.</p>
          <Link to="/pasteurs" className="btn home-secondary-btn">
            Voir les pasteurs
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <h2>Dernieres publications</h2>
          <p>Les contenus publics les plus recents de la plateforme.</p>
        </div>
        {!chargement && !erreur ? (
          dernieres.length ? (
            <div className="grid sermon-grid">
              {dernieres.map((predication) => (
                <SermonCard key={predication.id} sermon={predication} />
              ))}
            </div>
          ) : (
            <p className="page-state">Aucune predication publique pour le moment.</p>
          )
        ) : null}
      </section>
    </section>
  );
}
