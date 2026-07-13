import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { Toast } from 'primereact/toast';
import { Calendar as PRCalendar } from 'primereact/calendar';
import {
  BarChart3, Download, Headphones, MessageSquare, Mic2, Paperclip,
  PencilLine, PlusCircle, Trash2, TrendingUp, Search, Calendar,
  ChevronLeft, ChevronRight, Eye, Film, CheckCircle2, AlertCircle, Youtube, User, Bell, Clock, Menu, X, FileAudio, Globe, Globe2, EyeOff, AlertTriangle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { SermonTable } from '../../sermons/components/SermonTable';
import { Badge } from '../../../components/ui/Badge';
import { IconButton } from '../../../components/ui/IconButton';
import { api, extraireListe } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ModerationCommentaires } from '../components/ModerationCommentaires';
import { GestionPiecesJointes } from '../components/GestionPiecesJointes';
import { GestionDocuments } from '../components/GestionDocuments';
import { VideoPlayer } from '../../sermons/components/VideoPlayer';
import { ModifierProfilPasteur } from '../components/ModifierProfilPasteur';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { DashboardTopbar } from '../components/DashboardTopbar';
import { DashboardOverviewTab } from '../components/DashboardOverviewTab';
import { AbonnementPasteur } from './AbonnementPasteur';
import './PastorDashboard.css';

const FORMULAIRE_VIDE = {
  titre: '',
  description: '',
  type_media: 'AUDIO',
  url_video: '',
  nom_predicateur: '',
  duree_secondes: 0,
  est_publie: true,
  date_publication: '',
  date_predication: '',
  serie: '',
  categories_ids: [],
};

