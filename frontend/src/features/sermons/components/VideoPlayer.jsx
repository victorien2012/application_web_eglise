import { X, ExternalLink } from 'lucide-react';
import './VideoPlayer.css';

// Extrait l'identifiant d'une vidéo YouTube depuis ses différentes formes d'URL.
function obtenirIdYouTube(url) {
  if (!url) return null;
  const motifs = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const motif of motifs) {
    const correspondance = url.match(motif);
    if (correspondance) return correspondance[1];
  }
  return null;
}

export function VideoPlayer({ src, onClose }) {
  const idYouTube = obtenirIdYouTube(src);

  return (
    <div className="video-overlay glass-card">
      <button className="close-btn btn" onClick={onClose}>
        <X size={20} />
      </button>
      {idYouTube ? (
        // Vidéo externe (YouTube) : lecteur intégré via iframe + repli vers YouTube.
        <div className="video-youtube-wrapper">
          <iframe
            className="video-element video-iframe"
            src={`https://www.youtube.com/embed/${idYouTube}?autoplay=1&rel=0`}
            title="Lecteur vidéo YouTube"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          <a
            className="video-youtube-link"
            href={`https://www.youtube.com/watch?v=${idYouTube}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} />
            La vidéo ne se lance pas ? Ouvrir sur YouTube
          </a>
        </div>
      ) : (
        // Fichier vidéo hébergé (mp4, etc.) : lecteur HTML5 natif.
        <video controls autoPlay src={src} className="video-element" />
      )}
    </div>
  );
}
