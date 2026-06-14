// src/pages/Videos.jsx
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, PlaySquare, FileText, Loader2, Play, Film, Mic2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, extraireListe, telechargerRessource, telechargerRessourceExterne } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VideoPlayer } from '../components/VideoPlayer';
import { SermonTable } from '../components/SermonTable';
import Pagination from '../components/Pagination';
import './Videos.css';

export function Videos() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { estConnecte } = useAuth();

  const [recherche, setRecherche] = useState('');
  const [predications, setPredications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [videoEnLecture, setVideoEnLecture] = useState(null);
  const [telechargement, setTelechargement] = useState(null); // { sermon, statut: 'chargement' | 'erreur', erreurMsg: '' }

  const demanderTelechargement = (sermon, format) => {
    if (!estConnecte) {
      navigate('/compte-fidele', {
        state: {
          depuis: location.pathname,
          info: t('videos.download_login_required'),
        },
      });
      return;
    }
    setTelechargement({ sermon, format, statut: 'confirmation', erreurMsg: '' });
  };

  const executerTelechargement = async () => {
    if (!telechargement) return;
    const { sermon, format } = telechargement;
    
    setTelechargement({ sermon, format, statut: 'chargement', erreurMsg: '' });
    
    try {
      if (sermon.fichier_video || sermon.fichier_audio) {
        await telechargerRessource(sermon.id, format);
      } else if (sermon.url_video) {
        await telechargerRessourceExterne(sermon.id, format);
      }
      setTelechargement(null);
    } catch {
      setTelechargement({ sermon, format, statut: 'erreur', erreurMsg: t('videos.download_error') });
    }
  };

  useEffect(() => {
    let active = true;
    async function charger() {
      try {
        setChargement(true);
        const params = {};
        if (recherche.trim()) {
          params.search = recherche.trim();
        }
        const response = await api.get('/predications/', { params });
        if (active) {
          setPredications(extraireListe(response.data));
          setErreur('');
        }
      } catch (e) {
        if (active) setErreur(e.response?.data?.detail ?? t('videos.load_error'));
      } finally {
        if (active) setChargement(false);
      }
    }
    charger();
    return () => { active = false; };
  }, [recherche]);

  const filtered = useMemo(() => {
    if (!recherche.trim()) return predications;
    const term = recherche.toLowerCase();
    return predications.filter(p =>
      (p.titre && p.titre.toLowerCase().includes(term)) ||
      (p.nom_predicateur && p.nom_predicateur.toLowerCase().includes(term)) ||
      (p.pasteur?.nom_affichage && p.pasteur.nom_affichage.toLowerCase().includes(term))
    );
  }, [recherche, predications]);

  const [page, setPage] = useState(1);
  
  // Réinitialiser à la page 1 lors d'une recherche
  useEffect(() => {
    setPage(1);
  }, [recherche]);

  const rowsPerPage = 10;
  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page]);

  return (
    <div className="videos-container">

      {/* HERO */}
      <div className="videos-hero-wrapper">
        <div className="videos-header-title">
          <span className="section-badge">{t('videos.library_badge')}</span>
          <h1>{t('videos.title')}</h1>
          <p>{t('videos.subtitle')}</p>
        </div>
      </div>

      {/* CORPS */}
      <div className="videos-body">
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-title">
            <h3>{t('videos.library_badge')}</h3>
            <span>{filtered.length} {filtered.length > 1 ? t('videos.videos_available') : t('videos.videos_available_singular')}</span>
          </div>
          <div className="search-input-wrapper">
            <Search className="search-icon" size={16} />
            <input 
              placeholder={t('videos.search_placeholder')} 
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
        </div>

        {chargement && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Loader2 className="spinner" size={32} style={{ margin: '0 auto 1rem', display: 'block', animation: 'spin 1s linear infinite' }} />
            <p>{t('videos.loading')}</p>
          </div>
        )}
        
        {erreur && <div className="error-message" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{erreur}</div>}

        {!chargement && !erreur && (
          <SermonTable
            predications={paginated}
            showStatus={false}
            showCheckbox={false}
            onImageClick={(p) => {
              const isVideo = p.type_media === 'VIDEO' || !!p.url_video;
              if (isVideo && p.url_video) {
                setVideoEnLecture(p.url_video);
              }
            }}
            renderActions={(p) => {
              const isVideo = p.type_media === 'VIDEO' || !!p.url_video;
              return (
                <>
                  {isVideo && (p.url_video || p.fichier_video) && (
                    <button type="button" className="btn-action btn-icon-only btn-visionner" onClick={() => setVideoEnLecture(p.url_video || p.fichier_video)} title={t('videos.action_watch')}>
                      <Play size={14} fill="currentColor" />
                    </button>
                  )}
                  {p.pieces_jointes && p.pieces_jointes.map((pj) => (
                    <button
                      key={pj.id}
                      type="button"
                      className="btn-action btn-icon-only btn-pdf"
                      onClick={() => window.open(pj.fichier, '_blank')}
                      title={`${t('videos.action_open_doc')} ${pj.nom}`}
                    >
                      <FileText size={14} />
                    </button>
                  ))}
                  {(p.fichier_video || p.url_video) && (
                    <button type="button" className="btn-action btn-icon-only btn-download" onClick={() => demanderTelechargement(p, 'video')} title={t('videos.action_dl_video')}>
                      <Download size={14} />
                    </button>
                  )}
                  {p.fichier_audio && !p.fichier_video && !p.url_video && (
                    <button type="button" className="btn-action btn-icon-only btn-download" onClick={() => demanderTelechargement(p, 'audio')} title={t('videos.action_dl_audio')}>
                      <Download size={14} />
                    </button>
                  )}
                </>
              );
            }}
          />
        )}

        {!chargement && !erreur && paginated.length > 0 && (
          <div className="datatable-footer-pagination">
            <span>{t('videos.pagination_info_1')} {(page - 1) * rowsPerPage + 1} {t('videos.pagination_info_2')} {Math.min(page * rowsPerPage, filtered.length)} {t('videos.pagination_info_3')} {filtered.length}</span>
            <Pagination current={page} total={Math.ceil(filtered.length / rowsPerPage)} onChange={setPage} />
          </div>
        )}
      </div>

      {/* MODAL DE TÉLÉCHARGEMENT */}
      {telechargement && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '3rem 2.5rem', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeInDown 0.3s ease-out' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>{t('videos.modal_dl_title')}</h3>
            
            {telechargement.statut === 'confirmation' ? (
              <>
                <div style={{ color: '#005eb8', marginBottom: '1.5rem' }}>
                  <Download size={54} style={{ margin: '0 auto', display: 'block' }} />
                </div>
                <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem', margin: '0 0 2rem 0' }}>
                  {t('videos.modal_dl_confirm')} <strong>{telechargement.sermon.titre}</strong> ?
                  <br /><br />
                  <span style={{ fontSize: '0.9rem' }}>{t('videos.modal_dl_warning')}</span>
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button type="button" onClick={() => setTelechargement(null)} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    {t('videos.modal_dl_cancel')}
                  </button>
                  <button type="button" className="btn-action btn-visionner" onClick={executerTelechargement} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                    {t('videos.modal_dl_confirm_btn')}
                  </button>
                </div>
              </>
            ) : telechargement.statut === 'chargement' ? (
              <>
                <Loader2 size={54} color="#005eb8" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem auto', display: 'block' }} />
                <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
                  {t('videos.modal_dl_prep')} <strong>{telechargement.sermon.titre}</strong>...
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
                <button type="button" className="btn-action btn-visionner" onClick={() => setTelechargement(null)} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                  {t('videos.modal_dl_close')}
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      </div>{/* fin videos-body */}

      {videoEnLecture && createPortal(
        <VideoPlayer src={videoEnLecture} onClose={() => setVideoEnLecture(null)} />,
        document.body
      )}
    </div>
  );
}

export default Videos;
