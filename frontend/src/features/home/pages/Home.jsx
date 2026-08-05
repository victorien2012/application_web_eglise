import { useEffect, useState } from 'react';


import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';


import { SermonCard } from '../../sermons/components/SermonCard';
import { Button } from '../../../components/Button';
import { api, extraireListe } from '../../../services/api';
import { SermonCardSkeleton, PastorCardSkeleton } from '../../../components/layout/SkeletonLoader';
import HomeCarousel from '../components/HomeCarousel';

import './Home.css';

export function Home() {
  const { t } = useTranslation();
  const [predications, setPredications] = useState([]);
  const [misesEnAvant, setMisesEnAvant] = useState([]);
  const [totalPredications, setTotalPredications] = useState(0);
  const [pasteurs, setPasteurs] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [carrouselMedias, setCarrouselMedias] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    let active = true;

    const charger = async () => {
      try {
        // L'accueil demandait les 1523 predications pour n'en afficher que neuf.
        // Il ne recupere plus que ce qu'il montre : la mise en avant d'un cote,
        // les dernieres publications de l'autre.
        const [resALaUne, resRecentes, resPasteurs, resAnnonces, resCarrousel] = await Promise.all([
          api.get('/predications/', { params: { est_a_la_une: 'true', page: 1, page_size: 4 } }),
          api.get('/predications/', { params: { page: 1, page_size: 20 } }),
          api.get('/pasteurs/'),
          api.get('/annonces/'),
          api.get('/carrousel/')
        ]);

        if (!active) return;

        const recentes = extraireListe(resRecentes.data);
        setPredications(recentes);
        setMisesEnAvant(extraireListe(resALaUne.data));
        setTotalPredications(
          typeof resRecentes.data?.count === 'number' ? resRecentes.data.count : recentes.length
        );
        setPasteurs(extraireListe(resPasteurs.data));
        setAnnonces(extraireListe(resAnnonces.data));
        setCarrouselMedias(extraireListe(resCarrousel.data));
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
     SCROLL REVEAL ANIMATIONS
  ========================= */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // Timeout pour s'assurer que le DOM est à jour après le chargement
    const timeout = setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [chargement, predications, pasteurs]);

  /* =========================
     DERIVED DATA
  ========================= */
  // Le heros met en avant une seule predication : celle choisie par
  // l'administration, a defaut la plus recente.
  const aLaUne = misesEnAvant[0] || predications[0] || null;
  // Les autres mises en avant restent accessibles depuis le héros plutôt que
  // dans un second carrousel concurrent.
  const autresMisesEnAvant = misesEnAvant.slice(1, 4);
  const tendances = predications.slice(1, 4);
  const dernieres = predications.slice(0, 6);
  const topPasteurs = pasteurs.slice(0, 4);
  const filVideos = predications.slice(0, 12);

  function imageDe(item) {
    if (!item) return null;
    if (item.url_image_couverture || item.image_couverture) {
      return item.url_image_couverture || item.image_couverture;
    }
    if (item.url_video) {
      const correspondance = item.url_video.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
      if (correspondance && correspondance[1]) {
        return `https://img.youtube.com/vi/${correspondance[1]}/maxresdefault.jpg`;
      }
    }
    return null;
  }

  const isLoading = chargement;
  const hasError = !!erreur;

  /* =========================
     RENDER
  ========================= */
  return (
    <main id="contenu-principal" className="home-layout">

      {/* ================= BANNIÈRE UVCI ================= */}
      <div className="home-banner-wrapper">
        {!isLoading && !hasError && annonces.length > 0 && (
          <div className="announcements-container fade-in-up" style={{ animationDelay: '0.05s' }}>
            {annonces.map(annonce => (
              <div key={annonce.id} className="announcement-banner">
                <div className="announcement-badge">{t('home.announcement_badge', 'Info')}</div>
                <div className="announcement-content">
                  <strong className="floating-text">{annonce.titre}</strong>
                  {annonce.message && <p className="floating-text-delay">{annonce.message}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ================= HÉROS : LE MESSAGE À LA UNE ================= */}
      <section className="home-hero-une" aria-labelledby="titre-a-la-une">
        {isLoading ? (
          <div className="home-hero-une-inner">
            <div className="hero-une-skeleton" />
          </div>
        ) : aLaUne ? (
          <>
            {imageDe(aLaUne) && (
              <div
                className="home-hero-une-image"
                style={{ backgroundImage: `url(${imageDe(aLaUne)})` }}
                aria-hidden="true"
              />
            )}
            <div className="home-hero-une-voile" aria-hidden="true" />
            <div className="home-hero-une-inner">
              <p className="hero-une-kicker">{t('home.featured_title', 'À la une')}</p>
              <h1 id="titre-a-la-une" className="hero-une-titre">{aLaUne.titre}</h1>
              {aLaUne.description ? (
                <p className="hero-une-desc">
                  {aLaUne.description.length > 180
                    ? `${aLaUne.description.slice(0, 180)}…`
                    : aLaUne.description}
                </p>
              ) : null}
              <p className="hero-une-meta">
                {aLaUne.nom_predicateur || aLaUne.pasteur?.nom_affichage || ''}
                {aLaUne.duree_secondes ? ` · ${Math.round(aLaUne.duree_secondes / 60)} min` : ''}
              </p>
              <div className="hero-une-actions">
                <Link to={`/sermon/${aLaUne.id}`} className="btn hero-une-btn-principal">
                  <Play size={17} fill="currentColor" />
                  {t('home.hero_btn_listen', 'Écouter le message')}
                </Link>
                <Link to="/videos" className="btn hero-une-btn-secondaire">
                  {t('home.hero_btn_explore')}
                  <ArrowRight size={16} />
                </Link>
              </div>
              {autresMisesEnAvant.length > 0 && (
                <div className="hero-une-autres">
                  <p className="hero-une-autres-label">{t('home.also_featured', 'Également à la une')}</p>
                  <div className="hero-une-autres-liste">
                    {autresMisesEnAvant.map((item) => (
                      <Link key={item.id} to={`/sermon/${item.id}`} className="hero-une-autre">
                        <span
                          className="hero-une-autre-vignette"
                          style={imageDe(item) ? { backgroundImage: `url(${imageDe(item)})` } : undefined}
                          aria-hidden="true"
                        />
                        <span className="hero-une-autre-titre">{item.titre}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {totalPredications > 0 && (
                <p className="hero-une-compteur">
                  {totalPredications.toLocaleString('fr-FR')} {t('home.sermons_available', 'prédications disponibles')}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="home-hero-une-inner">
            <h1 id="titre-a-la-une" className="hero-une-titre">{t('home.hero_title_1')}</h1>
            <p className="hero-une-desc">{t('home.hero_subtitle')}</p>
            <div className="hero-une-actions">
              <Link to="/videos" className="btn hero-une-btn-principal">
                {t('home.hero_btn_explore')}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Promesse du site : replacée après le héros, elle explique ce qu'on
          trouve ici sans disputer la vedette au message mis en avant. */}
      <section className="home-promesse reveal-on-scroll">
        <p className="section-kicker home-kicker-pill">{t('home.kicker_pill')}</p>
        <h2 className="home-promesse-titre">
          {t('home.hero_title_1')} <span className="text-primary">{t('home.hero_title_2')}</span>
        </h2>
        <p className="home-promesse-texte">{t('home.hero_subtitle')}</p>
        <div className="home-promesse-actions">
          <Button to="/videos" variant="accent" icon={ArrowRight} iconPosition="right">
            {t('home.hero_btn_explore')}
          </Button>
          <Link to="/pasteurs" className="btn btn-outline-dark">
            {t('home.hero_btn_pastors')}
          </Link>
        </div>
      </section>

      {/* Actualités gérées par l'administration : un seul carrousel, plus deux
          qui se disputaient l'attention. */}
      {!isLoading && carrouselMedias.length > 0 && (
        <section className="home-section home-actualites reveal-on-scroll">
          <div className="section-heading">
            <h2>{t('home.banners', 'Actualités')}</h2>
          </div>
          <HomeCarousel medias={carrouselMedias} />
        </section>
      )}

      {/* Défilement vertical normal : les anciens panneaux à défilement interne
          enfermaient le contenu dans une page haute d'un seul écran. */}
      <div className="home-flux">
        <section className="home-page">

            {/* ================= TENDANCES ================= */}
            <section className="home-section section-tendances reveal-on-scroll">
              <div className="section-heading">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {t('home.trends_title')}
                  {tendances.length > 0 && <span className="video-feed-count">{tendances.length}</span>}
                </h2>
                <p>{t('home.trends_subtitle')}</p>
              </div>

              {isLoading ? (
                <div className="grid sermon-grid">
                  <SermonCardSkeleton />
                  <SermonCardSkeleton />
                  <SermonCardSkeleton />
                </div>
              ) : hasError ? (
                <p className="page-state error">{t('home.error_loading')}</p>
              ) : tendances.length ? (
                <div className="grid sermon-grid">
                  {tendances.map((item, i) => (
                    <div key={item.id} className="reveal-cascade" style={{ transitionDelay: `${i * 0.1}s` }}>
                      <SermonCard sermon={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="page-state">{t('home.no_trends')}</p>
              )}
            </section>

            {/* ================= MINISTÈRES (Pasteurs) ================= */}
            <section className="home-section reveal-on-scroll">
              <div className="section-heading-row">
                <div className="section-heading">
                  <h2>{t('home.ministries_title')}</h2>
                  <p>{t('home.ministries_subtitle')}</p>
                </div>
                <Button to="/pasteurs" variant="primary">
                  {t('home.all_pastors')}
                </Button>
              </div>

              {isLoading ? (
                <div className="home-pastors-grid">
                  <PastorCardSkeleton />
                  <PastorCardSkeleton />
                  <PastorCardSkeleton />
                  <PastorCardSkeleton />
                </div>
              ) : !hasError && topPasteurs.length ? (
                <div className="home-pastors-grid">
                  {topPasteurs.map((pasteur, i) => (
                    <Link
                      key={pasteur.id}
                      to={`/pasteurs/${pasteur.id}`}
                      className="home-pastor-card premium-hover-lift reveal-cascade"
                      style={{ transitionDelay: `${i * 0.1}s` }}
                    >
                      <div className="home-pastor-avatar">
                        {pasteur.avatar ? (
                          <img src={pasteur.avatar} alt={pasteur.nom_affichage} />
                        ) : (
                          <span>{pasteur.nom_affichage.charAt(0)}</span>
                        )}
                      </div>
                      <h3>{pasteur.nom_affichage}</h3>
                      <p>{pasteur.nom_eglise || t('home.unknown_church')}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>

            {/* ================= DERNIERS ================= */}
            <section className="home-section reveal-on-scroll" style={{ marginTop: '2rem' }}>
              <div className="section-heading">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {t('home.recent_title')}
                  {dernieres.length > 0 && <span className="video-feed-count">{dernieres.length}</span>}
                </h2>
                <p>{t('home.recent_subtitle')}</p>
              </div>

              {isLoading ? (
                <div className="grid sermon-grid">
                  <SermonCardSkeleton />
                  <SermonCardSkeleton />
                  <SermonCardSkeleton />
                  <SermonCardSkeleton />
                  <SermonCardSkeleton />
                  <SermonCardSkeleton />
                </div>
              ) : !hasError && dernieres.length ? (
                <div className="grid sermon-grid">
                  {dernieres.map((item, i) => (
                    <div key={item.id} className="reveal-cascade" style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
                      <SermonCard sermon={item} />
                    </div>
                  ))}
                </div>
              ) : !hasError ? (
                <p className="page-state">{t('home.no_recent')}</p>
              ) : null}
            </section>

            {/* ================= FIL VIDÉOS =================
                Réintégré depuis l'ancien panneau latéral, mais en flux normal :
                il ne défile plus indépendamment de la page. */}
            <section className="home-section home-fil reveal-on-scroll">
              <div className="section-heading-row">
                <div className="section-heading">
                  <h2>{t('home.video_feed_title', 'Vidéos')}</h2>
                  <p>{t('home.video_feed_subtitle', 'Les dernières mises en ligne, en un coup d’œil.')}</p>
                </div>
                <Button to="/videos" variant="primary">
                  {t('home.hero_btn_explore')}
                </Button>
              </div>

              {isLoading ? (
                <div className="home-fil-liste">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="video-feed-item-skeleton">
                      <div className="vf-skeleton-thumb" />
                      <div className="vf-skeleton-info">
                        <div className="vf-skeleton-line long" />
                        <div className="vf-skeleton-line short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filVideos.length > 0 ? (
                <div className="home-fil-liste">
                  {filVideos.map((item) => (
                    <Link key={item.id} to={`/sermon/${item.id}`} className="video-feed-item">
                      <div className="vf-thumb">
                        {imageDe(item) ? (
                          <img src={imageDe(item)} alt="" loading="lazy" />
                        ) : (
                          <div className="vf-thumb-placeholder">
                            <Play size={20} />
                          </div>
                        )}
                      </div>
                      <div className="vf-info">
                        <h4 className="vf-title">{item.titre}</h4>
                        <p className="vf-pastor">{item.nom_predicateur || item.pasteur?.nom_affichage}</p>
                        <div className="vf-meta">
                          {item.duree_secondes ? <span>{Math.round(item.duree_secondes / 60)} min</span> : null}
                          {item.nombre_vues > 0 ? <span>{item.nombre_vues} vues</span> : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>

          </section>
      </div>

    </main>
  );
}