function isoVersInputLocal(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (valeur) => String(valeur).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const FICHIERS_VIDES = {
  fichier_audio: null,
  fichier_video: null,
  image_couverture: null,
};

export function PastorDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [predications, setPredications] = useState([]);
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [erreurStats, setErreurStats] = useState('');
  const [erreurFormulaire, setErreurFormulaire] = useState('');
  const [messageFormulaire, setMessageFormulaire] = useState('');
  const [chargementInitial, setChargementInitial] = useState(true);
  const [soumission, setSoumission] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [souscription, setSouscription] = useState(null);
  
  // États indispensables au Datatable (Recherche, Filtre & Pagination)
  const [filtrePublication, setFiltrePublication] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [filtrePublicationInput, setFiltrePublicationInput] = useState('tous');
  const [rechercheInput, setRechercheInput] = useState('');
  const [pageActuelle, setPageActuelle] = useState(1);
  const elementsParPage = 5;

  const appliquerFiltres = () => {
    setFiltrePublication(filtrePublicationInput);
    setRecherche(rechercheInput);
  };

  const effacerFiltres = () => {
    setFiltrePublicationInput('tous');
    setRechercheInput('');
    setFiltrePublication('tous');
    setRecherche('');
  };

  const [enEdition, setEnEdition] = useState(null);
  const [videoASupprimer, setVideoASupprimer] = useState(null);
  const [videosASupprimer, setVideosASupprimer] = useState(false);
  const [commentairesOuverts, setCommentairesOuverts] = useState(null);
  const [piecesOuvertes, setPiecesOuvertes] = useState(null);
  const [videoEnLecture, setVideoEnLecture] = useState(null);
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [fichiers, setFichiers] = useState(FICHIERS_VIDES);
  const [resetFichiersKey, setResetFichiersKey] = useState(0);
  const [ongletActif, setOngletActif] = useState('catalogue');
  const [selectionnes, setSelectionnes] = useState([]);

  const toggleSelectionnerTout = () => {
    const tousIdsSurPage = predicationsPagination.map(p => p.id);
    if (tousIdsSurPage.length === 0) return;
    const tousSelectionnes = tousIdsSurPage.every(id => selectionnes.includes(id));
    if (tousSelectionnes) {
      setSelectionnes(prev => prev.filter(id => !tousIdsSurPage.includes(id)));
    } else {
      setSelectionnes(prev => [...new Set([...prev, ...tousIdsSurPage])]);
    }
  };

  const toggleSelectionnerUn = (id) => {
    setSelectionnes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toast = useRef(null);

  const demanderSuppressionSelection = () => {
    setVideosASupprimer(true);
  };

  const confirmerSuppressionSelection = async () => {
    try {
      const ids = selectionnes;
      await Promise.all(ids.map(id => api.delete(`/predications/${id}/`)));
      if (ids.includes(enEdition)) reinitialiserFormulaire();
      setSelectionnes(prev => prev.filter(x => !ids.includes(x)));
      toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.delete_multiple_success', { count: ids.length }), life: 5000 });
      await rechargerResume();
    } catch (error) {
      toast.current.show({ severity: 'error', summary: 'Erreur', detail: error.response?.data?.detail || t('dashboard.delete_error'), life: 5000 });
    } finally {
      setVideosASupprimer(false);
    }
  };

  const demanderSuppression = (predication) => {
    setVideoASupprimer(predication);
  };

  const confirmerSuppression = async () => {
    if (!videoASupprimer) return;
    try {
      const { id } = videoASupprimer;
      await api.delete(`/predications/${id}/`);
      if (enEdition === id) reinitialiserFormulaire();
      setSelectionnes(prev => prev.filter(x => x !== id));
      toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.delete_success'), life: 5000 });
      await rechargerResume();
    } catch (error) {
      toast.current.show({ severity: 'error', summary: 'Erreur', detail: error.response?.data?.detail || t('dashboard.delete_error'), life: 5000 });
    } finally {
      setVideoASupprimer(null);
    }
  };


  // Publication : 'chaine' (synchro complète) ou 'video' (ajout d'une vidéo à l'unité).
  const [notifications, setNotifications] = useState([]);
  const [afficherNotifications, setAfficherNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.lu).length;

  const { pasteur } = useAuth();
  const [modePublication, setModePublication] = useState('chaine');
  const [lienChaine, setLienChaine] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncErreur, setSyncErreur] = useState('');
  const [syncEnCours, setSyncEnCours] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/notifications/')
      .then(res => {
        if (active) setNotifications(extraireListe(res.data));
      })
      .catch(console.error);
    return () => { active = false; };
  }, []);

  async function marquerNotificationLue(notifId) {
    try {
      await api.post(`/notifications/${notifId}/marquer_lu/`);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n));
    } catch (err) {
      console.error(err);
    }
  }

  async function marquerToutesLues() {
    const nonLues = notifications.filter(n => !n.lu);
    if (nonLues.length === 0) return;
    try {
      await Promise.all(nonLues.map(n => api.post(`/notifications/${n.id}/marquer_lu/`)));
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    } catch (err) {
      console.error(err);
    }
  }

  function ouvrirModeVideo() {
    setErreurFormulaire('');
    setMessageFormulaire('');
    setFormulaire({ ...FORMULAIRE_VIDE, type_media: 'VIDEO' });
    setModePublication('video');
  }

  // Garantit que le mode « vidéo unique » publie bien un média de type VIDEO.
  useEffect(() => {
    if (!enEdition && modePublication === 'video' && formulaire.type_media !== 'VIDEO') {
      setFormulaire((actuel) => ({ ...actuel, type_media: 'VIDEO' }));
    }
  }, [modePublication, enEdition, formulaire.type_media]);

  useEffect(() => {
    if (pasteur?.lien_youtube) setLienChaine(pasteur.lien_youtube);
  }, [pasteur]);

  async function handleSynchronisation() {
    setSyncErreur('');
    setSyncMessage('');
    if (!lienChaine.trim()) {
      setSyncErreur(t('dashboard.youtube_link_required'));
      return;
    }
    setSyncEnCours(true);
    try {
      const { data } = await api.post('/pasteurs/synchroniser_youtube/', {
        lien_youtube: lienChaine.trim(),
      });
      setSyncMessage(data.detail || t('dashboard.import_started'));
    } catch (error) {
      const details = error.response?.data;
      setSyncErreur(details?.lien_youtube || details?.detail || t('dashboard.sync_error'));
    } finally {
      setSyncEnCours(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function chargerDonnees() {
      try {
        const [statsResponse, predicationsResponse, seriesResponse, categoriesResponse, souscriptionResponse] = await Promise.all([
          api.get('/pasteurs/statistiques_tableau_de_bord/'),
          api.get('/predications/?espace_pasteur=true'),
          api.get('/series/'),
          api.get('/categories/'),
          api.get('/souscriptions/courante/').catch(() => ({ data: null }))
        ]);

        if (active) {
          setStats(statsResponse.data);
          setPredications(extraireListe(predicationsResponse.data));
          setSeries(extraireListe(seriesResponse.data));
          setCategories(extraireListe(categoriesResponse.data));
          if (souscriptionResponse.data) {
            setSouscription(souscriptionResponse.data);
          }
        }
      } catch (error) {
        if (active) {
          setErreurStats(error.response?.data?.detail || t('dashboard.load_error'));
        }
      } finally {
        if (active) {
          setChargementInitial(false);
        }
      }
    }

    chargerDonnees();
    return () => { active = false; };
  }, []);

  // --- Moteur de recherche et filtrage du Datatable ---
  const predicationsTraitees = useMemo(() => {
    return predications
      .filter((p) => {
        if (filtrePublication === 'publiees') return p.est_publie;
        if (filtrePublication === 'brouillons') return !p.est_publie;
        return true;
      })
      .filter((p) => {
        const terme = recherche.toLowerCase();
        return (
          p.titre?.toLowerCase().includes(terme) ||
          p.description?.toLowerCase().includes(terme) ||
          p.type_media?.toLowerCase().includes(terme)
        );
      });
  }, [predications, filtrePublication, recherche]);

  // --- Segmentation pour la pagination ---
  const totalPages = Math.ceil(predicationsTraitees.length / elementsParPage) || 1;
  const predicationsPagination = useMemo(() => {
    const debut = (pageActuelle - 1) * elementsParPage;
    return predicationsTraitees.slice(debut, debut + elementsParPage);
  }, [predicationsTraitees, pageActuelle]);

  // Réinitialiser automatiquement l'index de page en cas de filtrage
  useEffect(() => {
    setPageActuelle(1);
  }, [recherche, filtrePublication]);

  function mettreAJourChamp(cle, valeur) {
    setFormulaire((actuel) => ({ ...actuel, [cle]: valeur }));
  }

  function mettreAJourFichier(cle, fichier) {
    setFichiers((actuel) => ({ ...actuel, [cle]: fichier }));
  }

  function basculerCategorie(idCategorie) {
    setFormulaire((actuel) => {
      const presente = actuel.categories_ids.includes(idCategorie);
      return {
        ...actuel,
        categories_ids: presente
          ? actuel.categories_ids.filter((id) => id !== idCategorie)
          : [...actuel.categories_ids, idCategorie],
      };
    });
  }

  function reinitialiserFormulaire() {
    setEnEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
    setFichiers(FICHIERS_VIDES);
    setResetFichiersKey((cle) => cle + 1);
    setOngletActif('catalogue');
  }

  function commencerEdition(predication) {
    setEnEdition(predication.id);
    setErreurFormulaire('');
    setMessageFormulaire('');
    setFormulaire({
      titre: predication.titre,
      description: predication.description || '',
      type_media: predication.type_media,
      url_video: predication.url_video || '',
      nom_predicateur: predication.nom_predicateur || '',
      duree_secondes: predication.duree_secondes,
      est_publie: predication.est_publie,
      date_publication: isoVersInputLocal(predication.date_publication),
      date_predication: predication.date_predication || '',
      serie: predication.serie?.id || '',
      categories_ids: (predication.categories || []).map((categorie) => categorie.id),
    });
    setFichiers(FICHIERS_VIDES);
    setResetFichiersKey((cle) => cle + 1);
    setOngletActif('editer');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function rechargerResume() {
    const [statsResponse, predicationsResponse] = await Promise.all([
      api.get('/pasteurs/statistiques_tableau_de_bord/'),
      api.get('/predications/?espace_pasteur=true'),
    ]);
    setStats(statsResponse.data);
    setPredications(extraireListe(predicationsResponse.data));
  }

  function construireCorps() {
    const aDesFichiers = Boolean(fichiers.fichier_audio || fichiers.fichier_video || fichiers.image_couverture);

    if (!aDesFichiers) {
      const corpsJson = {
        ...formulaire,
        duree_secondes: Number(formulaire.duree_secondes) || 0,
        serie: formulaire.serie || null,
        date_publication: formulaire.date_publication || null,
        date_predication: formulaire.date_predication || null,
        nom_predicateur: formulaire.nom_predicateur || null,
      };
      if (!corpsJson.url_video) delete corpsJson.url_video;
      return corpsJson;
    }

    const corps = new FormData();
    corps.append('titre', formulaire.titre);
    corps.append('description', formulaire.description || '');
    corps.append('type_media', formulaire.type_media);
    if (formulaire.url_video) corps.append('url_video', formulaire.url_video);
    if (formulaire.nom_predicateur) corps.append('nom_predicateur', formulaire.nom_predicateur);
    corps.append('duree_secondes', Number(formulaire.duree_secondes) || 0);
    corps.append('est_publie', formulaire.est_publie ? 'true' : 'false');
    if (formulaire.date_publication) corps.append('date_publication', formulaire.date_publication);
    if (formulaire.date_predication) corps.append('date_predication', formulaire.date_predication);
    if (formulaire.serie) corps.append('serie', formulaire.serie);
    formulaire.categories_ids.forEach((id) => corps.append('categories_ids', id));
    
    if (fichiers.fichier_audio) corps.append('fichier_audio', fichiers.fichier_audio);
    if (fichiers.fichier_video) corps.append('fichier_video', fichiers.fichier_video);
    if (fichiers.image_couverture) corps.append('image_couverture', fichiers.image_couverture);
    return corps;
  }

  function extraireErreurFormulaire(error) {
    const details = error.response?.data;
    if (!details) return t('dashboard.save_error');
    if (typeof details === 'string') return details;
    if (details.detail) return details.detail;
    const premiereCle = Object.keys(details)[0];
    const premiereValeur = details[premiereCle];
    const message = Array.isArray(premiereValeur) ? premiereValeur[0] : premiereValeur;
    return premiereCle ? `${premiereCle}: ${message}` : t('dashboard.save_error');
  }

  async function handleSoumission(event) {
    event.preventDefault();
    setErreurFormulaire('');
    setMessageFormulaire('');
    setSoumission(true);

    try {
      const corps = construireCorps();
      if (enEdition) {
        await api.patch(`/predications/${enEdition}/`, corps);
        toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.update_success', 'Modification enregistrée avec succès.'), life: 4000 });
      } else {
        await api.post('/predications/', corps);
        toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.create_success', 'Vidéo ajoutée avec succès.'), life: 4000 });
      }
      reinitialiserFormulaire();
      await rechargerResume();
    } catch (error) {
      setErreurFormulaire(extraireErreurFormulaire(error));
    } finally {
      setSoumission(false);
    }
  }



  if (erreurStats) {
    return (
      <div className="dashboard-intro" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <AlertCircle size={40} color="#dc2626" style={{ marginBottom: '1rem' }} />
        <h2>{t('dashboard.error_title')}</h2>
        <p style={{ color: '#b91c1c' }}>{erreurStats}</p>
      </div>
    );
  }

  if (chargementInitial || !stats) {
    return (
      <div className="dashboard-intro" style={{ padding: '5rem 2.5rem', textAlign: 'center' }}>
        <div className="sidebar-logo-icon" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{t('dashboard.loading')}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Toast ref={toast} />
      
      {/* Overlay mobile */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />

      {/* Barre Latérale */}
      <DashboardSidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        ongletActif={ongletActif}
        setOngletActif={setOngletActif}
        enEdition={enEdition}
      />

      {/* Zone d'affichage Principale */}
      <main className="dashboard-content">
        <DashboardTopbar 
          pasteur={pasteur}
          setIsSidebarOpen={setIsSidebarOpen}
          unreadCount={unreadCount}
          afficherNotifications={afficherNotifications}
          setAfficherNotifications={setAfficherNotifications}
          notifications={notifications}
          marquerToutesLues={marquerToutesLues}
          marquerNotificationLue={marquerNotificationLue}
        />
        
        {pasteur && !pasteur.est_valide && (
          <div style={{ margin: '0 2.5rem 1.5rem', padding: '1.25rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderLeft: '4px solid #004a94', borderRadius: '8px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
              {t('dashboard.account_pending')}
            </p>
          </div>
        )}

        {souscription && !souscription.est_active && (
          <div style={{ margin: '0 2.5rem 1.5rem', padding: '1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626', borderRadius: '8px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} />
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
              Votre abonnement a expiré. Vous ne pouvez plus publier de nouvelles vidéos ou documents. <a href="#" onClick={(e) => { e.preventDefault(); setOngletActif('abonnement'); }} style={{ color: '#dc2626', textDecoration: 'underline', fontWeight: 600 }}>Renouveler maintenant</a>.
            </p>
          </div>
        )}

        {/* Onglet : MON PROFIL */}
        {ongletActif === 'profil' && <ModifierProfilPasteur />}

        {ongletActif === 'commentaires' && (
          <div className="dashboard-section card fade-in">
            <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} />
              {t('dashboard.sidebar_comments')}
            </h2>
            <ModerationCommentaires />
          </div>
        )}

        {/* Onglet : DOCUMENTS */}
        {ongletActif === 'documents' && <GestionDocuments />}

        {/* Onglet : ABONNEMENT */}
        {ongletActif === 'abonnement' && <AbonnementPasteur />}

        {/* Onglet 1 : VUE D'ENSEMBLE */}
        {ongletActif === 'apercu' ? <DashboardOverviewTab stats={stats} /> : null}

        {/* Onglet 2 : CATALOGUE VIA DATATABLE */}
        {ongletActif === 'catalogue' ? (
          <div className="dashboard-tab-content">
            <div className="dashboard-title-area" style={{ marginBottom: '1.5rem' }}>
              <h1>{t('dashboard.videos_title')}</h1>
              <p>{t('dashboard.videos_subtitle')}</p>
            </div>

            <div className="dashboard-section" style={{ marginBottom: '1.5rem' }}>
              <div className="filter-card">
                <div className="filter-left">
                  <span className="filter-label">{t('dashboard.filters')}</span>
                </div>
                <div className="filter-controls">
                  <select className="filter-select" value={filtrePublicationInput} onChange={(e) => setFiltrePublicationInput(e.target.value)}>
                    <option value="tous">{t('dashboard.filter_all')}</option>
                    <option value="publiees">{t('dashboard.filter_published')}</option>
                    <option value="brouillons">{t('dashboard.filter_drafts')}</option>
                  </select>
                  <button className="btn btn-dark" type="button" onClick={appliquerFiltres}>{t('dashboard.apply')}</button>
                  <button className="btn btn-outline" type="button" onClick={effacerFiltres}>{t('dashboard.clear')}</button>
                </div>
              </div>
            </div>

            <div className="dashboard-section">
              <div className="table-actions-top">
                <div className="left-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button className="btn btn-primary" type="button" onClick={() => { ouvrirModeVideo(); setOngletActif('publier'); }} disabled={souscription && !souscription.est_active}>
                    {t('dashboard.add_video')}
                  </button>
                  <button className="btn" type="button" disabled={souscription && !souscription.est_active} style={{ backgroundColor: (souscription && !souscription.est_active) ? '#ccc' : '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center' }} onClick={() => {
                    setErreurFormulaire('');
                    setMessageFormulaire('');
                    setModePublication('chaine');
                    setOngletActif('publier');
                  }}>
                    <Youtube size={16} style={{ marginRight: '6px' }} />
                    {t('dashboard.sync_channel') || "Ajout de chaîne"}
                  </button>
                </div>
                <div>
                  {selectionnes.length > 0 && (
                    <button 
                      className="btn" 
                      type="button" 
                      onClick={demanderSuppressionSelection}
                      style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}
                    >
                      {t('dashboard.delete_selection', { count: selectionnes.length })}
                    </button>
                  )}
                </div>
              </div>

              <div className="table-card-header">
                <div className="table-title">
                  <h3>{t('dashboard.videos_title')}</h3>
                  <span>{t('dashboard.videos_loaded', { count: predicationsTraitees.length })}</span>
                </div>
                <div className="search-input-wrapper">
                  <Search className="search-icon" size={16} />
                  <input 
                    placeholder={t('dashboard.search_placeholder')} 
                    value={rechercheInput}
                    onChange={(e) => setRechercheInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        appliquerFiltres();
                      }
                    }}
                  />
                </div>
              </div>

              <SermonTable
                predications={predicationsPagination}
                showStatus={true}
                showCheckbox={true}
                selectionnes={selectionnes}
                onToggleAll={toggleSelectionnerTout}
                onToggleOne={toggleSelectionnerUn}
                renderActions={(predication) => (
                  <>
                    {predication.type_media === 'VIDEO' && (predication.video_youtube || predication.url_video) && (
                      <IconButton
                        icon={Eye}
                        onClick={() => setVideoEnLecture(predication.video_youtube || predication.url_video)}
                        title={t('dashboard.action_view')}
                        colorVariant="primary"
                      />
                    )}
                    <IconButton
                      icon={PencilLine}
                      onClick={() => commencerEdition(predication)}
                      title={t('dashboard.action_edit')}
                      colorVariant="default"
                    />
                    <IconButton
                      icon={Trash2}
                      onClick={() => demanderSuppression(predication)}
                      title={t('dashboard.action_delete')}
                      colorVariant="danger"
                    />
                  </>
                )}
              />

              {/* Contrôles de Pagination du Datatable */}
              <div className="datatable-footer-pagination" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'var(--pd-text-muted)', fontSize: '0.85rem' }}>
                <span>
                  {t('dashboard.pagination_info', { current: predicationsPagination.length, total: predicationsTraitees.length })}
                </span>
                <div className="pagination-controls" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    disabled={pageActuelle === 1} 
                    onClick={() => setPageActuelle(p => p - 1)}
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.5rem' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="page-number">{t('dashboard.pagination_page', { current: pageActuelle, total: totalPages })}</span>
                  <button 
                    disabled={pageActuelle === totalPages} 
                    onClick={() => setPageActuelle(p => p + 1)}
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.5rem' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Panneaux de sous-gestionnaires injectés dynamiquement */}
              {commentairesOuverts && (
                <ModerationCommentaires predicationId={commentairesOuverts} onClose={() => setCommentairesOuverts(null)} />
              )}

              {piecesOuvertes && (
                <GestionPiecesJointes predicationId={piecesOuvertes} onClose={() => setPiecesOuvertes(null)} />
              )}

              {videoEnLecture && (
                <VideoPlayer src={videoEnLecture} onClose={() => setVideoEnLecture(null)} />
              )}


            </div>
          </div>
        ) : null}

        {/* Onglet 3 : SYNCHRONISATION CHAÎNE, AJOUT ou ÉDITION DES MÉTADONNÉES */}
        {ongletActif === 'publier' || ongletActif === 'editer' ? (
          <div className="dashboard-tab-content">
            {pasteur && !pasteur.est_valide ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Clock size={48} color="#94a3b8" style={{ margin: '0 auto 1.5rem auto', display: 'block' }} />
                <h2 style={{ fontSize: '1.25rem', color: '#334155', marginBottom: '0.75rem' }}>{t('dashboard.pending_account_title')}</h2>
                <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
                  {t('dashboard.pending_account_desc')}
                </p>
              </div>
            ) : (
              <>
            <div className="dashboard-title-area" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1>{ongletActif === 'editer' ? t('dashboard.edit_video_title') : t('dashboard.add_media_title')}</h1>
                <p>
                  {ongletActif === 'editer' 
                    ? t('dashboard.edit_video_desc') 
                    : t('dashboard.add_media_desc')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {ongletActif === 'editer' ? (
                  <button type="button" className="btn btn-outline" onClick={reinitialiserFormulaire}>
                    {t('dashboard.cancel_edit')}
                  </button>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className={`btn ${modePublication === 'chaine' ? 'btn-primary' : 'btn-outline'}`} 
                      onClick={() => {
                        setErreurFormulaire('');
                        setMessageFormulaire('');
                        setModePublication('chaine');
                      }}
                    >
                      {t('dashboard.sync_channel')}
                    </button>
                    <button 
                      type="button" 
                      className={`btn ${modePublication === 'video' ? 'btn-primary' : 'btn-outline'}`} 
                      onClick={ouvrirModeVideo}
                    >
                      {t('dashboard.add_a_video')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {ongletActif === 'editer' || (ongletActif === 'publier' && modePublication === 'video') ? (
              <Card>
              <form className="dashboard-form" onSubmit={handleSoumission}>
                <div className="dashboard-grid-2">
                  <label className="dashboard-field">
                    <span>{t('dashboard.form_title_label')}</span>
                    <input
                      value={formulaire.titre}
                      onChange={(e) => mettreAJourChamp('titre', e.target.value)}
                      placeholder={t('dashboard.form_title_placeholder')}
                      required
                    />
                  </label>

                  <label className="dashboard-field">
                    <span>{t('dashboard.form_format_label')}</span>
                    <select value={formulaire.type_media} onChange={(e) => mettreAJourChamp('type_media', e.target.value)}>
                      <option value="AUDIO">{t('dashboard.format_audio')}</option>
                      <option value="VIDEO">{t('dashboard.format_video')}</option>
                      <option value="BOTH">{t('dashboard.format_mixed')}</option>
                    </select>
                  </label>
                </div>

                <label className="dashboard-field">
                  <span>{t('dashboard.form_desc_label')}</span>
                  <textarea
                    value={formulaire.description}
                    onChange={(e) => mettreAJourChamp('description', e.target.value)}
                    placeholder={t('dashboard.form_desc_placeholder')}
                  />
                </label>

                {/* Source du média — adaptée au format choisi (audio / vidéo YouTube ou fichier) */}
                {(formulaire.type_media === 'AUDIO' || formulaire.type_media === 'BOTH') ? (
                  <label className="dashboard-field">
                    <span>{t('dashboard.form_audio_label')} <small className="champ-aide">{t('dashboard.downloadable')}</small></span>
                    <input
                      key={`audio-${resetFichiersKey}`}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => mettreAJourFichier('fichier_audio', e.target.files?.[0] || null)}
                    />
                  </label>
                ) : null}

                {(formulaire.type_media === 'VIDEO' || formulaire.type_media === 'BOTH') ? (
                  <label className="dashboard-field">
                    <span>{t('dashboard.form_youtube_label')}</span>
                    <input
                      value={formulaire.url_video || ''}
                      onChange={(e) => mettreAJourChamp('url_video', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <small className="champ-aide">
                      {t('dashboard.form_youtube_help')}
                    </small>
                  </label>
                ) : null}

                <div className="dashboard-grid-2">
                  <label className="dashboard-field">
                    <span>{t('dashboard.form_preacher_label')}</span>
                    <input
                      value={formulaire.nom_predicateur || ''}
                      onChange={(e) => mettreAJourChamp('nom_predicateur', e.target.value)}
                      placeholder={t('dashboard.form_preacher_placeholder')}
                    />
                    <small className="champ-aide">
                      {t('dashboard.form_preacher_help')}
                    </small>
                  </label>

                  <label className="dashboard-field">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13}/> {t('dashboard.form_date_label')}</span>
                    <PRCalendar
                      value={formulaire.date_predication ? new Date(formulaire.date_predication) : null}
                      onChange={(e) => {
                        if (e.value) {
                          const d = e.value;
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          mettreAJourChamp('date_predication', `${year}-${month}-${day}`);
                        } else {
                          mettreAJourChamp('date_predication', '');
                        }
                      }}
                      dateFormat="dd/mm/yy"
                      showIcon
                      style={{ width: '100%' }}
                      inputStyle={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', border: '1px solid var(--pd-border)', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}
                    />
                    <small className="champ-aide">
                      {t('dashboard.form_date_help')}
                    </small>
                  </label>
                </div>

                <div className="dashboard-field">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13}/> {t('dashboard.form_duration_label')}</span>
                  <input
                    type="number"
                    min="0"
                    value={formulaire.duree_secondes || ''}
                    onChange={(e) => mettreAJourChamp('duree_secondes', e.target.value)}
                    placeholder={t('dashboard.form_duration_placeholder')}
                    style={{ maxWidth: '300px' }}
                  />
                  <small className="champ-aide">
                    {t('dashboard.form_duration_help')}
                  </small>
                </div>


                {(formulaire.type_media === 'VIDEO' || formulaire.type_media === 'BOTH') && formulaire.url_video ? (
                  <div className="info-banner-premium">
                    <CheckCircle2 size={15} />
                    <span>{t('dashboard.youtube_info')}</span>
                  </div>
                ) : null}

                <div className="dashboard-field">
                  <span>{t('dashboard.form_categories_label')}</span>
                  <div className="checkbox-cloud">
                    {categories.length ? categories.map((cat) => (
                      <label key={cat.id} className={`cloud-checkbox-label ${formulaire.categories_ids.includes(cat.id) ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={formulaire.categories_ids.includes(cat.id)}
                          onChange={() => basculerCategorie(cat.id)}
                        />
                        {cat.nom}
                      </label>
                    )) : <span style={{ color: 'var(--pd-muted)' }}>{t('dashboard.no_categories')}</span>}
                  </div>
                </div>

                <div className="dashboard-grid-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                  <label className="dashboard-checkbox">
                    <input
                      type="checkbox"
                      checked={formulaire.est_publie}
                      onChange={(e) => mettreAJourChamp('est_publie', e.target.checked)}
                    />
                    {formulaire.est_publie ? t('dashboard.is_published_true') : t('dashboard.is_published_false')}
                  </label>

                  <label className="dashboard-field">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13}/> {t('dashboard.form_schedule_label')}</span>
                    <PRCalendar
                      value={formulaire.date_publication ? new Date(formulaire.date_publication) : null}
                      onChange={(e) => {
                        if (e.value) {
                          const d = e.value;
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          const hours = String(d.getHours()).padStart(2, '0');
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          mettreAJourChamp('date_publication', `${year}-${month}-${day}T${hours}:${minutes}`);
                        } else {
                          mettreAJourChamp('date_publication', '');
                        }
                      }}
                      showTime
                      hourFormat="24"
                      dateFormat="dd/mm/yy"
                      showIcon
                      style={{ width: '100%' }}
                      inputStyle={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', border: '1px solid var(--pd-border)', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}
                    />
                  </label>
                </div>

                {formulaire.est_publie && formulaire.date_publication ? (
                  <div className="info-banner-premium">
                    <CheckCircle2 size={15} />
                    <span>{t('dashboard.schedule_info')}</span>
                  </div>
                ) : null}

                {erreurFormulaire ? <p className="dashboard-error">{erreurFormulaire}</p> : null}
                {messageFormulaire ? <p className="dashboard-status">{messageFormulaire}</p> : null}

                <div className="dashboard-inline" style={{ marginTop: '1rem' }}>
                  <button className="btn btn-dark" type="submit" disabled={soumission}>
                    {soumission ? t('dashboard.saving') : t('dashboard.save_changes')}
                  </button>
                </div>
              </form>

              {ongletActif === 'editer' ? (
                <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 16px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,74,148,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004a94' }}>
                      <Paperclip size={18} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{t('dashboard.pdf_attachments')}</h3>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.25rem', marginLeft: '3rem' }}>
                    {t('dashboard.pdf_help')}
                  </p>
                  <GestionPiecesJointes predicationId={enEdition} />
                </div>
              ) : null}
              </Card>
            ) : (
            <Card>
              <div className="dashboard-form">
                <label className="dashboard-field">
                  <span>{t('dashboard.sync_youtube_label')}</span>
                  <input
                    value={lienChaine}
                    onChange={(e) => setLienChaine(e.target.value)}
                    placeholder="https://www.youtube.com/@votrechaine"
                  />
                  <small className="champ-aide">
                    {t('dashboard.sync_youtube_help')}
                  </small>
                </label>

                <div className="info-banner-premium">
                  <CheckCircle2 size={15} />
                  <span>
                    {t('dashboard.sync_auto_info')}
                  </span>
                </div>

                {syncErreur ? <p className="dashboard-error">{syncErreur}</p> : null}
                {syncMessage ? <p className="dashboard-status">{syncMessage}</p> : null}

                <div className="dashboard-inline" style={{ marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleSynchronisation}
                    disabled={syncEnCours}
                  >
                    {syncEnCours ? t('dashboard.starting_import') : t('dashboard.start_sync')}
                  </button>
                </div>
              </div>
            </Card>
            )}
              </>
            )}
          </div>
        ) : null}
      </main>

      <ConfirmModal
        isOpen={!!videoASupprimer}
        onClose={() => setVideoASupprimer(null)}
        onConfirm={confirmerSuppression}
        title={t('dashboard.modal_delete_title') || 'Confirmation de suppression'}
        message={`${t('dashboard.modal_delete_desc')} "${videoASupprimer?.titre}" ?\n\n${t('dashboard.modal_delete_warning')}`}
        confirmText={t('dashboard.confirm') || 'Confirmer'}
        variant="danger"
        icon={AlertTriangle}
      />

      <ConfirmModal
        isOpen={videosASupprimer}
        onClose={() => setVideosASupprimer(false)}
        onConfirm={confirmerSuppressionSelection}
        title={t('dashboard.modal_delete_multiple_title') || 'Confirmation de suppression multiple'}
        message={`${t('dashboard.modal_delete_multiple_desc', { count: selectionnes.length })}\n\n${t('dashboard.modal_delete_warning')}`}
        confirmText={t('dashboard.confirm') || 'Confirmer'}
        variant="danger"
        icon={AlertTriangle}
      />
    </div>
  );
}