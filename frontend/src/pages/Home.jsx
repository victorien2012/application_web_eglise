import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Mic, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { HomeHeroPanel } from '../components/HomeHeroPanel';
import { SermonCard } from '../components/SermonCard';
import { Button } from '../components/Button';
import { api, extraireListe } from '../services/api';
import { SermonCardSkeleton, PastorCardSkeleton } from '../components/SkeletonLoader';

import './Home.css';

export function Home() {
  const { t } = useTranslation();
  const [predications, setPredications] = useState([]);
  const [pasteurs, setPasteurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    let active = true;

    const charger = async () => {
      try {
        const [resPredications, resPasteurs] = await Promise.all([
          api.get('/predications/'),
          api.get('/pasteurs/')
        ]);

        if (!active) return;

        setPredications(extraireListe(resPredications.data));
        setPasteurs(extraireListe(resPasteurs.data));
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
  const aLaUne = predications?.[0];
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

  /* =========================
     RENDER
  ========================= */
  return (
    <main id="contenu-principal" className="home-layout">

      {/* ================= HERO PREMIUM ================= */}
      <div className="home-premium-hero-wrapper">
        <header className="home-hero">

          <div className="home-hero-copy">
            <div className="home-kicker-row fade-in-up" style={{ animationDelay: '0.1s' }}>
              <p className="section-kicker home-kicker-pill">{t('home.kicker_pill')}</p>
              <span className="home-kicker-note">{t('home.kicker_note')}</span>
            </div>

            <h1 className="title-premium fade-in-up" style={{ animationDelay: '0.2s' }}>
              {t('home.hero_title_1')}<span className="text-yellow">{t('home.hero_title_2')}</span>
            </h1>

            <p className="home-copy-premium fade-in-up" style={{ animationDelay: '0.3s', textAlign: 'justify' }}>
              {t('home.hero_subtitle')}
            </p>



            <div className="home-actions fade-in-up" style={{ animationDelay: '0.5s', justifyContent: 'center', width: '100%' }}>
              <Button to="/videos" variant="yellow" icon={ArrowRight} iconPosition="right" className="hero-btn-glow">
                {t('home.hero_btn_explore')}
              </Button>

              <Button to="/pasteurs" variant="outline-dark">
                {t('home.hero_btn_pastors')}
              </Button>
            </div>
          </div>

          <div className="fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="animate-eagle-fly">
              <img 
                src="/user_eagle.png" 
                alt="Aigle majestueux en vol" 
                style={{ 
                  width: '100%', 
                  objectFit: 'contain', 
                  height: '100%', 
                  maxHeight: '800px', 
                  transform: 'scale(1.3)',
                  filter: 'drop-shadow(0 15px 25px rgba(0, 0, 0, 0.4))' 
                }} 
              />
            </div>
          </div>

        </header>
      </div>

      <section className="home-page">

        {/* ================= BANDEAU STATISTIQUES ================= */}
        <section className="home-section reveal-on-scroll" style={{ padding: '2rem 0 2rem 0', display: 'flex', justifyContent: 'center' }}>
          <HomeHeroPanel
            total={stats.total}
            audio={stats.audio}
            video={stats.video}
          />
        </section>

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
            <Button to="/pasteurs" variant="outline-dark">
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