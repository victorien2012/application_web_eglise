import { useEffect, useMemo, useState, useRef } from 'react';


import { Link } from 'react-router-dom';
import { ArrowRight, Play, Mic, Star, Film, Clock, Eye, ChevronRight } from 'lucide-react';
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
        const [resPredications, resPasteurs, resAnnonces, resCarrousel] = await Promise.all([
          api.get('/predications/'),
          api.get('/pasteurs/'),
          api.get('/annonces/'),
          api.get('/carrousel/')
        ]);

        if (!active) return;

        setPredications(extraireListe(resPredications.data));
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
  let aLaUneItems = predications.filter(p => p.est_a_la_une).slice(0, 4);
  if (aLaUneItems.length === 0 && predications.length > 0) {
    aLaUneItems = predications.slice(0, 4);
  }
  const tendances = predications.slice(1, 4);
  const dernieres = predications.slice(0, 6);
  const topPasteurs = pasteurs.slice(0, 4);
  const videoFeed = predications.slice(0, 20);



  const stats = useMemo(() => {
    const audio = predications.filter(p => p.type_media === 'AUDIO').length;
    const video = predications.filter(p => p.type_media !== 'AUDIO').length;

    return {
      total: predications.length,
      audio,
      video,
    };
  }, [predications]);

  const aLaUneMedias = useMemo(() => {
    return aLaUneItems.map(item => {
      let coverUrl = item.image_couverture;
      if (!coverUrl && item.url_video) {
        const match = item.url_video.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        if (match && match[1]) {
          coverUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
        }
      }
      return {
        id: item.id,
        fichier: coverUrl,
        titre: item.titre,
        description: item.description?.substring(0, 100) || '',
        type_media: 'VIDEO',
        url_video: item.url_video,
        to: `/sermon/${item.id}`
      };
    });
  }, [aLaUneItems]);

  const isLoading = chargement;
  const hasError = !!erreur;

  // Auto-scroll carousel (added after state definitions)
  const featuredRef = useRef(null);
  useEffect(() => {
    if (isLoading || aLaUneItems.length === 0) return;
    const container = featuredRef.current;
    if (!container) return;
    const scrollStep = container.offsetWidth;
    const interval = setInterval(() => {
      if (container.scrollLeft + container.offsetWidth >= container.scrollWidth) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollStep, behavior: 'smooth' });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoading, aLaUneItems]);

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

        {/* CAROUSEL BACKGROUND (DUAL) */}
        <div className="home-dual-carousel-wrapper fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="carousel-half">
            <h2 className="carousel-half-title">{t('home.banners', 'Actualités')}</h2>
            <HomeCarousel medias={carrouselMedias} />
          </div>
          <div className="carousel-half">
            <h2 className="carousel-half-title">{t('home.featured_title', 'À La Une')}</h2>
            <HomeCarousel medias={aLaUneMedias} />
          </div>
        </div>
      </div>

      <section className="home-intro-section reveal-on-scroll">
        <header className="home-hero-center">
          <div className="home-kicker-row fade-in-up" style={{ animationDelay: '0.1s', justifyContent: 'center' }}>
            <p className="section-kicker home-kicker-pill">{t('home.kicker_pill')}</p>
          </div>

          <h1 className="title-premium fade-in-up" style={{ animationDelay: '0.2s' }}>
            {t('home.hero_title_1')}<br /><span className="text-primary">{t('home.hero_title_2')}</span>
          </h1>

          <p className="home-copy-premium fade-in-up" style={{ animationDelay: '0.3s', textAlign: 'center' }}>
            {t('home.hero_subtitle')}
          </p>

          <div className="home-actions-center fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Button to="/videos" variant="accent" icon={ArrowRight} iconPosition="right" className="hero-btn-glow">
              {t('home.hero_btn_explore')}
            </Button>

            <Link to="/pasteurs" className="btn btn-outline-dark">
              {t('home.hero_btn_pastors')}
            </Link>
          </div>
        </header>
      </section>

      {/* ================= SPLIT VIEW : Vidéos + Contenu ================= */}
      <div className="home-split-view">

        {/* ======= PANNEAU GAUCHE : Contenu principal (scroll indépendant) ======= */}
        <div className="home-main-content">
          <section className="home-page">

            {/* L'ancienne section "À La Une" a été déplacée dans le double carrousel en haut */}

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

          </section>
        </div>

        {/* ======= PANNEAU DROIT : Feed Vidéos (scroll indépendant) ======= */}
        <aside className="home-video-feed">
          <div className="video-feed-header">
            <div className="video-feed-title-row">
              <Film size={20} />
              <h2>{t('home.video_feed_title', 'Vidéos')}</h2>
            </div>
            <span className="video-feed-count">{videoFeed.length}</span>
          </div>

          <div className="video-feed-list">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="video-feed-item-skeleton">
                  <div className="vf-skeleton-thumb" />
                  <div className="vf-skeleton-info">
                    <div className="vf-skeleton-line long" />
                    <div className="vf-skeleton-line short" />
                  </div>
                </div>
              ))
            ) : videoFeed.length > 0 ? (
              videoFeed.map((item, i) => {
                let thumbUrl = item.image_couverture;
                if (!thumbUrl && item.url_video) {
                  const match = item.url_video.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                  if (match && match[1]) {
                    thumbUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
                  }
                }
                return (
                  <Link
                    key={item.id}
                    to={`/sermon/${item.id}`}
                    className="video-feed-item"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="vf-thumb">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={item.titre} loading="lazy" />
                      ) : (
                        <div className="vf-thumb-placeholder">
                          {item.type_media === 'AUDIO' ? <Mic size={20} /> : <Play size={20} />}
                        </div>
                      )}
                      <div className="vf-media-badge">
                        {item.type_media === 'AUDIO' ? <Mic size={10} /> : <Play size={10} />}
                      </div>
                    </div>
                    <div className="vf-info">
                      <h4 className="vf-title">{item.titre}</h4>
                      <p className="vf-pastor">{item.nom_predicateur || item.pasteur?.nom_affichage}</p>
                      <div className="vf-meta">
                        {item.date_publication && (
                          <span><Clock size={11} /> {new Date(item.date_publication).toLocaleDateString()}</span>
                        )}
                        {item.nombre_vues > 0 && (
                          <span><Eye size={11} /> {item.nombre_vues}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="vf-chevron" />
                  </Link>
                );
              })
            ) : (
              <p className="video-feed-empty">{t('home.no_trends')}</p>
            )}
          </div>

          {!isLoading && videoFeed.length > 0 && (
            <Link to="/videos" className="video-feed-see-all">
              {t('home.hero_btn_explore', 'Voir tout')} <ArrowRight size={16} />
            </Link>
          )}
        </aside>
      </div>

    </main>
  );
}