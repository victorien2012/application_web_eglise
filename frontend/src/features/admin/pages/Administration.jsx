import { useEffect, useState } from 'react';
import { ShieldCheck, Flag, BadgeCheck, BarChart3, CheckCircle, XCircle, Trash2, Clock, AlertTriangle, Users, Video, Eye, Download, MessageSquare, Heart, Bell, Megaphone, Edit, MonitorPlay, Settings, UserX, UserCheck } from 'lucide-react';
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
  const [pagePasteursValides, setPagePasteursValides] = useState(1);
  const [pageSignalements, setPageSignalements] = useState(1);
  const [pageAnnonces, setPageAnnonces] = useState(1);
  const [pageCarrousel, setPageCarrousel] = useState(1);
  const [pagePredications, setPagePredications] = useState(1);
  const [totalPredications, setTotalPredications] = useState(0);
  const [chargementPredications, setChargementPredications] = useState(false);
  const [rechercheVideo, setRechercheVideo] = useState('');
  const [rechercheVideoAppliquee, setRechercheVideoAppliquee] = useState('');
  const [filtreALaUne, setFiltreALaUne] = useState('toutes');
  // Incremente pour forcer un rechargement de la liste apres une publication.
  const [compteurRafraichissementVideos, setCompteurRafraichissementVideos] = useState(0);
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

  // Le catalogue complet des prédications pèse plusieurs méga-octets : il n'est
  // plus chargé avec le reste, mais seulement a l'ouverture de l'onglet Vidéos.
  // Les compteurs du tableau de bord viennent de /admin/statistiques/.
  async function charger() {
    setChargement(true);
    try {
      const [statsRes, pasteursRes, signalementsRes, annoncesRes, carrouselRes] = await Promise.all([
        api.get('/admin/statistiques/'),
        api.get('/pasteurs/'),
        api.get('/signalements/'),
        api.get('/annonces/'),
        api.get('/carrousel/')
      ]);
      setStats(statsRes.data);
      setPasteurs(extraireListe(pasteursRes.data));
      setSignalements(extraireListe(signalementsRes.data));
      setAnnonces(extraireListe(annoncesRes.data));
      setCarrouselMedias(extraireListe(carrouselRes.data));
      setErreur('');
    } catch (error) {
      setErreur(error.response?.data?.detail || t('admin.load_error'));
    } finally {
      setChargement(false);
    }
  }

  // Pagination serveur : le catalogue compte plus de 1500 videos, les charger
  // toutes pour n'en afficher que cinq etait le principal cout de cette page.
  async function chargerPredications() {
    setChargementPredications(true);
    try {
      const params = {
        espace_admin: true,
        page: pagePredications,
        page_size: ELEMENTS_PAR_PAGE,
      };
      if (rechercheVideoAppliquee) {
        params.search = rechercheVideoAppliquee;
      }
      if (filtreALaUne !== 'toutes') {
        params.est_a_la_une = filtreALaUne === 'a_la_une' ? 'true' : 'false';
      }
      const reponse = await api.get('/predications/', { params });
      setPredications(extraireListe(reponse.data));
      setTotalPredications(
        typeof reponse.data?.count === 'number'
          ? reponse.data.count
          : extraireListe(reponse.data).length
      );
    } catch (error) {
      setErreur(error.response?.data?.detail || t('admin.load_error'));
    } finally {
      setChargementPredications(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Anti-rebond de la recherche vidéo : sans cela chaque frappe partirait au serveur.
  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRechercheVideoAppliquee(rechercheVideo.trim());
      setPagePredications(1);
    }, 350);
    return () => clearTimeout(minuteur);
  }, [rechercheVideo]);

  useEffect(() => {
    setPagePredications(1);
  }, [filtreALaUne]);

  useEffect(() => {
    if (ongletActif !== 'videos') return;
    chargerPredications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongletActif, pagePredications, rechercheVideoAppliquee, filtreALaUne, compteurRafraichissementVideos]);

  useEffect(() => {
    setPagePasteurs(1);
    setPagePasteursValides(1);
  }, [filtreStatutPasteur, recherchePasteur, ongletActif]);

  useEffect(() => {
    if (messageSucces || erreur) {
      const timer = setTimeout(() => {
        setMessageSucces('');
        setErreur('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [messageSucces, erreur]);

  const demanderConfirmation = (titre, message, texteConfirmer, variante, icone, action) => {
    setModalConfig({ titre, message, texteConfirmer, variante, icone, action });
    setModalOuvert(true);
  };

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

  async function supprimerChaineYoutube(pasteur) {
    setActionEnCours(`supprimer-chaine-${pasteur.id}`);
    try {
      await api.post(`/pasteurs/${pasteur.id}/admin_supprimer_chaine_youtube/`, { supprimer_videos: true });
      setPasteurs((actuels) => actuels.map(p => p.id === pasteur.id ? { ...p, lien_youtube: null } : p));
      setMessageSucces('La chaîne YouTube et ses vidéos importées ont été retirées avec succès.');
      setErreur('');
    } catch {
      setErreur('Erreur lors du retrait de la chaîne YouTube.');
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
      // L'erreur est relancee pour que la modale reste ouverte et l'affiche
      // elle-meme : auparavant elle s'affichait derriere, donc invisible.
      throw error;
    }
  }

  async function basculerALaUne(predication) {
    try {
      const nouveauStatut = !predication.est_a_la_une;
      await api.patch(`/predications/${predication.id}/`, { est_a_la_une: nouveauStatut });
      setPredications((actuels) => actuels.map(p => p.id === predication.id ? { ...p, est_a_la_une: nouveauStatut } : p));
      // Le compteur global vient des statistiques : il doit suivre l'action
      // sans attendre un rechargement complet de la page.
      setStats((actuelles) => actuelles && ({
        ...actuelles,
        total_predications_a_la_une: Math.max(0, (actuelles.total_predications_a_la_une || 0) + (nouveauStatut ? 1 : -1)),
      }));
      setMessageSucces(nouveauStatut ? "La vidéo a été ajoutée à la une." : "La vidéo a été retirée de la une.");
      setErreur('');
    } catch {
      setErreur("Erreur lors de la mise à jour de la vidéo.");
      setMessageSucces('');
    }
  }

  // Supprimer un pasteur supprime en cascade ses predications, series et
  // documents. Annoncer le volume exact evite qu'un administrateur croie ne
  // retirer qu'un compte alors qu'il efface des annees de contenu.
  function messageSuppressionPasteur(pasteur) {
    const nbPredications = pasteur.nombre_predications || 0;
    const nbDocuments = pasteur.nombre_documents || 0;
    const pertes = [];
    if (nbPredications) {
      pertes.push(`${nbPredications} prédication${nbPredications > 1 ? 's' : ''}`);
    }
    if (nbDocuments) {
      pertes.push(`${nbDocuments} document${nbDocuments > 1 ? 's' : ''}`);
    }
    const detailPertes = pertes.length
      ? ` Tout son contenu sera également supprimé : ${pertes.join(' et ')}.`
      : '';
    return `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${pasteur.nom_affichage} ?${detailPertes} Cette action est irréversible.`;
  }

  const pasteursFiltres = pasteurs.filter(p => {
    const correspondRecherche = (p.nom_affichage || '').toLowerCase().includes(recherchePasteur.toLowerCase()) ||
                                (p.nom_eglise || '').toLowerCase().includes(recherchePasteur.toLowerCase()) ||
                                (p.email || '').toLowerCase().includes(recherchePasteur.toLowerCase());
    
    // Pour l'onglet Demandes, on ne veut que les non-validés (sauf si on filtre explicitement, mais gardons la logique pour l'instant et forçons les non-validés si on est sur 'pasteurs')
    if (ongletActif === 'pasteurs') {
      if (p.est_valide) return false;
      if (filtreStatutPasteur === 'en_attente') return correspondRecherche && !p.est_valide && !p.est_rejete;
      if (filtreStatutPasteur === 'rejetes') return correspondRecherche && !p.est_valide && p.est_rejete;
      return correspondRecherche;
    }
    return false;
  });

  const pasteursValidesFiltres = pasteurs.filter(p => {
    const correspondRecherche = (p.nom_affichage || '').toLowerCase().includes(recherchePasteur.toLowerCase()) ||
                                (p.nom_eglise || '').toLowerCase().includes(recherchePasteur.toLowerCase()) ||
                                (p.email || '').toLowerCase().includes(recherchePasteur.toLowerCase());
    if (ongletActif === 'pasteurs_valides') {
      return correspondRecherche && p.est_valide;
    }
    return false;
  });

  // Supprimer le dernier element d'une page laissait l'administrateur sur une
  // page vide, sans moyen de revenir en arriere puisque la pagination n'affiche
  // plus ce numero. On ramene la page dans les bornes avant de decouper.
  function decouperPage(elements, page) {
    const total = Math.ceil(elements.length / ELEMENTS_PAR_PAGE);
    const pageCourante = Math.min(Math.max(page, 1), Math.max(total, 1));
    const debut = (pageCourante - 1) * ELEMENTS_PAR_PAGE;
    return {
      elements: elements.slice(debut, debut + ELEMENTS_PAR_PAGE),
      page: pageCourante,
      total,
    };
  }

  const vuePasteurs = decouperPage(pasteursFiltres, pagePasteurs);
  const vuePasteursValides = decouperPage(pasteursValidesFiltres, pagePasteursValides);
  const vueSignalements = decouperPage(signalements, pageSignalements);
  const vueAnnonces = decouperPage(annonces, pageAnnonces);
  const vueCarrousel = decouperPage(carrouselMedias, pageCarrousel);
  // Les predications sont paginees par le serveur : la liste recue est deja la
  // page a afficher, il n'y a rien a decouper.
  const totalPagesPredications = Math.max(1, Math.ceil(totalPredications / ELEMENTS_PAR_PAGE));

  // Agregats de la serie analytique deja fournie par l'API.
  const activite30Jours = (stats?.serie_analytique || []).reduce(
    (acc, jour) => {
      const lectures = jour.lectures || 0;
      const telechargements = jour.telechargements || 0;
      return {
        lectures: acc.lectures + lectures,
        telechargements: acc.telechargements + telechargements,
        total: acc.total + lectures + telechargements,
        max: Math.max(acc.max, lectures + telechargements),
      };
    },
    { lectures: 0, telechargements: 0, total: 0, max: 0 }
  );

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
          <button type="button" className={`menu-item ${ongletActif === 'pasteurs_valides' ? 'active' : ''}`} onClick={() => setOngletActif('pasteurs_valides')}>
            <BadgeCheck size={18} />
            <span>Pasteurs Validés</span>
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

          {/* Ces deux blocs exploitent des donnees que /admin/statistiques/
              calculait et transmettait deja, mais que la page n'affichait pas. */}
          {activite30Jours.total > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem', color: 'var(--text-main)' }}>
                Activité des 30 derniers jours
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                {activite30Jours.lectures.toLocaleString('fr-FR')} lectures et{' '}
                {activite30Jours.telechargements.toLocaleString('fr-FR')} téléchargements
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '90px' }}>
                {stats.serie_analytique.map((jour) => {
                  const valeur = (jour.lectures || 0) + (jour.telechargements || 0);
                  const hauteur = activite30Jours.max ? Math.max(2, (valeur / activite30Jours.max) * 100) : 2;
                  return (
                    <div
                      key={jour.date}
                      title={`${jour.date} : ${jour.lectures} lectures, ${jour.telechargements} téléchargements`}
                      style={{
                        flex: 1,
                        height: `${hauteur}%`,
                        background: valeur ? 'var(--primary)' : 'var(--border-color)',
                        borderRadius: '3px 3px 0 0',
                        minWidth: '4px',
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                <span>{stats.serie_analytique[0]?.date}</span>
                <span>{stats.serie_analytique[stats.serie_analytique.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {stats.meilleures_predications?.length ? (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                Contenus les plus consultés
              </h3>
              <div className="datatable-responsive">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Titre</th>
                      <th>Pasteur</th>
                      <th style={{ textAlign: 'right' }}>Vues</th>
                      <th style={{ textAlign: 'right' }}>Téléchargements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.meilleures_predications.map((predication, index) => (
                      <tr key={predication.id} className="datatable-row">
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{index + 1}</td>
                        <td className="cell-title">
                          <a href={`/sermon/${predication.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {predication.titre}
                          </a>
                        </td>
                        <td>{predication.nom_predicateur || predication.pasteur?.nom_affichage || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{(predication.nombre_vues || 0).toLocaleString('fr-FR')}</td>
                        <td style={{ textAlign: 'right' }}>{(predication.nombre_telechargements || 0).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Demandes Pasteurs */}
      {ongletActif === 'pasteurs' && (
      <section className="admin-section">
        <div className="admin-section-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} />
            <h2>Demandes Pasteurs</h2>
            <span className="admin-badge-count">{pasteursFiltres.length}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              aria-label="Rechercher un pasteur par nom, église ou email"
              placeholder="Rechercher par nom, église, email..." 
              value={recherchePasteur}
              onChange={(e) => setRecherchePasteur(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', width: '250px' }}
            />
            <select
              aria-label="Filtrer les demandes par statut"
              value={filtreStatutPasteur}
              onChange={(e) => setFiltreStatutPasteur(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            >
              <option value="tous">Toutes les demandes</option>
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
                  <th style={{ width: '60px' }}>Avatar</th>
                  <th>Nom complet</th>
                  <th>Église</th>
                  <th>Contact</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vuePasteurs.elements.map((pasteur) => (
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
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{pasteur.email}</div>
                    </td>
                    <td>{pasteur.nom_eglise || '-'}</td>
                    <td>{pasteur.contact || '-'}</td>
                    <td>
                      {pasteur.est_rejete ? (
                        <span className="status-badge archived" style={{ color: 'var(--danger)', backgroundColor: 'rgba(var(--danger-rgb), 0.14)' }}>Rejeté</span>
                      ) : (
                        <span className="status-badge draft" style={{ color: 'var(--primary)', backgroundColor: 'rgba(var(--primary-rgb), 0.14)' }}>En attente</span>
                      )}
                    </td>
                    <td>{new Date(pasteur.cree_le).toLocaleDateString()}</td>
                    <td>
                      <div className="admin-table-actions">
                        <Button
                          variant="green"
                          icon={UserCheck}
                          onClick={() => demanderConfirmation(
                            'Valider le pasteur',
                            `Êtes-vous sûr de vouloir valider le compte de ${pasteur.nom_affichage} ? Il pourra alors publier des vidéos.`,
                            'Valider le compte',
                            'success',
                            UserCheck,
                            () => validerPasteur(pasteur)
                          )}
                          disabled={actionEnCours === `valider-${pasteur.id}` || actionEnCours === `rejeter-${pasteur.id}`}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          Valider
                        </Button>
                        <Button
                          variant="red"
                          icon={UserX}
                          onClick={() => demanderConfirmation(
                            'Rejeter le pasteur',
                            `Êtes-vous sûr de vouloir rejeter le compte de ${pasteur.nom_affichage} ?`,
                            'Rejeter le compte',
                            'danger',
                            UserX,
                            () => rejeterPasteur(pasteur)
                          )}
                          disabled={actionEnCours === `valider-${pasteur.id}` || actionEnCours === `rejeter-${pasteur.id}` || actionEnCours === `supprimer-${pasteur.id}`}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          Rejeter
                        </Button>
                        <Button
                          variant="red"
                          icon={Trash2}
                          onClick={() => demanderConfirmation(
                            'Supprimer le compte',
                            messageSuppressionPasteur(pasteur),
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
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={vuePasteurs.page} total={vuePasteurs.total} onChange={setPagePasteurs} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            {recherchePasteur || filtreStatutPasteur !== 'tous' ? (
              <p>Aucune demande ne correspond à votre recherche ou à votre filtre.</p>
            ) : (
              <p>Aucune demande de pasteur en attente.</p>
            )}
          </div>
        )}
      </section>
      )}

      {/* Pasteurs Validés */}
      {ongletActif === 'pasteurs_valides' && (
      <section className="admin-section">
        <div className="admin-section-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BadgeCheck size={20} />
            <h2>Pasteurs Validés</h2>
            <span className="admin-badge-count">{pasteursValidesFiltres.length}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setShowCreatePasteur(true)} style={{ fontSize: '0.9rem' }}>
              Créer un pasteur
            </Button>
            <input 
              type="text" 
              aria-label="Rechercher un pasteur par nom, église ou email"
              placeholder="Rechercher par nom, église, email..." 
              value={recherchePasteur}
              onChange={(e) => setRecherchePasteur(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', width: '250px' }}
            />
          </div>
        </div>
        {pasteursValidesFiltres.length ? (
          <div className="datatable-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Avatar</th>
                  <th>Nom complet</th>
                  <th>Église</th>
                  <th>Contact</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vuePasteursValides.elements.map((pasteur) => (
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
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{pasteur.email}</div>
                    </td>
                    <td>{pasteur.nom_eglise || '-'}</td>
                    <td>{pasteur.contact || '-'}</td>
                    <td>
                      <span className="status-badge published">Validé</span>
                    </td>
                    <td>{new Date(pasteur.cree_le).toLocaleDateString()}</td>
                    <td>
                      <div className="admin-table-actions">
                        {pasteur.cree_par_admin && (
                          <Button
                            variant="primary"
                            icon={MonitorPlay}
                            onClick={() => { setSelectedPasteurId(pasteur.id); setShowPublishMedia(true); }}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                          >
                            Publier média
                          </Button>
                        )}
                        {/* Sans chaine rattachee, le bouton n'avait aucun effet. */}
                        {pasteur.cree_par_admin && pasteur.lien_youtube && (
                          <Button
                            variant="secondary"
                            icon={Video}
                            onClick={() => demanderConfirmation(
                              'Retirer la chaîne YouTube',
                              `Êtes-vous sûr de vouloir retirer la chaîne YouTube de ${pasteur.nom_affichage} ? Toutes les vidéos associées seront supprimées.`,
                              'Retirer la chaîne',
                              'warning',
                              Video,
                              () => supprimerChaineYoutube(pasteur)
                            )}
                            disabled={actionEnCours === `supprimer-chaine-${pasteur.id}`}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', backgroundColor: 'rgba(var(--danger-rgb), 0.14)', color: 'var(--danger)', borderColor: 'rgba(var(--danger-rgb), 0.4)' }}
                          >
                            Détacher YouTube
                          </Button>
                        )}
                        <Button
                          variant="red"
                          icon={Trash2}
                          onClick={() => demanderConfirmation(
                            'Supprimer le compte',
                            messageSuppressionPasteur(pasteur),
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
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={vuePasteursValides.page} total={vuePasteursValides.total} onChange={setPagePasteursValides} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            {recherchePasteur ? (
              <p>Aucun pasteur validé ne correspond à « {recherchePasteur} ».</p>
            ) : (
              <p>Aucun pasteur validé.</p>
            )}
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
                  <th>Contenu signalé</th>
                  <th>{t('admin.col_details', 'Détails')}</th>
                  <th>Signalé par</th>
                  <th>{t('admin.col_status', 'Statut')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.col_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {vueSignalements.elements.map((signalement) => {
                  const IconeStatut = ICONES_STATUT[signalement.statut] || AlertTriangle;
                  return (
                    <tr key={signalement.id} className="datatable-row">
                      <td className="cell-title" style={{ fontWeight: 600 }}>{signalement.raison}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: '180px' }}>
                        {signalement.predication ? (
                          <a
                            href={`/sermon/${signalement.predication}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--primary)', fontWeight: 600 }}
                          >
                            {signalement.predication_titre || `Prédication #${signalement.predication}`}
                          </a>
                        ) : signalement.commentaire ? (
                          <span>
                            <em style={{ color: 'var(--text-muted)' }}>Commentaire :</em>{' '}
                            {signalement.commentaire_contenu
                              ? `« ${signalement.commentaire_contenu.slice(0, 60)}${signalement.commentaire_contenu.length > 60 ? '…' : ''} »`
                              : `#${signalement.commentaire}`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Contenu supprimé</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'normal', minWidth: '180px' }}>{signalement.details || '-'}</td>
                      <td>
                        <div>{signalement.utilisateur?.username || 'Anonyme'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {signalement.cree_le ? new Date(signalement.cree_le).toLocaleDateString('fr-FR') : ''}
                        </div>
                      </td>
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
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={vueSignalements.page} total={vueSignalements.total} onChange={setPageSignalements} />
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
                {vueAnnonces.elements.map((annonce) => (
                  <tr key={annonce.id} className="datatable-row">
                    <td className="cell-title">
                      <strong>{annonce.titre}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {annonce.message ? (annonce.message.length > 50 ? annonce.message.substring(0, 50) + '...' : annonce.message) : '-'}
                      </div>
                    </td>
                    <td>
                      {annonce.est_actif ? (
                        <span className="status-badge published">Actif</span>
                      ) : (
                        <span className="status-badge archived" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-alt)' }}>Inactif</span>
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
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={vueAnnonces.page} total={vueAnnonces.total} onChange={setPageAnnonces} />
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
                {vueCarrousel.elements.map((media) => (
                  <tr key={media.id} className="datatable-row">
                    <td style={{ width: '80px' }}>
                      {media.type_media === 'IMAGE' ? (
                        <div style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-alt)' }}>
                          <img src={media.fichier} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-card)' }}>
                          <Video size={16} />
                        </div>
                      )}
                    </td>
                    <td className="cell-title">
                      <strong>{media.titre || 'Sans titre'}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {media.type_media === 'IMAGE' ? 'Image' : 'Vidéo'}
                      </div>
                    </td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: 'var(--bg-alt)', color: 'var(--text-main)' }}>
                        {media.ordre}
                      </span>
                    </td>
                    <td>
                      {media.est_actif ? (
                        <span className="status-badge published">Actif</span>
                      ) : (
                        <span className="status-badge archived" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-alt)' }}>Inactif</span>
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
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={vueCarrousel.page} total={vueCarrousel.total} onChange={setPageCarrousel} />
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
            <span className="admin-badge-count">{totalPredications}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Compteur global : la page affichée ne contient que 5 vidéos. */}
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{stats?.total_predications_a_la_une ?? 0}</span> à la une
            </div>
            <input
              type="text"
              aria-label="Rechercher une vidéo par titre, description ou pasteur"
              placeholder="Rechercher une vidéo..."
              value={rechercheVideo}
              onChange={(e) => setRechercheVideo(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', width: '230px' }}
            />
            <select
              aria-label="Filtrer les vidéos par mise en avant"
              value={filtreALaUne}
              onChange={(e) => setFiltreALaUne(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            >
              <option value="toutes">Toutes les vidéos</option>
              <option value="a_la_une">À la une</option>
              <option value="standard">Standard</option>
            </select>
          </div>
        </div>

        {chargementPredications ? (
          <div className="admin-loading" style={{ minHeight: '200px' }}>
            <div className="admin-loading-spinner" />
            <p>Chargement des vidéos…</p>
          </div>
        ) : predications.length ? (
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
                {predications.map((predication) => (
                  <tr key={predication.id} className="datatable-row">
                    <td className="cell-title">
                      <strong>{predication.titre}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {new Date(predication.cree_le).toLocaleDateString()}
                      </div>
                    </td>
                    <td>{predication.nom_predicateur || predication.pasteur?.nom_affichage || '-'}</td>
                    <td>
                      {predication.type_media === 'AUDIO' ? 'Audio' : predication.type_media === 'VIDEO' ? 'Vidéo' : 'Audio & Vidéo'}
                    </td>
                    <td>
                      {predication.est_a_la_une ? (
                        <span className="status-badge published" style={{ backgroundColor: 'rgba(var(--warning-rgb), 0.16)', color: 'var(--warning)' }}>À la une</span>
                      ) : (
                        <span className="status-badge archived" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-alt)' }}>Standard</span>
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
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={pagePredications} total={totalPagesPredications} onChange={setPagePredications} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            {rechercheVideoAppliquee || filtreALaUne !== 'toutes' ? (
              <p>Aucune vidéo ne correspond à votre recherche ou à votre filtre.</p>
            ) : (
              <p>Aucune vidéo disponible.</p>
            )}
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
          setMessageSucces('Le compte pasteur a été créé avec succès. Pensez à communiquer le mot de passe au pasteur.');
          setErreur('');
          charger();
        }}
      />
      <PublishMediaModal
        isOpen={showPublishMedia}
        onClose={() => { setShowPublishMedia(false); setSelectedPasteurId(null); }}
        pasteurId={selectedPasteurId}
        onPublished={() => {
          // La publication ne donnait aucun retour : rien ne distinguait un
          // enregistrement reussi d'un formulaire simplement referme.
          setMessageSucces('Le média a été publié avec succès.');
          setErreur('');
          setSelectedPasteurId(null);
          // Le nouveau média doit apparaître dans l'onglet Vidéos.
          setCompteurRafraichissementVideos((n) => n + 1);
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
