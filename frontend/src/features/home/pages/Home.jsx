import { useEffect, useMemo, useState, useRef } from 'react';


import { Link } from 'react-router-dom';
import { ArrowRight, Play, Mic, Star } from 'lucide-react';
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
  const aLaUneItems = predications.filter(p => p.est_a_la_une).slice(0, 4);
  if (aLaUneItems.length === 0 && predications.length > 0) {
    aLaUneItems.push(predications[0]);
  }
  const tendances = predications.slice(1, 4);
  const dernieres = predications.slice(0, 6);
  const topPasteurs = pasteurs.slice(0, 4);



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
  // const hasError = !!erreur; // duplicate removed

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

        {/* CAROUSEL BACKGROUND */}
        <div className="fade-in" style={{ animationDelay: '0.2s' }}>
          <HomeCarousel medias={carrouselMedias} />
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

      <section className="home-page">



        {/* ================= À LA UNE (Actualité) ================= */}
        {!isLoading && !hasError && aLaUneItems.length > 0 && (
          <section className="home-section reveal-on-scroll">
            <div className="section-heading">
              <h2>{t('home.featured_title', 'À La Une')}</h2>
              <p>{t('home.featured_subtitle', 'Découvrez notre actualité principale')}</p>
            </div>

            <div className="featured-scroll-container" ref={featuredRef}>
              {aLaUneItems.map((item) => {
                let coverUrl = item.image_couverture;
                if (!coverUrl && item.url_video) {
                  const match = item.url_video.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                  if (match && match[1]) {
                    coverUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
                  }
                }
                const pastorName = item.nom_predicateur || item.pasteur?.nom_affichage;

                return (
                  <div key={item.id} className="premium-featured-card scroll-snap-card">
                    {coverUrl && (
                      <>
                        <div className="featured-image-bg">
                          <img src={coverUrl} alt={item.titre} />
                        </div>
                        <div className="featured-overlay"></div>
                      </>
                    )}
                    <div className="home-highlight-copy">
                      <div className="featured-badge">
                        <Star size={14} /> {t('home.featured_badge', 'ACTUALITÉ')}
                      </div>
                      <h2 className="featured-title">{item.titre}</h2>
                      {item.description && (
                        <p className="featured-desc" dangerouslySetInnerHTML={{ __html: item.description.substring(0, 150) + (item.description.length > 150 ? '...' : '') }}></p>
                      )}
                      <div className="home-highlight-meta">
                        {pastorName && (
                          <span className="meta-badge">{pastorName}</span>
                        )}
                        {item.date_publication && (
                          <>
                            <span className="meta-dot">•</span>
                            <span>{new Date(item.date_publication).toLocaleDateString()}</span>
                          </>
                        )}
                        <span className="meta-dot">•</span>
                        <span>{item.type_media === 'AUDIO' ? <Mic size={16} /> : <Play size={16} />}</span>
                      </div>
                      <Button to={`/sermon/${item.id}`} variant="primary">
                        {t('home.watch_now', 'Découvrir')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= TENDANCES ================= */}
        <section className="home-section reveal-on-scroll">

          <div className="section-heading">
            <h2>{t('home.trends_title')}</h2>
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
            <h2>{t('home.recent_title')}</h2>
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

    </main>
  );
}