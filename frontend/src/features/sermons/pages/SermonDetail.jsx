// src/pages/SermonDetail.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { VideoPlayer } from '../../sermons/components/VideoPlayer';
import { SectionCommentaires } from '../../sermons/components/SectionCommentaires';
import { 
  Play, Download, Heart, Compass, Calendar, Clock, Eye, ArrowLeft, 
  ExternalLink, FileText, UserRound, Music, Film
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useFavori } from '../../../hooks/useEngagement';
import { Button } from '../../../components/Button';
import { api, telechargerRessource, telechargerRessourceExterne, extraireListe } from '../../../services/api';
import { SermonCard } from '../components/SermonCard';
import './SermonDetail.css';

export function SermonDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { estConnecte } = useAuth();
  const [sermon, setSermon] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [erreur, setErreur] = useState('');
  const [telechargement, setTelechargement] = useState(null); // { format: 'audio'|'video', statut: 'confirmation' | 'chargement' | 'erreur', erreurMsg: '' }
  const [sermonsSimilaires, setSermonsSimilaires] = useState([]);
  const [modeCinema, setModeCinema] = useState(false);
  const { estFavori, basculer, pret: favoriPret } = useFavori(id);

  useEffect(() => {
    let active = true;

    async function charger() {
      try {
        const response = await api.get(`/predications/${id}/`);
        if (active) {
          setSermon(response.data);
          setErreur('');
          
          // Fetch similar
          try {
            const allRes = await api.get('/predications/');
            const all = extraireListe(allRes.data);
            const similaires = all.filter(p => p.id !== Number(id)).slice(0, 3);
            setSermonsSimilaires(similaires);
          } catch(e) { console.error(e); }
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || t('sermon_detail.load_error'));
        }
      }
    }

    charger();
    return () => {
      active = false;
    };
  }, [id]);

  // Enregistre la lecture dans l'historique de l'utilisateur connecté.
  useEffect(() => {
    if (!estConnecte || !id) return;
    api.post('/historique-lecture/', { predication: Number(id), position_secondes: 0 }).catch(() => {});
  }, [estConnecte, id]);

  if (erreur) {
    return (
      <div className="sermon-detail-container page-state-container">
        <p className="page-state error">{erreur}</p>
        <Link to="/videos" className="back-link-btn">
          <ArrowLeft size={16} /> {t('sermon_detail.back_to_list')}
        </Link>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="sermon-detail-container page-state-container">
        <p className="page-state">{t('sermon_detail.loading')}</p>
      </div>
    );
  }

  const demanderTelechargement = (format) => {
    if (!estConnecte) {
      navigate('/compte-fidele', {
        state: {
          depuis: location.pathname,
          info: t('videos.download_login_required'),
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
      if (format === 'audio' && sermon.fichier_audio) {
        await telechargerRessource(id, 'audio');
      } else if (format === 'video' && sermon.fichier_video) {
        await telechargerRessource(id, 'video');
      } else if (format === 'video' && sermon.url_video) {
        await telechargerRessourceExterne(id, 'video');
      } else {
        await telechargerRessource(id, format);
      }
      setTelechargement(null);
    } catch (error) {
      let erreurMsg = error.response?.status === 404 ? t('sermon_detail.no_file') : t('videos.download_error');
      if (error.response?.data?.detail) {
        if (error.response.data.detail.includes('Sign in to confirm') || error.response.data.detail.includes('bot')) {
          erreurMsg = "YouTube bloque le téléchargement direct de cette vidéo (protection anti-bot).";
        } else if (error.response.status !== 404) {
          erreurMsg = error.response.data.detail;
        }
      }

      setTelechargement({ 
        format, 
        statut: 'erreur', 
        erreurMsg
      });
    }
  };

  const handleMediaPlay = () => {
    if (sermon.type_media !== 'AUDIO' && (sermon.fichier_video || sermon.url_video)) {
      setShowVideo(true);
    } else if (sermon.fichier_audio) {
      const ev = new CustomEvent('play-sermon', { detail: { url: sermon.fichier_audio, title: sermon.titre } });
      window.dispatchEvent(ev);
    }
  };

  // Extraire l'URL de l'image de couverture (gérer YouTube ou fichier)
  let coverUrl = sermon.image_couverture;
  if (!coverUrl && sermon.url_video) {
    const match = sermon.url_video.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (match && match[1]) {
      coverUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
  }

  // Calculer la durée formatée
  const formaterDuree = (secondes) => {
    if (!secondes) return '0s';
    if (secondes < 60) return `${secondes}s`;
    const minutes = Math.floor(secondes / 60);
    const restSecs = secondes % 60;
    if (minutes < 60) return `${minutes}m ${restSecs}s`;
    const heures = Math.floor(minutes / 60);
    const restMins = minutes % 60;
    return `${heures}h ${restMins}m`;
  };

  const aDuMedia = (sermon.type_media !== 'VIDEO' && sermon.fichier_audio) || (sermon.type_media !== 'AUDIO' && (sermon.fichier_video || sermon.url_video));

  return (
    <div className="sermon-detail-container">
      {/* Bouton retour et mode cinéma */}
      <div className="sermon-detail-header-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/videos" className="back-link">
          <ArrowLeft size={16} />
          <span>{t('sermon_detail.back_to_lib')}</span>
        </Link>
        <button 
          className={`btn-mode-cinema ${modeCinema ? 'active' : ''}`}
          onClick={() => setModeCinema(!modeCinema)}
          title="Mode Cinéma"
        >
          <Film size={16} /> {modeCinema ? 'Quitter Mode Cinéma' : 'Mode Cinéma'}
        </button>
      </div>

      <div className={`sermon-detail-grid ${modeCinema ? 'mode-cinema-active' : ''}`}>
        {/* COLONNE PRINCIPALE (GAUCHE) */}
        <div className="sermon-main-col">
          {/* Cover Interactive */}
          <div className="sermon-interactive-cover-wrapper">
            {coverUrl ? (
              <div className="sermon-cover-interactive" onClick={handleMediaPlay} style={{ cursor: aDuMedia ? 'pointer' : 'default' }}>
                <img src={coverUrl} alt={sermon.titre} className="cover-img" />
                {aDuMedia && (
                  <div className="cover-play-overlay">
                    <div className="cover-play-btn-circle">
                      <Play size={32} fill="white" color="white" className="cover-play-icon" />
                    </div>
                    <span className="cover-play-text">
                      {sermon.type_media === 'AUDIO' ? t('sermon_detail.play_audio') : t('sermon_detail.play_video')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="sermon-cover-fallback" onClick={handleMediaPlay} style={{ cursor: aDuMedia ? 'pointer' : 'default' }}>
                <div className="fallback-inner">
                  {sermon.type_media === 'AUDIO' ? <Music size={48} /> : <Film size={48} />}
                  <span>{sermon.titre}</span>
                  {aDuMedia && (
                    <div className="cover-play-btn-circle">
                      <Play size={24} fill="white" color="white" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* En-tête du Sermon */}
          <div className="sermon-content-header glass-card">
            <span className="sermon-badge-type">{sermon.type_media}</span>
            <h1 className="sermon-title">{sermon.titre}</h1>
            
            <div className="sermon-preacher-byline">
              {sermon.pasteur && (
                <div className="preacher-avatar-wrapper">
                  {sermon.pasteur.avatar ? (
                    <img src={sermon.pasteur.avatar} alt={sermon.pasteur.nom_affichage} className="preacher-mini-avatar" />
                  ) : (
                    <div className="preacher-avatar-placeholder">
                      <UserRound size={16} />
                    </div>
                  )}
                </div>
              )}
              <div className="byline-details">
                <span className="byline-author">
                  {t('sermon_detail.by')} {sermon.nom_predicateur || (sermon.pasteur && <Link to={`/pasteurs/${sermon.pasteur.id}`}>{sermon.pasteur.nom_affichage}</Link>)}
                </span>
                {sermon.nom_predicateur && sermon.pasteur && (
                  <span className="byline-source">
                    &nbsp;({t('sermon_detail.published_by')} <Link to={`/pasteurs/${sermon.pasteur.id}`}>{sermon.pasteur.nom_affichage}</Link>)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="sermon-description-card glass-card">
            <h2>{t('sermon_detail.about_title')}</h2>
            <div 
              className="description-content" 
              dangerouslySetInnerHTML={{ __html: sermon.description || `<p>${t('sermon_detail.no_desc')}</p>` }} 
            />
          </div>

          {/* Commentaires */}
          <div className="sermon-comments-card glass-card">
            <SectionCommentaires predicationId={Number(id)} />
          </div>
        </div>

        {/* COLONNE LATÉRALE (DROITE) */}
        <aside className="sermon-sidebar-col">
          {/* Actions rapides */}
          <div className="sidebar-card glass-card sidebar-actions-card">
            <h3>{t('sermon_detail.actions_title')}</h3>
            <div className="sidebar-actions-list">
              {sermon.type_media !== 'VIDEO' && sermon.fichier_audio && (
                <Button 
                  variant="blue" 
                  onClick={() => {
                    const ev = new CustomEvent('play-sermon', { detail: { url: sermon.fichier_audio, title: sermon.titre } });
                    window.dispatchEvent(ev);
                  }}
                  icon={Play}
                  className="w-full"
                >
                  {t('sermon_detail.action_listen')}
                </Button>
              )}
              {sermon.type_media !== 'AUDIO' && (sermon.fichier_video || sermon.url_video) && (
                <Button 
                  variant="blue" 
                  onClick={() => setShowVideo(true)}
                  icon={Play}
                  className="w-full"
                >
                  {t('sermon_detail.action_watch')}
                </Button>
              )}
              {sermon.fichier_audio && (
                <Button 
                  variant="neutral" 
                  onClick={() => demanderTelechargement('audio')}
                  icon={Download}
                  className="w-full"
                >
                  {t('sermon_detail.action_dl_audio')}
                </Button>
              )}
              {(sermon.fichier_video || sermon.url_video) && (
                <Button 
                  variant="neutral" 
                  onClick={() => demanderTelechargement('video')}
                  icon={Download}
                  className="w-full"
                >
                  {t('sermon_detail.action_dl_video')}
                </Button>
              )}
              {estConnecte && (
                <Button
                  variant="rose"
                  onClick={basculer}
                  disabled={!favoriPret}
                  icon={Heart}
                  className={`w-full ${estFavori ? 'active' : ''}`}
                >
                  {estFavori ? t('sermon_detail.favorite_added') : t('sermon_detail.favorite_add')}
                </Button>
              )}
            </div>
          </div>

          {/* Pièces jointes / Documents */}
          {sermon.pieces_jointes && sermon.pieces_jointes.length > 0 && (
            <div className="sidebar-card glass-card sidebar-attachments-card">
              <h3>{t('sermon_detail.docs_title')}</h3>
              <div className="sidebar-attachments-list">
                {sermon.pieces_jointes.map((pj) => (
                  <Button
                    key={pj.id}
                    variant="red"
                    onClick={() => window.open(pj.fichier, '_blank')}
                    icon={FileText}
                    className="w-full"
                    title={`Télécharger : ${pj.nom}`}
                  >
                    {pj.nom || t('sermon_detail.doc_pdf')}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Statistiques / Métadonnées */}
          <div className="sidebar-card glass-card sidebar-stats-card">
            <h3>{t('sermon_detail.info_title')}</h3>
            <ul className="stats-list">
              <li className="stats-item">
                <span className="stats-label">{t('sermon_detail.media_type')}</span>
                <span className="stats-value">{sermon.type_media}</span>
              </li>
              <li className="stats-item">
                <span className="stats-label">{t('sermon_detail.duration')}</span>
                <span className="stats-value">{formaterDuree(sermon.duree_secondes)}</span>
              </li>
              <li className="stats-item">
                <span className="stats-label">{t('sermon_detail.views')}</span>
                <span className="stats-value">{sermon.nombre_vues} {sermon.nombre_vues > 1 ? t('sermon_detail.view_plural') : t('sermon_detail.view_singular')}</span>
              </li>
              {sermon.nombre_telechargements !== undefined && (
                <li className="stats-item">
                  <span className="stats-label">{t('sermon_detail.downloads')}</span>
                  <span className="stats-value">{sermon.nombre_telechargements}</span>
                </li>
              )}
              <li className="stats-item">
                <span className="stats-label">{t('sermon_detail.publish_date')}</span>
                <span className="stats-value">
                  {sermon.date_publication ? new Date(sermon.date_publication).toLocaleDateString() : t('sermon_detail.not_defined')}
                </span>
              </li>
              {sermon.categories && sermon.categories.length > 0 && (
                <li className="stats-item categories-item">
                  <span className="stats-label">{t('sermon_detail.categories')}</span>
                  <div className="stats-categories-pills">
                    {sermon.categories.map((c) => (
                      <span key={c.id} className="stats-category-pill">{c.nom}</span>
                    ))}
                  </div>
                </li>
              )}
            </ul>
          </div>

          {/* Profil du prédicateur (si disponible) */}
          {sermon.pasteur && (
            <div className="sidebar-card glass-card sidebar-preacher-card">
              <h3>{t('sermon_detail.preacher_title')}</h3>
              <div className="sidebar-preacher-info">
                {sermon.pasteur.avatar ? (
                  <img src={sermon.pasteur.avatar} alt={sermon.pasteur.nom_affichage} className="preacher-card-avatar" />
                ) : (
                  <div className="preacher-card-avatar-placeholder">
                    <UserRound size={32} />
                  </div>
                )}
                <div className="preacher-card-details">
                  <h4>{sermon.pasteur.nom_affichage}</h4>
                  {sermon.pasteur.nom_eglise && <p className="preacher-church">{sermon.pasteur.nom_eglise}</p>}
                </div>
              </div>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Button to={`/pasteurs/${sermon.pasteur.id}`} variant="outline-dark" style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}>
                  {t('sermon_detail.view_channel')}
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Sermons Similaires */}
      {sermonsSimilaires.length > 0 && !modeCinema && (
        <div className="similar-sermons-section" style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Recommandé pour vous</h2>
          <div className="sermon-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {sermonsSimilaires.map((item, i) => (
              <div key={item.id} className="reveal-cascade" style={{ transitionDelay: `${i * 0.1}s` }}>
                <SermonCard sermon={item} />
              </div>
            ))}
          </div>
        </div>
      )}

      {showVideo && (
        <VideoPlayer src={sermon.fichier_video || sermon.url_video} onClose={() => setShowVideo(false)} />
      )}

      {/* MODAL DE TÉLÉCHARGEMENT */}
      {telechargement && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '3rem 2.5rem', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeInDown 0.3s ease-out', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem' }}>{t('videos.modal_dl_title')}</h3>
            
            {telechargement.statut === 'confirmation' ? (
              <>
                <div style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
                  <Download size={54} style={{ margin: '0 auto', display: 'block' }} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem', margin: '0 0 2rem 0' }}>
                  {t('videos.modal_dl_confirm')} <strong>{sermon.titre}</strong> ?
                  <br /><br />
                  <span style={{ fontSize: '0.9rem' }}>{t('videos.modal_dl_warning')}</span>
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button type="button" onClick={() => setTelechargement(null)} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', background: 'var(--bg-alt)', color: 'var(--text-main)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    {t('videos.modal_dl_cancel')}
                  </button>
                  <button type="button" onClick={executerTelechargement} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 6px rgba(0, 94, 184, 0.2)' }}>
                    {t('videos.modal_dl_confirm_btn')}
                  </button>
                </div>
              </>
            ) : telechargement.statut === 'chargement' ? (
              <>
                <div style={{ color: 'var(--primary)', margin: '0 auto 1.5rem auto', display: 'flex', justifyContent: 'center' }}>
                  <svg className="animate-spin" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                  </svg>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
                  {t('videos.modal_dl_prep')} <strong>{sermon.titre}</strong>...
                  <br /><br />
                  <span style={{ fontSize: '0.9rem' }}>{t('videos.modal_dl_prep_desc')}</span>
                </p>
              </>
            ) : (
              <>
                <div style={{ color: '#ef4444', marginBottom: '1.5rem' }}>
                  <svg width="54" height="54" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ margin: '0 auto', display: 'block' }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '2rem' }}>{telechargement.erreurMsg}</p>
                <button type="button" onClick={() => setTelechargement(null)} style={{ padding: '0.75rem 2rem', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  {t('videos.modal_dl_close')}
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
