import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Play, Download, Image as ImageIcon, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { telechargerRessource } from '../services/api';
import './SermonCard.css';

export function SermonCard({ sermon }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { estConnecte } = useAuth();

  const handlePlay = () => {
    if (sermon.fichier_audio) {
      const event = new CustomEvent('play-sermon', {
        detail: { url: sermon.fichier_audio, title: sermon.titre },
      });
      window.dispatchEvent(event);
    }
  };

  // Telechargement protege : redirige vers la connexion si non connecte.
  const telecharger = async (format) => {
    if (!estConnecte) {
      navigate('/connexion', {
        state: {
          depuis: location.pathname,
          info: 'Connectez-vous ou inscrivez-vous pour telecharger cette ressource.',
        },
      });
      return;
    }
    try {
      await telechargerRessource(sermon.id, format);
    } catch {
      // En cas d'echec, on ouvre la fiche detaillee ou un message s'affichera.
      navigate(`/sermon/${sermon.id}`);
    }
  };

  return (
    <div className="sermon-card glass-card">
      {sermon.image_couverture && (
        <img src={sermon.image_couverture} alt={sermon.titre} className="cover" />
      )}
      <div className="info">
        <div className="sermon-card-top">
          <h3>{sermon.titre}</h3>
          <span className="sermon-type">{sermon.type_media}</span>
        </div>
        <Link to={`/pasteurs/${sermon.pasteur.id}`} className="pastor-link">
          <UserRound size={14} />
          {sermon.pasteur.nom_affichage}
        </Link>
        <p className="sermon-description">
          {sermon.description || 'Une predication a decouvrir des maintenant.'}
        </p>
        <div className="sermon-meta">
          <span>{sermon.duree_secondes}s</span>
          <span>{sermon.nombre_vues} vues</span>
        </div>
        {sermon.categories.length ? (
          <div className="sermon-categories">
            {sermon.categories.slice(0, 2).map((categorie) => (
              <span key={categorie.id} className="sermon-category">{categorie.nom}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="actions">
        {sermon.type_media !== 'VIDEO' && sermon.fichier_audio && (
          <button className="btn btn-primary" onClick={handlePlay}>
            <Play size={16} /> Écouter
          </button>
        )}
        {sermon.type_media !== 'AUDIO' && (sermon.fichier_video || sermon.url_video) && (
          <button className="btn btn-primary" onClick={() => navigate(`/sermon/${sermon.id}`)}>
            <ImageIcon size={16} /> Visionner
          </button>
        )}
        {sermon.fichier_audio && (
          <button className="btn" onClick={() => telecharger('audio')} title="Telecharger l'audio">
            <Download size={16} />
          </button>
        )}
        {sermon.fichier_video && (
          <button className="btn" onClick={() => telecharger('video')} title="Telecharger la video">
            <Download size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
