import { useEffect, useState } from 'react';
import { ShieldCheck, Flag, BadgeCheck, BarChart3, CheckCircle, XCircle, Trash2, Clock, AlertTriangle, Users, Video, Eye, Download, MessageSquare, Heart, Bell, Megaphone, Edit, MonitorPlay, Settings } from 'lucide-react';
import { api, extraireListe } from '../../../services/api';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/Button';
import { CreatePasteurModal } from '../components/CreatePasteurModal';
import { PublishMediaModal } from '../../dashboard/components/PublishMediaModal';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { AnnonceModal } from '../components/AnnonceModal';
import CarrouselModal from '../components/CarrouselModal';
import { GestionConfiguration } from '../components/GestionConfiguration';
import Pagination from '../../../components/Pagination';
import './Administration.css';
import '../../dashboard/pages/PastorDashboard.css';

export function Administration() {
  const { t } = useTranslation();

  const LIBELLES_STATUT = {
    NOUVEAU: t('admin.status_new'),
    EN_COURS: t('admin.status_progress'),
    TRAITE: t('admin.status_resolved'),
    REJETE: t('admin.status_rejected'),
  };

  const [stats, setStats] = useState(null);
  const [pasteurs, setPasteurs] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [carrouselMedias, setCarrouselMedias] = useState([]);
  const [predications, setPredications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [actionEnCours, setActionEnCours] = useState(null);
  const [pasteurExamine, setPasteurExamine] = useState(null);
  const [recherchePasteur, setRecherchePasteur] = useState('');
  const [filtreStatutPasteur, setFiltreStatutPasteur] = useState('tous');
  const [pagePasteurs, setPagePasteurs] = useState(1);
  const [pageSignalements, setPageSignalements] = useState(1);
  const [pageAnnonces, setPageAnnonces] = useState(1);
  const [pageCarrousel, setPageCarrousel] = useState(1);
  const [pagePredications, setPagePredications] = useState(1);
  const ELEMENTS_PAR_PAGE = 5;
  const [ongletActif, setOngletActif] = useState('apercu');
  
  // Existing generic confirm modal state
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    titre: '',
    message: '',
    texteConfirmer: '',
    variante: 'primary',
    icone: null,
    action: () => {}
  });

  // New state for Create Pasteur modal
  const [showCreatePasteur, setShowCreatePasteur] = useState(false);
  // New state for Publish Media modal
  const [showPublishMedia, setShowPublishMedia] = useState(false);
  const [selectedPasteurId, setSelectedPasteurId] = useState(null);

  // Annonces Modal state
  const [showAnnonceModal, setShowAnnonceModal] = useState(false);
  const [annonceSelectionnee, setAnnonceSelectionnee] = useState(null);

  // Carrousel Modal state
  const [showCarrouselModal, setShowCarrouselModal] = useState(false);
  const [carrouselSelectionne, setCarrouselSelectionne] = useState(null);

  const ICONES_STATUT = {
    NOUVEAU: AlertTriangle,
    EN_COURS: Clock,
    TRAITE: CheckCircle,
    REJETE: XCircle,
  };

  async function charger() {
    setChargement(true);
    try {
      const [statsRes, pasteursRes, signalementsRes, annoncesRes, carrouselRes, predicationsRes] = await Promise.all([
        api.get('/admin/statistiques/'),
        api.get('/pasteurs/'),
        api.get('/signalements/'),
        api.get('/annonces/'),
        api.get('/carrousel/'),
        api.get('/predications/?espace_admin=true')
      ]);
      setStats(statsRes.data);
      setPasteurs(extraireListe(pasteursRes.data));
      setSignalements(extraireListe(signalementsRes.data));
      setAnnonces(extraireListe(annoncesRes.data));
      setCarrouselMedias(extraireListe(carrouselRes.data));
      setPredications(extraireListe(predicationsRes.data));
      setErreur('');
    } catch (error) {
      setErreur(error.response?.data?.detail || t('admin.load_error'));
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPagePasteurs(1);
  }, [recherchePasteur, filtreStatutPasteur]);

  const demanderConfirmation = (titre, message, texteConfirmer, variante, icone, action) => {
    setModalConfig({ titre, message, texteConfirmer, variante, icone, action });
    setModalOuvert(true);
  };

  useEffect(() => {
    if (messageSucces) {
      const timer = setTimeout(() => setMessageSucces(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [messageSucces]);

  async function validerPasteur(pasteur) {
    setActionEnCours(`valider-${pasteur.id}`);
    try {
      await api.post(`/pasteurs/${pasteur.id}/valider/`, { est_valide: true });
      setPasteurs((actuels) => actuels.map(p => p.id === pasteur.id ? { ...p, est_valide: true, est_rejete: false } : p));
      setMessageSucces(t('admin.success_validate', 'Le pasteur a été validé.'));
      setErreur('');
    } catch {
      setErreur(t('admin.validate_error'));
      setMessageSucces('');
    } finally {
      setActionEnCours(null);
    }
  }

  async function rejeterPasteur(pasteur) {
    setActionEnCours(`rejeter-${pasteur.id}`);
    try {
      await api.post(`/pasteurs/${pasteur.id}/valider/`, { est_valide: false });
      setPasteurs((actuels) => actuels.map(p => p.id === pasteur.id ? { ...p, est_valide: false, est_rejete: true } : p));
      setMessageSucces(t('admin.success_reject', 'Le pasteur a été rejeté.'));
      setErreur('');
    } catch {
      setErreur(t('admin.reject_error'));
      setMessageSucces('');
    } finally {
      setActionEnCours(null);
    }
  }

  async function supprimerPasteur(pasteur) {
    setActionEnCours(`supprimer-${pasteur.id}`);
    try {
      await api.delete(`/pasteurs/${pasteur.id}/`);
      setPasteurs((actuels) => actuels.filter(p => p.id !== pasteur.id));
      setMessageSucces(t('admin.success_delete', 'Le compte pasteur a été supprimé.'));
      setErreur('');
    } catch {
      setErreur(t('admin.delete_error', 'Erreur lors de la suppression.'));
      setMessageSucces('');
    } finally {
      setActionEnCours(null);
    }
  }

  async function changerStatut(signalement, statut) {
    try {
      const response = await api.post(`/signalements/${signalement.id}/changer_statut/`, { statut });
      setSignalements((actuels) =>
        actuels.map((item) => (item.id === signalement.id ? { ...item, statut: response.data.statut } : item))
      );
      setMessageSucces(t('admin.success_status', 'Le statut a été mis à jour avec succès.'));
      setErreur('');
    } catch {
      setErreur(t('admin.status_change_error'));
      setMessageSucces('');
    }
  }

  async function supprimerAnnonce(annonce) {
    try {
      await api.delete(`/annonces/${annonce.id}/`);
      setAnnonces((actuels) => actuels.filter(a => a.id !== annonce.id));
      setMessageSucces('L\'annonce a été supprimée avec succès.');
      setErreur('');
    } catch {
      setErreur('Erreur lors de la suppression de l\'annonce.');
      setMessageSucces('');
    }
  }

  async function supprimerCarrousel(media) {
    try {
      await api.delete(`/carrousel/${media.id}/`);
      setCarrouselMedias((actuels) => actuels.filter(m => m.id !== media.id));
      setMessageSucces('Le média a été supprimé avec succès.');
      setErreur('');
    } catch {
      setErreur('Erreur lors de la suppression du média.');
      setMessageSucces('');
    }
  }

  async function sauvegarderCarrousel(formData) {
    try {
      if (carrouselSelectionne) {
        await api.put(`/carrousel/${carrouselSelectionne.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessageSucces("Média mis à jour avec succès.");
      } else {
        await api.post('/carrousel/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessageSucces("Média ajouté au carrousel.");
      }
      setShowCarrouselModal(false);
      setCarrouselSelectionne(null);
      charger();
    } catch (error) {
      console.error(error);
      setErreur("Erreur lors de l'enregistrement du média.");
    }
  }

  async function basculerALaUne(predication) {
    try {
      const nouveauStatut = !predication.est_a_la_une;
      await api.patch(`/predications/${predication.id}/`, { est_a_la_une: nouveauStatut });
      setPredications((actuels) => actuels.map(p => p.id === predication.id ? { ...p, est_a_la_une: nouveauStatut } : p));
      setMessageSucces(nouveauStatut ? "La vidéo a été ajoutée à la une." : "La vidéo a été retirée de la une.");
      setErreur('');
    } catch {
      setErreur("Erreur lors de la mise à jour de la vidéo.");
      setMessageSucces('');
    }
  }

  const pasteursFiltres = pasteurs.filter(p => {
    const correspondRecherche = (p.nom_affichage || '').toLowerCase().includes(recherchePasteur.toLowerCase()) ||
                                (p.nom_eglise || '').toLowerCase().includes(recherchePasteur.toLowerCase()) ||
                                (p.email || '').toLowerCase().includes(recherchePasteur.toLowerCase());
    
    if (filtreStatutPasteur === 'valides') return correspondRecherche && p.est_valide === true;
    if (filtreStatutPasteur === 'en_attente') return correspondRecherche && p.est_valide === false && !p.est_rejete;
    if (filtreStatutPasteur === 'rejetes') return correspondRecherche && p.est_valide === false && p.est_rejete === true;
    return correspondRecherche;
  });

  const indexDebutPasteurs = (pagePasteurs - 1) * ELEMENTS_PAR_PAGE;
  const pasteursAffiches = pasteursFiltres.slice(indexDebutPasteurs, indexDebutPasteurs + ELEMENTS_PAR_PAGE);
  const totalPagesPasteurs = Math.ceil(pasteursFiltres.length / ELEMENTS_PAR_PAGE);

  const indexDebutSignalements = (pageSignalements - 1) * ELEMENTS_PAR_PAGE;
  const signalementsAffiches = signalements.slice(indexDebutSignalements, indexDebutSignalements + ELEMENTS_PAR_PAGE);
  const totalPagesSignalements = Math.ceil(signalements.length / ELEMENTS_PAR_PAGE);

  const indexDebutAnnonces = (pageAnnonces - 1) * ELEMENTS_PAR_PAGE;
  const annoncesAffiches = annonces.slice(indexDebutAnnonces, indexDebutAnnonces + ELEMENTS_PAR_PAGE);
  const totalPagesAnnonces = Math.ceil(annonces.length / ELEMENTS_PAR_PAGE);

  const indexDebutCarrousel = (pageCarrousel - 1) * ELEMENTS_PAR_PAGE;
  const carrouselAffiches = carrouselMedias.slice(indexDebutCarrousel, indexDebutCarrousel + ELEMENTS_PAR_PAGE);
  const totalPagesCarrousel = Math.ceil(carrouselMedias.length / ELEMENTS_PAR_PAGE);

  const indexDebutPredications = (pagePredications - 1) * ELEMENTS_PAR_PAGE;
  const predicationsAffiches = predications.slice(indexDebutPredications, indexDebutPredications + ELEMENTS_PAR_PAGE);
  const totalPagesPredications = Math.ceil(predications.length / ELEMENTS_PAR_PAGE);

  if (chargement) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <p>{t('admin.loading')}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ padding: 0 }}>
      {/* Barre Latérale */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>{t('admin.title')}</h2>
        </div>
        <nav className="sidebar-menu">
          <button type="button" className={`menu-item ${ongletActif === 'apercu' ? 'active' : ''}`} onClick={() => setOngletActif('apercu')}>
            <BarChart3 size={18} />
            <span>Tableau de bord</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'pasteurs' ? 'active' : ''}`} onClick={() => setOngletActif('pasteurs')}>
            <Users size={18} />
            <span>Demandes Pasteurs</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'signalements' ? 'active' : ''}`} onClick={() => setOngletActif('signalements')}>
            <ShieldCheck size={18} />
            <span>Modération</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'annonces' ? 'active' : ''}`} onClick={() => setOngletActif('annonces')}>
            <Megaphone size={18} />
            <span>Annonces</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'videos' ? 'active' : ''}`} onClick={() => setOngletActif('videos')}>
            <Video size={18} />
            <span>Vidéos (À la une)</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'carrousel' ? 'active' : ''}`} onClick={() => setOngletActif('carrousel')}>
            <MonitorPlay size={18} />
            <span>Carrousel</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'configuration' ? 'active' : ''}`} onClick={() => setOngletActif('configuration')}>
            <Settings size={18} />
            <span>Paramètres globaux</span>
          </button>
        </nav>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-topbar">
          <div className="dashboard-title-area">
            <h1>{t('admin.subtitle')}</h1>
            <p>Gérez le contenu et les utilisateurs</p>
          </div>
        </div>
        {erreur ? <div className="admin-alert-error">{erreur}</div> : null}
        {messageSucces ? <div className="admin-alert-success">{messageSucces}</div> : null}

      {/* KPIs */}
      {ongletActif === 'apercu' && stats ? (
        <section className="admin-section">
          <div className="admin-section-header">
            <BarChart3 size={20} />
            <h2>{t('admin.overview')}</h2>
          </div>
          <div className="admin-kpis">
            <div className="admin-kpi admin-kpi-blue">
              <div className="admin-kpi-icon"><Users size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_utilisateurs}</strong>
                <span>{t('admin.users')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-primary">
              <div className="admin-kpi-icon"><BadgeCheck size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_pasteurs}</strong>
                <span>{t('admin.pastors', { count: stats.total_pasteurs_valides })}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-teal">
              <div className="admin-kpi-icon"><Video size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_predications}</strong>
                <span>{t('admin.sermons', { count: stats.total_predications_publiees })}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-amber">
              <div className="admin-kpi-icon"><Eye size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_vues?.toLocaleString('fr-FR')}</strong>
                <span>{t('admin.views')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-green">
              <div className="admin-kpi-icon"><Download size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_telechargements?.toLocaleString('fr-FR')}</strong>
                <span>{t('admin.downloads')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-pink">
              <div className="admin-kpi-icon"><MessageSquare size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_commentaires}</strong>
                <span>{t('admin.comments')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-rose">
              <div className="admin-kpi-icon"><Heart size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_favoris}</strong>
                <span>{t('admin.favorites')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-indigo">
              <div className="admin-kpi-icon"><Bell size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_abonnements}</strong>
                <span>{t('admin.subscriptions')}</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Demandes Pasteurs */}
      {ongletActif === 'pasteurs' && (
      <section className="admin-section">
        <div className="admin-section-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BadgeCheck size={20} />
            <h2>{t('admin.manage_pastors', 'Gestion des Pasteurs')}</h2>
            <span className="admin-badge-count">{pasteursFiltres.length}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setShowCreatePasteur(true)} style={{ fontSize: '0.9rem' }}>
              {t('admin.create_pastor', 'Créer un pasteur')}
            </Button>
            <input 
              type="text" 
              placeholder="Rechercher par nom, église, email..." 
              value={recherchePasteur}
              onChange={(e) => setRecherchePasteur(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '250px' }}
            />
            <select 
              value={filtreStatutPasteur} 
              onChange={(e) => setFiltreStatutPasteur(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            >
              <option value="tous">Tous les statuts</option>
              <option value="valides">Validés</option>
              <option value="en_attente">En attente</option>
              <option value="rejetes">Rejetés</option>
            </select>
          </div>
        </div>
        {pasteursFiltres.length ? (
          <div className="datatable-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>{t('admin.col_avatar', 'Avatar')}</th>
                  <th>{t('admin.col_name', 'Nom complet')}</th>
                  <th>{t('admin.col_church', 'Église')}</th>
                  <th>{t('admin.col_contact', 'Contact')}</th>
                  <th>{t('admin.col_status', 'Statut')}</th>
                  <th>{t('admin.col_date', 'Inscription')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.col_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pasteursAffiches.map((pasteur) => (
                  <tr key={pasteur.id} className="datatable-row">
                    <td>
                      <div className="admin-table-avatar">
                        {pasteur.avatar ? (
                          <img src={pasteur.avatar} alt={pasteur.nom_affichage} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span>{(pasteur.nom_affichage || '?')[0].toUpperCase()}</span>
                        )}
                      </div>
                    </td>
                    <td className="cell-title">
                      <strong>{pasteur.nom_affichage}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{pasteur.email}</div>
                    </td>
                    <td>{pasteur.nom_eglise || '-'}</td>
                    <td>{pasteur.contact || '-'}</td>
                    <td>
                      {pasteur.est_valide ? (
                        <span className="status-badge published">Validé</span>
                      ) : pasteur.est_rejete ? (
                        <span className="status-badge archived" style={{ color: '#ef4444', backgroundColor: '#fee2e2' }}>Rejeté</span>
                      ) : (
                        <span className="status-badge draft" style={{ color: '#004a94', backgroundColor: '#e0f2fe' }}>En attente</span>
                      )}
                    </td>
                    <td>{new Date(pasteur.cree_le).toLocaleDateString()}</td>
                    <td>
                      <div className="admin-table-actions">
                        {pasteur.cree_par_admin && (
                          <Button variant="secondary" onClick={() => { setSelectedPasteurId(pasteur.id); setShowPublishMedia(true); }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                            {t('admin.publish_media', 'Publier un média')}
                          </Button>
                        )}
                        {!pasteur.est_valide && (
                          <Button
                            variant="green"
                            icon={CheckCircle}
                            onClick={() => demanderConfirmation(
                              'Valider le pasteur',
                              `Êtes-vous sûr de vouloir valider le compte de ${pasteur.nom_affichage} ? Il pourra alors publier des vidéos.`,
                              'Valider le compte',
                              'success',
                              CheckCircle,
                              () => validerPasteur(pasteur)
                            )}
                            disabled={actionEnCours === `valider-${pasteur.id}` || actionEnCours === `rejeter-${pasteur.id}`}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                          >
                            {t('admin.validate_btn')}
                          </Button>
                        )}
                        {(!pasteur.est_rejete || pasteur.est_valide) && (
                          <Button
                            variant="red"
                            icon={XCircle}
                            onClick={() => demanderConfirmation(
                              'Rejeter le pasteur',
                              `Êtes-vous sûr de vouloir rejeter le compte de ${pasteur.nom_affichage} ?`,
                              'Rejeter le compte',
                              'danger',
                              XCircle,
                              () => rejeterPasteur(pasteur)
                            )}
                            disabled={actionEnCours === `valider-${pasteur.id}` || actionEnCours === `rejeter-${pasteur.id}` || actionEnCours === `supprimer-${pasteur.id}`}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                          >
                            {t('admin.reject_btn')}
                          </Button>
                        )}
                        <Button
                          variant="red"
                          icon={Trash2}
                          onClick={() => demanderConfirmation(
                            'Supprimer le compte',
                            `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${pasteur.nom_affichage} ? Cette action est irréversible.`,
                            'Supprimer',
                            'danger',
                            Trash2,
                            () => supprimerPasteur(pasteur)
                          )}
                          disabled={actionEnCours === `valider-${pasteur.id}` || actionEnCours === `rejeter-${pasteur.id}` || actionEnCours === `supprimer-${pasteur.id}`}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={pagePasteurs} total={totalPagesPasteurs} onChange={setPagePasteurs} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            <p>{t('admin.no_pending_pastors')}</p>
          </div>
        )}
      </section>
      )}

      {/* Signalements */}
      {ongletActif === 'signalements' && (
      <section className="admin-section">
        <div className="admin-section-header">
          <Flag size={20} />
          <h2>{t('admin.reports')}</h2>
          {signalements.length > 0 && (
            <span className="admin-badge-count admin-badge-red">{signalements.length}</span>
          )}
        </div>
        {signalements.length ? (
          <div className="datatable-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t('admin.col_reason', 'Raison')}</th>
                  <th>{t('admin.col_details', 'Détails')}</th>
                  <th>{t('admin.col_status', 'Statut')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.col_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {signalementsAffiches.map((signalement) => {
                  const IconeStatut = ICONES_STATUT[signalement.statut] || AlertTriangle;
                  return (
                    <tr key={signalement.id} className="datatable-row">
                      <td className="cell-title" style={{ fontWeight: 600 }}>{signalement.raison}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: '200px' }}>{signalement.details || '-'}</td>
                      <td>
                        <span className={`admin-statut admin-statut-${signalement.statut}`}>
                          <IconeStatut size={12} style={{ marginRight: '4px' }} />
                          {LIBELLES_STATUT[signalement.statut] || signalement.statut}
                        </span>
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          {signalement.statut !== 'EN_COURS' && (
                            <button type="button" className="admin-action-btn admin-action-pending" onClick={() => demanderConfirmation(
                              'En cours de traitement',
                              `Voulez-vous marquer ce signalement comme "En cours de traitement" ?`,
                              'Marquer en cours',
                              'warning',
                              Clock,
                              () => changerStatut(signalement, 'EN_COURS')
                            )}>
                              <Clock size={14} /> {t('admin.action_progress')}
                            </button>
                          )}
                          {signalement.statut !== 'TRAITE' && (
                            <button type="button" className="admin-action-btn admin-action-resolve" onClick={() => demanderConfirmation(
                              'Traiter le signalement',
                              `Voulez-vous marquer ce signalement comme "Traité" ?`,
                              'Marquer comme traité',
                              'success',
                              CheckCircle,
                              () => changerStatut(signalement, 'TRAITE')
                            )}>
                              <CheckCircle size={14} /> {t('admin.action_resolve')}
                            </button>
                          )}
                          {signalement.statut !== 'REJETE' && (
                            <button type="button" className="admin-action-btn admin-action-reject" onClick={() => demanderConfirmation(
                              'Rejeter le signalement',
                              `Voulez-vous rejeter ce signalement (sans suite) ?`,
                              'Rejeter',
                              'danger',
                              XCircle,
                              () => changerStatut(signalement, 'REJETE')
                            )}>
                              <XCircle size={14} /> {t('admin.action_reject')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={pageSignalements} total={totalPagesSignalements} onChange={setPageSignalements} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            <p>{t('admin.no_reports')}</p>
          </div>
        )}
      </section>
      )}

      {ongletActif === 'configuration' && (
        <GestionConfiguration />
      )}

      {/* Annonces */}
      {ongletActif === 'annonces' && (
      <section className="admin-section">
        <div className="admin-section-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Megaphone size={20} />
            <h2>Gestion des Annonces</h2>
            {annonces.length > 0 && (
              <span className="admin-badge-count">{annonces.length}</span>
            )}
          </div>
          <Button variant="primary" onClick={() => { setAnnonceSelectionnee(null); setShowAnnonceModal(true); }} style={{ fontSize: '0.9rem' }}>
            Créer une annonce
          </Button>
        </div>

        {annonces.length ? (
          <div className="datatable-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th>Date d'expiration</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {annoncesAffiches.map((annonce) => (
                  <tr key={annonce.id} className="datatable-row">
                    <td className="cell-title">
                      <strong>{annonce.titre}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {annonce.message ? (annonce.message.length > 50 ? annonce.message.substring(0, 50) + '...' : annonce.message) : '-'}
                      </div>
                    </td>
                    <td>
                      {annonce.est_actif ? (
                        <span className="status-badge published">Actif</span>
                      ) : (
                        <span className="status-badge archived" style={{ color: '#64748b', backgroundColor: '#f1f5f9' }}>Inactif</span>
                      )}
                    </td>
                    <td>
                      {annonce.date_expiration ? new Date(annonce.date_expiration).toLocaleString() : 'Jamais'}
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <Button
                          variant="secondary"
                          icon={Edit}
                          onClick={() => { setAnnonceSelectionnee(annonce); setShowAnnonceModal(true); }}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="red"
                          icon={Trash2}
                          onClick={() => demanderConfirmation(
                            'Supprimer l\'annonce',
                            `Êtes-vous sûr de vouloir supprimer l'annonce "${annonce.titre}" ?`,
                            'Supprimer',
                            'danger',
                            Trash2,
                            () => supprimerAnnonce(annonce)
                          )}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={pageAnnonces} total={totalPagesAnnonces} onChange={setPageAnnonces} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            <p>Aucune annonce pour le moment.</p>
          </div>
        )}
    </section>
    )}

      {/* Carrousel */}
      {ongletActif === 'carrousel' && (
      <section className="admin-section">
        <div className="admin-section-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MonitorPlay size={20} />
            <h2>Gestion du Carrousel (Page d'accueil)</h2>
            {carrouselMedias.length > 0 && (
              <span className="admin-badge-count">{carrouselMedias.length}</span>
            )}
          </div>
          <Button variant="primary" onClick={() => { setCarrouselSelectionne(null); setShowCarrouselModal(true); }} style={{ fontSize: '0.9rem' }}>
            Ajouter un média
          </Button>
        </div>

        {carrouselMedias.length ? (
          <div className="datatable-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Aperçu</th>
                  <th>Titre / Type</th>
                  <th>Ordre</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {carrouselAffiches.map((media) => (
                  <tr key={media.id} className="datatable-row">
                    <td style={{ width: '80px' }}>
                      {media.type_media === 'IMAGE' ? (
                        <div style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
                          <img src={media.fichier} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Video size={16} />
                        </div>
                      )}
                    </td>
                    <td className="cell-title">
                      <strong>{media.titre || 'Sans titre'}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {media.type_media === 'IMAGE' ? 'Image' : 'Vidéo'}
                      </div>
                    </td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                        {media.ordre}
                      </span>
                    </td>
                    <td>
                      {media.est_actif ? (
                        <span className="status-badge published">Actif</span>
                      ) : (
                        <span className="status-badge archived" style={{ color: '#64748b', backgroundColor: '#f1f5f9' }}>Inactif</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <Button
                          variant="secondary"
                          icon={Edit}
                          onClick={() => { setCarrouselSelectionne(media); setShowCarrouselModal(true); }}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="red"
                          icon={Trash2}
                          onClick={() => demanderConfirmation(
                            'Supprimer le média',
                            `Êtes-vous sûr de vouloir supprimer ce média du carrousel ?`,
                            'Supprimer',
                            'danger',
                            Trash2,
                            () => supprimerCarrousel(media)
                          )}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={pageCarrousel} total={totalPagesCarrousel} onChange={setPageCarrousel} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            <p>Aucun média dans le carrousel pour le moment.</p>
          </div>
        )}
      </section>
      )}

      {/* Vidéos */}
      {ongletActif === 'videos' && (
      <section className="admin-section">
        <div className="admin-section-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Video size={20} />
            <h2>Gestion des Vidéos et Actualités</h2>
            <span className="admin-badge-count">{predications.length}</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{predications.filter(p => p.est_a_la_une).length}</span> vidéos à la une
          </div>
        </div>

        {predications.length ? (
          <div className="datatable-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Pasteur</th>
                  <th>Média</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {predicationsAffiches.map((predication) => (
                  <tr key={predication.id} className="datatable-row">
                    <td className="cell-title">
                      <strong>{predication.titre}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {new Date(predication.cree_le).toLocaleDateString()}
                      </div>
                    </td>
                    <td>{predication.nom_predicateur || predication.pasteur?.nom_affichage || '-'}</td>
                    <td>
                      {predication.type_media === 'AUDIO' ? 'Audio' : predication.type_media === 'VIDEO' ? 'Vidéo' : 'Audio & Vidéo'}
                    </td>
                    <td>
                      {predication.est_a_la_une ? (
                        <span className="status-badge published" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>À la une</span>
                      ) : (
                        <span className="status-badge archived" style={{ color: '#64748b', backgroundColor: '#f1f5f9' }}>Standard</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <Button
                          variant={predication.est_a_la_une ? "secondary" : "primary"}
                          onClick={() => demanderConfirmation(
                            predication.est_a_la_une ? 'Retirer de la une' : 'Mettre à la une',
                            `Êtes-vous sûr de vouloir ${predication.est_a_la_une ? 'retirer' : 'ajouter'} la vidéo "${predication.titre}" ${predication.est_a_la_une ? 'de' : 'à'} la une ?`,
                            predication.est_a_la_une ? 'Retirer' : 'Ajouter',
                            predication.est_a_la_une ? 'warning' : 'primary',
                            Video,
                            () => basculerALaUne(predication)
                          )}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          {predication.est_a_la_une ? 'Retirer de la une' : 'Mettre à la une'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={pagePredications} total={totalPagesPredications} onChange={setPagePredications} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            <p>Aucune vidéo disponible.</p>
          </div>
        )}
      </section>
      )}

      <ConfirmModal 
        isOpen={modalOuvert}
        onClose={() => setModalOuvert(false)}
        onConfirm={modalConfig.action}
        title={modalConfig.titre}
        message={modalConfig.message}
        confirmText={modalConfig.texteConfirmer}
        variant={modalConfig.variante}
        icon={modalConfig.icone}
      />
      {/* Modals for creating pastor and publishing media */}
      <CreatePasteurModal
        isOpen={showCreatePasteur}
        onClose={() => setShowCreatePasteur(false)}
        onCreated={() => {
          charger();
        }}
      />
      <PublishMediaModal
        isOpen={showPublishMedia}
        onClose={() => setShowPublishMedia(false)}
        pasteurId={selectedPasteurId}
        onPublished={() => {
          charger();
        }}
      />
      <AnnonceModal
        isOpen={showAnnonceModal}
        onClose={() => { setShowAnnonceModal(false); setAnnonceSelectionnee(null); }}
        onSaved={() => {
          setMessageSucces(annonceSelectionnee ? "L'annonce a été modifiée avec succès." : "L'annonce a été créée avec succès.");
          charger();
        }}
        annonceInitiale={annonceSelectionnee}
      />
      <CarrouselModal
        isOpen={showCarrouselModal}
        onClose={() => { setShowCarrouselModal(false); setCarrouselSelectionne(null); }}
        onSave={sauvegarderCarrousel}
        mediaToEdit={carrouselSelectionne}
      />
      </main>
    </div>
  );
}
