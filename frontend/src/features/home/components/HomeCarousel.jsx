import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSite } from '../../../context/SiteContext';
import './HomeCarousel.css';

const HomeCarousel = ({ medias }) => {
  const { t } = useTranslation();
  const { siteConfig } = useSite();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Contenu de repli, affiché tant qu'aucun média n'a été publié depuis
  // l'administration. Il ne charge aucune image : les deux photos d'illustration
  // utilisées auparavant venaient d'un service externe, et l'une d'elles ne
  // répondait plus — les visiteurs voyaient une image cassée sur l'accueil.
  const displayMedias = (!medias || medias.length === 0) ? [
    {
      id: 'default-1',
      fichier: null,
      titre: "Bienvenue dans notre Église",
      description: "S'Équiper pour Bâtir, S'Unir pour Grandir",
      type_media: 'IMAGE'
    }
  ] : medias;

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isPausedRef = useRef(false);

  const scrollTo = (index) => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({ left: index * containerWidth, behavior: 'smooth' });
      setActiveIndex(index);
    }
  };

  const scrollLeft = useCallback(() => {
    const newIndex = activeIndex > 0 ? activeIndex - 1 : displayMedias.length - 1;
    scrollTo(newIndex);
  }, [activeIndex, displayMedias.length]);

  const scrollRight = useCallback(() => {
    const newIndex = activeIndex < displayMedias.length - 1 ? activeIndex + 1 : 0;
    scrollTo(newIndex);
  }, [activeIndex, displayMedias.length]);

  const hasCarouselEffect = displayMedias.length > 1;

  // Auto-play
  useEffect(() => {
    if (!hasCarouselEffect) return;
    const interval = setInterval(() => {
      if (!isPausedRef.current) {
        setActiveIndex(prev => {
          const next = prev < displayMedias.length - 1 ? prev + 1 : 0;
          if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: next * scrollRef.current.clientWidth, behavior: 'smooth' });
          }
          return next;
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [hasCarouselEffect, displayMedias.length]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollPosition = scrollRef.current.scrollLeft;
      const containerWidth = scrollRef.current.clientWidth;
      const newIndex = Math.round(scrollPosition / containerWidth);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  return (
    <div
      className="home-carousel-wrapper fade-in-up"
      style={{ animationDelay: '0.6s' }}
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
    >
      {hasCarouselEffect && (
        <button className="carousel-nav-btn prev" onClick={scrollLeft} aria-label="Précédent">
          <ChevronLeft size={24} />
        </button>
      )}

      <div 
        className={`home-carousel-container ${hasCarouselEffect ? 'scrollable-banner' : ''}`} 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {displayMedias.map((media, idx) => {
          let mediaContent = null;
          if (media.type_media === 'VIDEO' && media.url_video) {
            const youtubeId = extractYouTubeId(media.url_video);
            if (youtubeId) {
              if (idx === activeIndex) {
                mediaContent = (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&showinfo=0`}
                    title={media.titre || "Video"}
                    className="carousel-media"
                    frameBorder="0"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ pointerEvents: 'none' }}
                  />
                );
              } else {
                mediaContent = (
                  <img 
                    src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`} 
                    alt={media.titre || "Video Thumbnail"} 
                    className="carousel-media"
                    style={{ objectFit: 'cover' }}
                  />
                );
              }
            }
          } else if (media.fichier) {
            mediaContent = (
              <img
                src={media.fichier}
                alt={media.titre || "Média du carrousel"}
                className="carousel-media"
              />
            );
          } else {
            // Sans image, un fond aux couleurs du site plutôt qu'une vignette
            // vide ou une image cassée.
            mediaContent = <div className="carousel-media carousel-media-vide" aria-hidden="true" />;
          }

          return (
            <div key={media.id} className="carousel-slide-banner">
              {mediaContent}
              
              {(media.titre || media.description) && (
                <div className="carousel-caption-banner">
                  {media.titre && <h3>{media.titre}</h3>}
                  {media.description && <p>{media.description}</p>}
                  {media.to && (
                    <Link to={media.to} className="carousel-cta">Découvrir</Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasCarouselEffect && (
        <>
          <button className="carousel-nav-btn next" onClick={scrollRight} aria-label="Suivant">
            <ChevronRight size={24} />
          </button>
          
          <div className="carousel-indicators">
            {displayMedias.map((_, idx) => (
              <button
                key={idx}
                className={`carousel-dot ${idx === activeIndex ? 'active' : ''}`}
                onClick={() => scrollTo(idx)}
                aria-label={`Aller à la diapositive ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HomeCarousel;
