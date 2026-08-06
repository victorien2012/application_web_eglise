import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Download, MonitorPlay, Headphones, UserRound, Loader2, Play } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { telechargerRessource, telechargerRessourceExterne } from '../../../services/api';
import { Button } from '../../../components/Button';
import './SermonCard.css';

export function SermonCard({ sermon }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { estConnecte } = useAuth();
  const [telechargement, setTelechargement] = useState(null); // { statut: 'chargement' | 'erreur', erreurMsg: '' }
  const [survol, setSurvol] = useState(false);

  const youtubeMatch = sermon.url_video ? sermon.url_video.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/) : null;
  const youtubeId = youtubeMatch ? youtubeMatch[1] : null;
  const estVideo = sermon.type_media !== 'AUDIO';
  const imageUrl = sermon.url_image_couverture || sermon.image_couverture || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);

  // La durée était affichée en secondes brutes (« 4800s ») : illisible.
  const dureeLisible = (() => {
    const total = Number(sermon.duree_secondes) || 0;
    if (total <= 0) return null;
    const heures = Math.floor(total / 3600);
    const minutes = Math.round((total % 3600) / 60);
    return heures ? `${heures} h ${String(minutes).padStart(2, '0')}` : `${minutes} min`;
  })();

  const handlePlay = () => {
    if (sermon.fichier_audio) {
      const event = new CustomEvent('play-sermon', {
        detail: { url: sermon.fichier_audio, title: sermon.titre },
      });
      window.dispatchEvent(event);
    }
  };

  const demanderTelechargement = (format) => {
    if (!estConnecte) {
      navigate('/compte-fidele', {
        state: {
          depuis: location.pathname,
          info: 'Connectez-vous ou inscrivez-vous pour telecharger cette ressource.',
        },
      });
      return;
    }
    setTelechargement({ format, statut: 'confirmation', erreurMsg: '' });
  };

  const executerTelechargement = async () => {
    if (!telechargement) return;
    const { format } = telechargement;
    
    setTelechargement({ format, statut: 'chargement', erreurMsg: '' });
    
    try {
      if (sermon.fichier_video || sermon.fichier_audio) {
        await telechargerRessource(sermon.id, format);
      } else if (sermon.url_video) {
        await telechargerRessourceExterne(sermon.id, format);
      }
      setTelechargement(null);
    } catch (error) {
      let erreurMsg = 'Le téléchargement a échoué. Veuillez réessayer.';
      if (error.response?.data?.detail) {
        if (error.response.data.detail.includes('Sign in to confirm') || error.response.data.detail.includes('bot')) {
          erreurMsg = "YouTube bloque le téléchargement direct de cette vidéo (protection anti-bot).";
        } else {
          erreurMsg = error.response.data.detail;
        }
      }
      setTelechargement({ format, statut: 'erreur', erreurMsg });
    }
  };

  return (
    <div 
      className="sermon-card glass-card"
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
    >
      {/* L'image mène à la prédication : c'est la plus grande zone de la carte,
          et cliquer dessus ne faisait rien auparavant. */}
      <Link
        to={`/sermon/${sermon.id}`}
        className="cover-wrapper"
        aria-label={`Ouvrir : ${sermon.titre}`}
        style={{ position: 'relative', display: 'block', width: '100%', height: '180px', overflow: 'hidden' }}
      >
        {estVideo && survol && (sermon.fichier_video || youtubeId) ? (
          sermon.fichier_video ? (
            <video 
              src={sermon.fichier_video} 
              muted 
              autoPlay 
              loop 
              playsInline 
              className="cover" 
              style={{ objectFit: 'cover', pointerEvents: 'none', width: '100%', height: '100%' }}
            />
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0`}
              title={sermon.titre}
              className="cover"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              style={{ objectFit: 'cover', pointerEvents: 'none', border: 'none', width: '100%', height: '100%' }}
            />
          )
        ) : (
          imageUrl ? (
            <img src={imageUrl} alt={sermon.titre} className="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div className="cover" style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              {estVideo ? <MonitorPlay size={48} /> : <Headphones size={48} />}
            </div>
          )
        )}
        
        {/* Overlay icône Play pour les vidéos */}
        {estVideo && (
          <div className="video-play-overlay" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: survol ? 'transparent' : 'rgba(0,0,0,0.2)',
            transition: 'background-color 0.3s ease',
            pointerEvents: 'none'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: survol ? 'rgba(245, 158, 11, 0.9)' : 'rgba(255,255,255,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: survol ? '0 0 20px rgba(245, 158, 11, 0.6)' : '0 4px 10px rgba(0,0,0,0.3)',
              color: survol ? '#fff' : '#000',
              transform: survol ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s ease'
            }}>
              <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />
            </div>
          </div>
        )}
      </Link>
      <div className="info">
        <div className="sermon-card-top">
          {/* Le titre mène à la prédication : auparavant, ni le titre ni
              l'image n'étaient cliquables, seuls les boutons l'étaient. */}
          <h3>
            <Link to={`/sermon/${sermon.id}`} className="sermon-titre-lien">
              {sermon.titre}
            </Link>
          </h3>
          <span className="sermon-type">{sermon.type_media}</span>
        </div>
        {sermon.pasteur ? (
          <Link to={`/pasteurs/${sermon.pasteur.id}`} className="pastor-link">
            <UserRound size={14} />
            {sermon.nom_predicateur || sermon.pasteur.nom_affichage}
          </Link>
        ) : sermon.nom_predicateur ? (
          <span className="pastor-link">
            <UserRound size={14} />
            {sermon.nom_predicateur}
          </span>
        ) : null}
        <p className="sermon-description">
          {sermon.description || 'Une predication a decouvrir des maintenant.'}
        </p>
        <div className="sermon-meta">
          {dureeLisible && <span>{dureeLisible}</span>}
          <span>{sermon.nombre_vues > 0 ? `${sermon.nombre_vues} vues` : 'Nouveau'}</span>
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
          <Button variant="primary" onClick={handlePlay} icon={Headphones} iconPosition="left" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
            Écouter
          </Button>
        )}
        {sermon.type_media !== 'AUDIO' && (sermon.fichier_video || sermon.url_video) && (
          <Button variant="primary" onClick={() => navigate(`/sermon/${sermon.id}`)} icon={MonitorPlay} iconPosition="left" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
            Visionner
          </Button>
        )}
        {sermon.fichier_audio && !sermon.fichier_video && !sermon.url_video && (
          <Button variant="neutral" onClick={() => demanderTelechargement('audio')} title="Télécharger l'audio" icon={Download} style={{ padding: '0.6rem', minWidth: '40px' }} />
        )}
        {(sermon.fichier_video || sermon.url_video) && (
          <Button variant="neutral" onClick={() => demanderTelechargement('video')} title="Télécharger la vidéo" icon={Download} style={{ padding: '0.6rem', minWidth: '40px' }} />
        )}
      </div>

      {/* MODAL DE TÉLÉCHARGEMENT */}
      {telechargement && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '3rem 2.5rem', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeInDown 0.3s ease-out' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>Téléchargement</h3>
            
            {telechargement.statut === 'confirmation' ? (
              <>
                <div style={{ color: '#005eb8', marginBottom: '1.5rem' }}>
                  <Download size={54} style={{ margin: '0 auto', display: 'block' }} />
                </div>
                <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem', margin: '0 0 2rem 0' }}>
                  Voulez-vous vraiment télécharger le fichier pour <strong>{sermon.titre}</strong> ?
                  <br /><br />
                  <span style={{ fontSize: '0.9rem' }}>Attention : Le fichier peut être volumineux selon la durée de la vidéo.</span>
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button type="button" onClick={() => setTelechargement(null)} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    Annuler
                  </button>
                  <button type="button" onClick={executerTelechargement} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 6px rgba(0, 94, 184, 0.2)' }}>
                    Confirmer
                  </button>
                </div>
              </>
            ) : telechargement.statut === 'chargement' ? (
              <>
                <Loader2 size={54} color="#005eb8" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem auto', display: 'block' }} />
                <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
                  Préparation du fichier pour <strong>{sermon.titre}</strong>...
                  <br /><br />
                  <span style={{ fontSize: '0.9rem' }}>Veuillez patienter, la génération du lien direct peut prendre quelques secondes.</span>
                </p>
              </>
            ) : (
              <>
                <div style={{ color: '#ef4444', marginBottom: '1.5rem' }}>
                  <svg width="54" height="54" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ margin: '0 auto', display: 'block' }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '2rem' }}>{telechargement.erreurMsg}</p>
                <button type="button" onClick={() => setTelechargement(null)} style={{ padding: '0.75rem 2rem', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
