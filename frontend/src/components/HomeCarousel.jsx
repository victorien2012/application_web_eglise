import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './HomeCarousel.css';

const HomeCarousel = ({ medias }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!medias || medias.length <= 1) return;

    // TODO: If the current media is a video, we could wait for it to finish.
    // For now, we'll use a fixed interval of 8 seconds.
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % medias.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [medias]);

  if (!medias || medias.length === 0) {
    // Fallback à l'aigle si aucun média
    return (
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
    );
  }

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="home-carousel-container fade-in-up" style={{ animationDelay: '0.6s' }}>
      {medias.map((media, index) => {
        const isActive = index === currentIndex;
        let className = "carousel-slide";
        if (isActive) className += " active";
        
        let mediaContent = null;
        if (media.type_media === 'VIDEO' && media.url_video) {
          const youtubeId = extractYouTubeId(media.url_video);
          if (youtubeId) {
            mediaContent = (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${isActive ? 1 : 0}&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&showinfo=0`}
                title={media.titre || "Video"}
                className="carousel-media"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ pointerEvents: 'none' }} // Empêche le clic pour garder l'aspect décoratif
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
          <div key={media.id} className={className}>
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

      {medias.length > 1 && (
        <div className="carousel-indicators">
          {medias.map((_, index) => (
            <button 
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Aller à la diapositive ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeCarousel;
