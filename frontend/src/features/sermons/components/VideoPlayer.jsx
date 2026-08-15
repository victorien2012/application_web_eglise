import { ExternalLink } from 'lucide-react';
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

/**
 * Lecteur intégré à la page (comme YouTube), pas une fenêtre modale : occupe
 * l'espace de son conteneur parent en 16:9, sans fond ni bouton fermer.
 * L'appelant qui a réellement besoin d'un aperçu en fenêtre (ex. tableau de
 * bord pasteur) fournit sa propre fenêtre autour de ce composant.
 */
export function VideoPlayer({ src }) {
  const idYouTube = obtenirIdYouTube(src);

  if (idYouTube) {
    return (
      <div className="video-player-embed">
        <iframe
          className="video-iframe"
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
    );
  }

  // Fichier vidéo hébergé (mp4, etc.) : lecteur HTML5 natif.
  return (
    <div className="video-player-embed">
      <video controls autoPlay src={src} className="video-element" />
    </div>
  );
}
