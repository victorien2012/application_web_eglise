// src/pages/SermonDetail.jsx
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { SectionCommentaires } from '../components/SectionCommentaires';
import { Play, Download, Heart } from 'lucide-react';
import { api, telechargerRessource } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFavori } from '../hooks/useEngagement';
import './SermonDetail.css';

export function SermonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { estConnecte } = useAuth();
  const [sermon, setSermon] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [erreur, setErreur] = useState('');
  const [erreurTelechargement, setErreurTelechargement] = useState('');
  const { estFavori, basculer, pret: favoriPret } = useFavori(id);

  useEffect(() => {
    let active = true;

    async function charger() {
      try {
        const response = await api.get(`/predications/${id}/`);
        if (active) {
          setSermon(response.data);
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || 'Impossible de charger cette predication.');
        }
      }
    }

    charger();
    return () => {
      active = false;
    };
  }, [id]);

  // Enregistre la lecture dans l'historique de l'utilisateur connecte.
  useEffect(() => {
    if (!estConnecte || !id) return;
    api.post('/historique-lecture/', { predication: Number(id), position_secondes: 0 }).catch(() => {});
  }, [estConnecte, id]);

  if (erreur) {
    return <p className="page-state error">{erreur}</p>;
  }

  if (!sermon) {
    return <p className="page-state">Chargement de la predication...</p>;
  }

  // Telechargement protege : si le visiteur n'est pas connecte, on le redirige
  // vers la connexion (avec retour automatique vers cette ressource ensuite).
  async function telecharger(format) {
    setErreurTelechargement('');
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
      await telechargerRessource(id, format);
    } catch (error) {
      setErreurTelechargement(
        error.response?.status === 404
          ? "Aucun fichier disponible pour ce format."
          : "Le telechargement a echoue. Veuillez reessayer."
      );
    }
  }

  return (
    <section className="sermon-detail">
      <p className="section-kicker">Predication</p>
      <h1>{sermon.titre}</h1>
      <p className="byline">
        Par <Link to={`/pasteurs/${sermon.pasteur.id}`}>{sermon.pasteur.nom_affichage}</Link>
      </p>
      {sermon.image_couverture && <img src={sermon.image_couverture} alt={sermon.titre} className="cover" />}
      <div className="media-actions">
        {sermon.type_media !== 'VIDEO' && sermon.fichier_audio && (
          <button className="btn btn-primary" onClick={() => {
            const ev = new CustomEvent('play-sermon', { detail: { url: sermon.fichier_audio, title: sermon.titre } });
            window.dispatchEvent(ev);
          }} type="button">
            <Play size={16} /> Écouter
          </button>
        )}
        {sermon.type_media !== 'AUDIO' && (sermon.fichier_video || sermon.url_video) && (
          <button className="btn btn-primary" onClick={() => setShowVideo(true)} type="button">
            <Play size={16} /> Visionner
          </button>
        )}
        {sermon.fichier_audio && (
          <button className="btn" onClick={() => telecharger('audio')} type="button" title="Telecharger l'audio"><Download size={16} /> Audio</button>
        )}
        {sermon.fichier_video && (
          <button className="btn" onClick={() => telecharger('video')} type="button" title="Telecharger la video"><Download size={16} /> Video</button>
        )}
        {estConnecte && (
          <button
            className={`btn${estFavori ? ' btn-primary' : ''}`}
            onClick={basculer}
            disabled={!favoriPret}
            type="button"
            title={estFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart size={16} fill={estFavori ? 'currentColor' : 'none'} />
            {estFavori ? 'Favori' : 'Ajouter aux favoris'}
          </button>
        )}
      </div>
      {erreurTelechargement ? (
        <p className="erreur-connexion" style={{ marginTop: '0.5rem' }}>{erreurTelechargement}</p>
      ) : null}
      <div className="sermon-detail-meta">
        <span>{sermon.type_media}</span>
        <span>{sermon.duree_secondes || 0}s</span>
        <span>{sermon.nombre_vues} vues</span>
      </div>
      {showVideo && (
        <VideoPlayer src={sermon.fichier_video || sermon.url_video} onClose={() => setShowVideo(false)} />
      )}
      <article className="description" dangerouslySetInnerHTML={{ __html: sermon.description || '<p>Aucune description disponible.</p>' }} />

      <SectionCommentaires predicationId={Number(id)} />
    </section>
  );
}
