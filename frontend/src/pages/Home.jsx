import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { HomeHeroPanel } from '../components/HomeHeroPanel';
import { SermonCard } from '../components/SermonCard';
import { api, extraireListe } from '../services/api';

import './Home.css';

export function Home() {
  const [predications, setPredications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    let active = true;

    const charger = async () => {
      try {
        const response = await api.get('/predications/');

        if (!active) return;

        const data = extraireListe(response.data);
        setPredications(data);
        setErreur('');
      } catch (error) {
        if (!active) return;

        setErreur(
          error?.response?.data?.detail ||
          'Impossible de charger les prédications.'
        );
      } finally {
        if (active) setChargement(false);
      }
    };

    charger();

    return () => {
      active = false;
    };
  }, []);

  /* =========================
     DERIVED DATA
  ========================= */
  const aLaUne = predications?.[0];
  const tendances = predications.slice(1, 4);
  const dernieres = predications.slice(0, 6);

  const stats = useMemo(() => {
    const audio = predications.filter(p => p.type_media === 'AUDIO').length;
    const video = predications.filter(p => p.type_media !== 'AUDIO').length;

    return {
      total: predications.length,
      audio,
      video,
    };
  }, [predications]);

  const isLoading = chargement;
  const hasError = !!erreur;

  /* =========================
     RENDER
  ========================= */
  return (
    <main id="contenu-principal" className="home-layout">

      <section className="home-page">

        {/* ================= HERO ================= */}
        <header className="home-hero">

          <div className="home-hero-copy">

            <div className="home-kicker-row">
              <p className="section-kicker home-kicker-pill">
                Plateforme web
              </p>
              <span className="home-kicker-note">
                Contenus audio & vidéo
              </span>
            </div>

            <h1 className="title">
              Écouter et découvrir des prédications inspirantes
            </h1>

            <p className="home-copy">
              Explore les messages, suis les pasteurs et accède aux contenus
              audio et vidéo sans friction.
            </p>

            <div className="home-hero-points">
              <span>Prédications publiques</span>
              <span>Navigation intuitive</span>
              <span>Lecture instantanée</span>
            </div>

            <div className="home-actions">
              <Link to="/decouvrir" className="btn btn-primary">
                Explorer <ArrowRight size={16} />
              </Link>

              <Link to="/pasteurs" className="btn btn-secondary">
                Voir les pasteurs
              </Link>
            </div>

          </div>

          <HomeHeroPanel
            total={stats.total}
            audio={stats.audio}
            video={stats.video}
          />

        </header>

        {/* ================= À LA UNE ================= */}
        {aLaUne && (
          <section className="home-highlight">

            <div className="home-highlight-copy">
              <p className="section-kicker">À la une</p>

              <h2>{aLaUne.titre}</h2>

              <p>
                {aLaUne.description ||
                  'Une prédication à retrouver dès maintenant.'}
              </p>

              <div className="home-highlight-meta">
                <span>{aLaUne.pasteur?.nom_affichage}</span>
                <span>{aLaUne.type_media}</span>
                <span>{aLaUne.duree_secondes}s</span>
              </div>

              <Link
                to={`/sermon/${aLaUne.id}`}
                className="btn btn-primary"
              >
                Ouvrir <ArrowRight size={16} />
              </Link>
            </div>

          </section>
        )}

        {/* ================= TENDANCES ================= */}
        <section className="home-section">

          <div className="section-heading">
            <h2>Tendances du moment</h2>
            <p>Une sélection rapide pour commencer l'exploration.</p>
          </div>

          {isLoading && (
            <p className="page-state">Chargement des prédications...</p>
          )}

          {hasError && (
            <p className="page-state error">{erreur}</p>
          )}

          {!isLoading && !hasError && (
            tendances.length ? (
              <div className="grid sermon-grid">
                {tendances.map(item => (
                  <SermonCard key={item.id} sermon={item} />
                ))}
              </div>
            ) : (
              <p className="page-state">
                Aucune tendance disponible.
              </p>
            )
          )}

        </section>

        {/* ================= NAVIGATION CARDS ================= */}
        <section className="home-section home-public-paths">

          <div className="home-path-card">
            <h2>Explorer les messages</h2>
            <p>
              Utilisez la recherche et les filtres pour trouver une prédication.
            </p>
            <Link to="/decouvrir" className="btn btn-primary">
              Découvrir
            </Link>
          </div>

          <div className="home-path-card">
            <h2>Suivre un ministère</h2>
            <p>
              Découvrez les pasteurs et leurs publications.
            </p>
            <Link to="/pasteurs" className="btn btn-secondary">
              Voir
            </Link>
          </div>

        </section>

        {/* ================= DERNIERS ================= */}
        <section className="home-section">

          <div className="section-heading">
            <h2>Dernières publications</h2>
            <p>Contenus les plus récents.</p>
          </div>

          {!isLoading && !hasError && (
            dernieres.length ? (
              <div className="grid sermon-grid">
                {dernieres.map(item => (
                  <SermonCard key={item.id} sermon={item} />
                ))}
              </div>
            ) : (
              <p className="page-state">
                Aucune prédication disponible.
              </p>
            )
          )}

        </section>

      </section>

    </main>
  );
}