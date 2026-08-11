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
    const conteneur = document.querySelector('.home-layout');
    if (!conteneur || typeof IntersectionObserver === 'undefined') return undefined;

    // La classe n'est posée que si l'observateur peut réellement être installé :
    // sans elle, le CSS laisse tout visible plutôt que de masquer du contenu.
    conteneur.classList.add('reveal-actif');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      // Seuil à 0 : une section plus haute que l'écran n'atteignait pas
      // toujours les 10 % exigés auparavant et restait donc masquée.
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    );

    const timeout = setTimeout(() => {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    }, 100);

    // Filet de sécurité : au bout de trois secondes, tout ce qui n'a pas été
    // révélé le devient. Une animation ratée ne doit jamais retenir du contenu.
    const filet = setTimeout(() => {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => el.classList.add('is-visible'));
    }, 3000);

    return () => {
      clearTimeout(timeout);
      clearTimeout(filet);
      observer.disconnect();
    };
  }, [chargement, predications, pasteurs]);

  /* =========================
     DERIVED DATA
  ========================= */
  // Le heros met en avant une seule predication : celle choisie par
  // l'administration, a defaut la plus recente.
  // Les listes sont des multiples de 3 pour remplir exactement les lignes de
  // la grille, sans dernière ligne incomplète.
  const tendances = predications.slice(1, 4);
  const dernieres = predications.slice(0, 6);
  const topPasteurs = pasteurs.slice(0, 4);
  // Le fil reprend la suite du catalogue : il affichait auparavant les mêmes
  // prédications que « Dernières publications », qui apparaissaient donc deux
  // fois sur la page.
  const filVideos = predications.slice(6, 20);

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

  // Alimente le carrousel « Vidéos à la une » : le composant attend des médias
  // avec une vignette, un titre et une destination.
  const aLaUneMedias = misesEnAvant.map((item) => ({
    id: item.id,
    fichier: imageDe(item),
    titre: item.titre,
    description: item.description ? item.description.slice(0, 100) : '',
    type_media: 'VIDEO',
    url_video: item.url_video,
    to: `/sermon/${item.id}`,
  }));

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

      {/* ================= DEUX CARROUSELS : ACTUALITÉS | À LA UNE =================
          Deux moitiés de même largeur, chacune avec son propre défilement
          automatique. */}
      <div className="home-dual-carousel-wrapper fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="carousel-half">
          <h2 className="carousel-half-title">{t('home.banners', 'Actualités')}</h2>
          <HomeCarousel medias={carrouselMedias} />
        </div>
        <div className="carousel-half">
          <h2 className="carousel-half-title">{t('home.featured_title', 'Vidéos à la une')}</h2>
          <HomeCarousel medias={aLaUneMedias} />
        </div>
      </div>

      {/* Promesse du site : elle explique ce qu'on trouve ici, sous les deux
          carrousels. */}
      <section className="home-promesse reveal-on-scroll">
        <p className="section-kicker home-kicker-pill">{t('home.kicker_pill')}</p>
        <h2 className="home-promesse-titre">
          {t('home.hero_title_1')} <span className="text-primary">{t('home.hero_title_2')}</span>
        </h2>
        <p className="home-promesse-texte">{t('home.hero_subtitle')}</p>
        {totalPredications > 0 && (
          <p className="home-promesse-compteur">
            {totalPredications.toLocaleString('fr-FR')} {t('home.sermons_available', 'prédications disponibles')}
          </p>
        )}
        <div className="home-promesse-actions">
          <Button to="/videos" variant="accent" icon={ArrowRight} iconPosition="right">
            {t('home.hero_btn_explore')}
          </Button>
          <Link to="/pasteurs" className="btn btn-outline-dark">
            {t('home.hero_btn_pastors')}
          </Link>
        </div>
      </section>

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
                  {Array.from({ length: 3 }).map((_, i) => <SermonCardSkeleton key={i} />)}
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
                  {Array.from({ length: 6 }).map((_, i) => <SermonCardSkeleton key={i} />)}
                </div>
              ) : !hasError && dernieres.length ? (
                <div className="grid sermon-grid">
                  {dernieres.map((item, i) => (
                    <div key={item.id} className="reveal-cascade" style={{ transitionDelay: `${(i % 4) * 0.08}s` }}>
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