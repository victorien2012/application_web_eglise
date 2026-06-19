import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSite } from '../../../context/SiteContext';
import './HomeCarousel.css';

const HomeCarousel = ({ medias }) => {
  const { t } = useTranslation();
  const { siteConfig } = useSite();
  const scrollRef = useRef(null);

  if (!medias || medias.length === 0) {
    // Fallback à l'aigle si aucun média
    return (
      <div className="animate-eagle-fly">
        <img 
          src={siteConfig?.logo || "/user_eagle.png"} 
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
    );
  }

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  const hasCarouselEffect = medias.length > 2;

  return (
    <div className="home-carousel-wrapper fade-in-up" style={{ animationDelay: '0.6s' }}>
      {hasCarouselEffect && (
        <button className="carousel-nav-btn prev" onClick={scrollLeft} aria-label="Précédent">
          <ChevronLeft size={24} />
        </button>
      )}

      <div 
        className={`home-carousel-container ${hasCarouselEffect ? 'scrollable' : 'centered'}`} 
        ref={scrollRef}
      >
        {medias.map((media) => {
          let mediaContent = null;
          if (media.type_media === 'VIDEO' && media.url_video) {
            const youtubeId = extractYouTubeId(media.url_video);
            if (youtubeId) {
              mediaContent = (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&showinfo=0`}
                  title={media.titre || "Video"}
                  className="carousel-media"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ pointerEvents: 'none' }}
                />
              );
            }
          } else {
            mediaContent = (
              <img 
                src={media.fichier} 
                alt={media.titre || "Média du carrousel"} 
                className="carousel-media"
              />
            );
          }

          return (
            <div key={media.id} className="carousel-slide">
              {mediaContent}
              
              {(media.titre || media.description) && (
                <div className="carousel-caption">
                  {media.titre && <h3>{media.titre}</h3>}
                  {media.description && <p>{media.description}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasCarouselEffect && (
        <button className="carousel-nav-btn next" onClick={scrollRight} aria-label="Suivant">
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
};

export default HomeCarousel;
