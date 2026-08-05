// src/pages/Videos.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, PlaySquare, FileText, Loader2, Play, Film, Mic2, Download, LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, extraireListe, telechargerRessource, telechargerRessourceExterne } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { VideoPlayer } from '../../sermons/components/VideoPlayer';
import { SermonTable } from '../../sermons/components/SermonTable';
import { SermonCard } from '../components/SermonCard';
import Pagination from '../../../components/Pagination';
import './Videos.css';

// Doit rester cohérent avec `page_size` demandé au serveur.
const ELEMENTS_PAR_PAGE = 12;

// Le conteneur de défilement de l'application est #root (et non window) : son
// overflow-x masqué rend son overflow-y automatique. On remonte donc les deux.
function remonterEnHaut() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('root')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export function Videos() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { estConnecte } = useAuth();

  const [recherche, setRecherche] = useState('');
  // Terme réellement envoyé au serveur, mis à jour après un court délai de frappe.
  const [rechercheAppliquee, setRechercheAppliquee] = useState('');
  const [predications, setPredications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [videoEnLecture, setVideoEnLecture] = useState(null);
  const [telechargement, setTelechargement] = useState(null); // { sermon, statut: 'chargement' | 'erreur', erreurMsg: '' }
  const [vueActive, setVueActive] = useState('grille'); // 'grille' ou 'liste'
  const [filtreType, setFiltreType] = useState('tous'); // 'tous', 'video', 'audio'

  const changerFiltre = (type) => {
    setFiltreType(type);
    setPage(1);
  };

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

  // Anti-rebond : sans cela chaque frappe déclenchait une requête réseau.
  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRechercheAppliquee(recherche.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(minuteur);
  }, [recherche]);

  // La recherche, le filtre et la pagination sont désormais traités par le
  // serveur : la page ne télécharge plus que les éléments qu'elle affiche.
  useEffect(() => {
    let active = true;
    async function charger() {
      try {
        setChargement(true);
        const params = { page, page_size: ELEMENTS_PAR_PAGE };
        if (rechercheAppliquee) {
          params.search = rechercheAppliquee;
        }
        if (filtreType !== 'tous') {
          params.filtre_media = filtreType;
        }
        const response = await api.get('/predications/', { params });
        if (active) {
          setPredications(extraireListe(response.data));
          setTotal(
            typeof response.data?.count === 'number'
              ? response.data.count
              : extraireListe(response.data).length
          );
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
  }, [rechercheAppliquee, filtreType, page]);

  const totalPages = Math.max(1, Math.ceil(total / ELEMENTS_PAR_PAGE));

  const changerPage = (nouvellePage) => {
    setPage(nouvellePage);
    remonterEnHaut();
  };

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
        <div className="table-card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="table-title" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ margin: 0 }}>{t('videos.library_badge')}</h3>
              <span className="badge-count" style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {total} {total > 1 ? t('videos.videos_available') : t('videos.videos_available_singular')}
              </span>
            </div>
            <div className="filter-pills" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                className={`filter-pill ${filtreType === 'tous' ? 'active' : ''}`}
                onClick={() => changerFiltre('tous')}
              >
                Tous
              </button>
              <button
                className={`filter-pill ${filtreType === 'video' ? 'active' : ''}`}
                onClick={() => changerFiltre('video')}
              >
                <Film size={14} /> Vidéos
              </button>
              <button
                className={`filter-pill ${filtreType === 'audio' ? 'active' : ''}`}
                onClick={() => changerFiltre('audio')}
              >
                <Mic2 size={14} /> Audios
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={16} />
              <input 
                placeholder={t('videos.search_placeholder')} 
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
            <div className="view-toggle" style={{ display: 'flex', background: 'var(--bg-alt)', borderRadius: '8px', padding: '0.2rem' }}>
              <button
                className={`toggle-btn ${vueActive === 'grille' ? 'active' : ''}`}
                onClick={() => setVueActive('grille')}
                title="Vue Grille"
                style={{ padding: '0.4rem', border: 'none', background: vueActive === 'grille' ? 'var(--bg-card)' : 'transparent', borderRadius: '6px', boxShadow: vueActive === 'grille' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: vueActive === 'grille' ? 'var(--text-main)' : 'var(--text-muted)' }}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                className={`toggle-btn ${vueActive === 'liste' ? 'active' : ''}`}
                onClick={() => setVueActive('liste')}
                title="Vue Liste"
                style={{ padding: '0.4rem', border: 'none', background: vueActive === 'liste' ? 'var(--bg-card)' : 'transparent', borderRadius: '6px', boxShadow: vueActive === 'liste' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: vueActive === 'liste' ? 'var(--text-main)' : 'var(--text-muted)' }}
              >
                <List size={18} />
              </button>
            </div>
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
          <>
            {vueActive === 'liste' ? (
              <SermonTable
                predications={predications}
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
            ) : (
              <div className="sermon-grid" style={{ padding: '2rem' }}>
                {predications.map((item, i) => (
                  <div key={item.id} style={{ animation: `fadeRowIn 0.5s ease-out backwards`, animationDelay: `${(i % 10) * 0.05}s` }}>
                    <SermonCard sermon={item} />
                  </div>
                ))}
                {predications.length === 0 && (
                  <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b' }}>Aucun média trouvé.</p>
                )}
              </div>
            )}
          </>
        )}

        {!chargement && !erreur && predications.length > 0 && (
          <div className="datatable-footer-pagination">
            <span>{t('videos.pagination_info_1')} {(page - 1) * ELEMENTS_PAR_PAGE + 1} {t('videos.pagination_info_2')} {Math.min((page - 1) * ELEMENTS_PAR_PAGE + predications.length, total)} {t('videos.pagination_info_3')} {total}</span>
            <Pagination current={page} total={totalPages} onChange={changerPage} />
          </div>
        )}
      </div>

      {/* MODAL DE TÉLÉCHARGEMENT */}
      {telechargement && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '3rem 2.5rem', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeInDown 0.3s ease-out' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem' }}>{t('videos.modal_dl_title')}</h3>

            {telechargement.statut === 'confirmation' ? (
              <>
                <div style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
                  <Download size={54} style={{ margin: '0 auto', display: 'block' }} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem', margin: '0 0 2rem 0' }}>
                  {t('videos.modal_dl_confirm')} <strong>{telechargement.sermon.titre}</strong> ?
                  <br /><br />
                  <span style={{ fontSize: '0.9rem' }}>{t('videos.modal_dl_warning')}</span>
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button type="button" onClick={() => setTelechargement(null)} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', background: 'var(--bg-alt)', color: 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    {t('videos.modal_dl_cancel')}
                  </button>
                  <button type="button" className="btn-action btn-visionner" onClick={executerTelechargement} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                    {t('videos.modal_dl_confirm_btn')}
                  </button>
                </div>
              </>
            ) : telechargement.statut === 'chargement' ? (
              <>
                <Loader2 size={54} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem auto', display: 'block' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
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
