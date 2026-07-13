import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSite } from '../../../context/SiteContext';
import './HomeCarousel.css';

const HomeCarousel = ({ medias }) => {
  const { t } = useTranslation();
  const { siteConfig } = useSite();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Fallback banners if no medias are provided
  const displayMedias = (!medias || medias.length === 0) ? [
    {
      id: 'default-1',
      fichier: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
      titre: "Bienvenue dans notre Église",
      description: "S'Équiper pour Bâtir, S'Unir pour Grandir",
      type_media: 'IMAGE'
    },
    {
      id: 'default-2',
      fichier: 'https://images.unsplash.com/photo-1548625361-ec8531ce3e08?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
      titre: "Rejoignez notre Communauté",
      description: "Des moments de partage et de foi inoubliables",
      type_media: 'IMAGE'
    }
  ] : medias;

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const scrollTo = (index) => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({ left: index * containerWidth, behavior: 'smooth' });
      setActiveIndex(index);
    }
  };

  const scrollLeft = () => {
    if (activeIndex > 0) scrollTo(activeIndex - 1);
    else scrollTo(displayMedias.length - 1); // loop to end
  };

  const scrollRight = () => {
    if (activeIndex < displayMedias.length - 1) scrollTo(activeIndex + 1);
    else scrollTo(0); // loop to start
  };

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

  const hasCarouselEffect = displayMedias.length > 1;

  return (
    <div className="home-carousel-wrapper fade-in-up" style={{ animationDelay: '0.6s' }}>
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
            <div key={media.id} className="carousel-slide-banner">
              {mediaContent}
              
              {(media.titre || media.description) && (
                <div className="carousel-caption-banner">
                  {media.titre && <h3>{media.titre}</h3>}
                  {media.description && <p>{media.description}</p>}
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
