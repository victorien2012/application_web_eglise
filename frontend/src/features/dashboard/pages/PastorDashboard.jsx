import { useEffect, useState, useRef } from 'react';
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
import {
  estLienChaineValide,
  extraireIdVideoYoutube,
  miniatureYoutube,
} from '../../../utils/youtube';
import './PastorDashboard.css';

const FORMULAIRE_VIDE = {
  titre: '',
  description: '',
  type_media: 'AUDIO',
  url_video: '',
  nom_predicateur: '',
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

// La video n'est jamais televersee : elle doit d'abord etre publiee sur
// YouTube, puis rattachee ici par son lien. Seuls l'audio (telechargeable) et
// l'image de couverture transitent en fichier.
const FICHIERS_VIDES = {
  fichier_audio: null,
  image_couverture: null,
};

// Doit refleter les limites appliquees par le serializer cote serveur : refuser
// ici evite de televerser un fichier volumineux pour se le voir rejeter apres.
const CONTRAINTES_FICHIERS = {
  fichier_audio: {
    extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac'],
    tailleMaxMo: 100,
  },
  image_couverture: {
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    tailleMaxMo: 5,
  },
};

function verifierFichier(cle, fichier) {
  const contrainte = CONTRAINTES_FICHIERS[cle];
  if (!contrainte || !fichier) return '';
  const extension = fichier.name.split('.').pop()?.toLowerCase();
  if (!contrainte.extensions.includes(extension)) {
    return `Format non supporté (${extension || 'inconnu'}). Formats acceptés : ${contrainte.extensions.join(', ')}.`;
  }
  if (fichier.size > contrainte.tailleMaxMo * 1024 * 1024) {
    const taille = (fichier.size / (1024 * 1024)).toFixed(1);
    return `Fichier trop volumineux (${taille} Mo). Maximum : ${contrainte.tailleMaxMo} Mo.`;
  }
  return '';
}

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
  const [totalPredications, setTotalPredications] = useState(0);
  const [chargementListe, setChargementListe] = useState(false);
  // Incremente pour forcer un rechargement apres creation ou suppression.
  const [compteurRafraichissement, setCompteurRafraichissement] = useState(0);
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
  const [erreursFichiers, setErreursFichiers] = useState({});
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
    const ids = selectionnes;
    // allSettled plutot que all : une seule suppression en echec faisait
    // passer l'ensemble pour un echec, alors que les autres etaient bien
    // supprimees — et la liste restait alors perimee.
    const resultats = await Promise.allSettled(ids.map(id => api.delete(`/predications/${id}/`)));
    const reussis = ids.filter((_, index) => resultats[index].status === 'fulfilled');
    const echoues = ids.filter((_, index) => resultats[index].status === 'rejected');

    if (reussis.includes(enEdition)) reinitialiserFormulaire();
    setSelectionnes(prev => prev.filter(x => !reussis.includes(x)));

    if (echoues.length === 0) {
      toast.current?.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.delete_multiple_success', { count: reussis.length }), life: 5000 });
    } else if (reussis.length === 0) {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: t('dashboard.delete_error'), life: 5000 });
    } else {
      toast.current?.show({
        severity: 'warn',
        summary: 'Suppression partielle',
        detail: `${reussis.length} vidéo(s) supprimée(s), ${echoues.length} en échec.`,
        life: 6000,
      });
    }

    try {
      await rechargerResume();
    } catch {
      /* La liste sera reactualisee au prochain chargement. */
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
      toast.current?.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.delete_success'), life: 5000 });
      await rechargerResume();
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: error.response?.data?.detail || t('dashboard.delete_error'), life: 5000 });
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

  // Le menu de notifications ne se refermait qu'en recliquant sur la cloche :
  // même comportement que le menu de compte dans App.jsx.
  useEffect(() => {
    if (!afficherNotifications) return undefined;
    const fermerSiExterieur = (e) => {
      if (!e.target.closest('.topbar-actions')) {
        setAfficherNotifications(false);
      }
    };
    document.addEventListener('click', fermerSiExterieur);
    return () => document.removeEventListener('click', fermerSiExterieur);
  }, [afficherNotifications]);

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

  // Le mode « média unique » propose VIDEO par défaut (voir ouvrirModeVideo),
  // mais le format reste modifiable : forcer VIDEO à chaque changement annulait
  // silencieusement les choix Audio et Mixte, rendant toute publication
  // audio impossible depuis cet espace.

  useEffect(() => {
    if (pasteur?.lien_youtube) setLienChaine(pasteur.lien_youtube);
  }, [pasteur]);

  async function handleSynchronisation(event) {
    event?.preventDefault();
    setSyncErreur('');
    setSyncMessage('');
    const lien = lienChaine.trim();
    if (!lien) {
      setSyncErreur(t('dashboard.youtube_link_required'));
      return;
    }
    // Verifie le format avant l'appel : un lien non reconnu revenait sinon
    // avec un « Chaine introuvable » generique apres un aller-retour reseau,
    // sans dire quels formats sont acceptes.
    if (!estLienChaineValide(lien)) {
      setSyncErreur(t(
        'dashboard.sync_link_format_error',
        "Ce lien n'est pas reconnu. Utilisez l'une de ces formes : youtube.com/@identifiant, youtube.com/channel/UC…, youtube.com/c/nom ou youtube.com/user/nom."
      ));
      return;
    }
    setSyncEnCours(true);
    try {
      const { data } = await api.post('/pasteurs/synchroniser_youtube/', {
        lien_youtube: lien,
      });
      setSyncMessage(data.detail || t('dashboard.import_started'));
    } catch (error) {
      const details = error.response?.data;
      setSyncErreur(details?.lien_youtube || details?.detail || t('dashboard.sync_error'));
    } finally {
      setSyncEnCours(false);
    }
  }

  // Parametres de la page de predications demandee au serveur.
  function parametresPredications(page = pageActuelle) {
    const params = { espace_pasteur: true, page, page_size: elementsParPage };
    if (recherche.trim()) params.search = recherche.trim();
    if (filtrePublication === 'publiees') params.est_publie = 'true';
    if (filtrePublication === 'brouillons') params.est_publie = 'false';
    return params;
  }

  useEffect(() => {
    let active = true;

    async function chargerDonnees() {
      try {
        const [statsResponse, seriesResponse, categoriesResponse, souscriptionResponse] = await Promise.all([
          api.get('/pasteurs/statistiques_tableau_de_bord/'),
          api.get('/series/'),
          api.get('/categories/'),
          api.get('/souscriptions/courante/').catch(() => ({ data: null }))
        ]);

        if (active) {
          setStats(statsResponse.data);
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

  // La liste des predications est rechargee a chaque changement de page, de
  // recherche ou de filtre : le serveur ne renvoie que la page demandee.
  useEffect(() => {
    let active = true;
    setChargementListe(true);
    api
      .get('/predications/', { params: parametresPredications() })
      .then((reponse) => {
        if (!active) return;
        setPredications(extraireListe(reponse.data));
        setTotalPredications(
          typeof reponse.data?.count === 'number'
            ? reponse.data.count
            : extraireListe(reponse.data).length
        );
      })
      .catch((error) => {
        if (active) setErreurStats(error.response?.data?.detail || t('dashboard.load_error'));
      })
      .finally(() => {
        if (active) setChargementListe(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageActuelle, recherche, filtrePublication, compteurRafraichissement]);

  // Recherche, filtre et pagination sont traites par le serveur : la liste
  // recue est deja la page a afficher. Charger tout le catalogue d'un pasteur
  // (jusqu'a un millier de predications) pour n'en montrer que cinq etait le
  // principal cout de cet ecran.
  const predicationsTraitees = predications;
  const totalPages = Math.max(1, Math.ceil(totalPredications / elementsParPage));
  const pageCourante = Math.min(Math.max(pageActuelle, 1), totalPages);
  const predicationsPagination = predications;

  // Réinitialiser automatiquement l'index de page en cas de filtrage, et oublier
  // les selections devenues invisibles : elles restaient comptees dans l'action
  // de suppression groupee.
  useEffect(() => {
    setPageActuelle(1);
    setSelectionnes([]);
  }, [recherche, filtrePublication]);

  function mettreAJourChamp(cle, valeur) {
    setFormulaire((actuel) => ({ ...actuel, [cle]: valeur }));
  }

  function mettreAJourFichier(cle, fichier) {
    const probleme = verifierFichier(cle, fichier);
    setErreursFichiers((actuelles) => ({ ...actuelles, [cle]: probleme }));
    setFichiers((actuel) => ({ ...actuel, [cle]: probleme ? null : fichier }));
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
    const statsResponse = await api.get('/pasteurs/statistiques_tableau_de_bord/');
    setStats(statsResponse.data);
    // La liste est rechargee par son propre effet, en conservant la page, la
    // recherche et le filtre en cours.
    setCompteurRafraichissement((n) => n + 1);
  }

  function construireCorps() {
    const aDesFichiers = Boolean(fichiers.fichier_audio || fichiers.image_couverture);

    if (!aDesFichiers) {
      const corpsJson = {
        ...formulaire,
        titre: formulaire.titre.trim(),
        description: formulaire.description.trim(),
        serie: formulaire.serie || null,
        date_publication: formulaire.date_publication || null,
        date_predication: formulaire.date_predication || null,
        nom_predicateur: formulaire.nom_predicateur.trim() || null,
      };
      // En edition, un champ vide doit effacer la valeur enregistree : en
      // l'omettant, il etait impossible de retirer un lien YouTube deja pose.
      if (!corpsJson.url_video && !enEdition) delete corpsJson.url_video;
      return corpsJson;
    }

    const corps = new FormData();
    corps.append('titre', formulaire.titre.trim());
    corps.append('description', formulaire.description.trim());
    corps.append('type_media', formulaire.type_media);
    if (formulaire.url_video || enEdition) corps.append('url_video', formulaire.url_video || '');
    if (formulaire.nom_predicateur.trim()) corps.append('nom_predicateur', formulaire.nom_predicateur.trim());
    corps.append('est_publie', formulaire.est_publie ? 'true' : 'false');
    if (formulaire.date_publication) corps.append('date_publication', formulaire.date_publication);
    if (formulaire.date_predication) corps.append('date_predication', formulaire.date_predication);
    if (formulaire.serie) corps.append('serie', formulaire.serie);
    formulaire.categories_ids.forEach((id) => corps.append('categories_ids', id));
    
    if (fichiers.fichier_audio) corps.append('fichier_audio', fichiers.fichier_audio);
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

  // Retourne un message d'erreur precis, ou '' si la source media convient.
  // Un booleen unique obligeait a afficher un message generique couvrant les
  // deux cas (audio manquant / lien manquant).
  function erreurSourceMedia() {
    // Sur une édition, un champ média non modifié conserve la valeur déjà enregistrée côté serveur.
    if (enEdition) return '';

    const veutAudio = formulaire.type_media === 'AUDIO' || formulaire.type_media === 'BOTH';
    const veutVideo = formulaire.type_media === 'VIDEO' || formulaire.type_media === 'BOTH';

    if (veutAudio && !fichiers.fichier_audio) {
      return t(
        'dashboard.form_audio_required',
        "Ajoutez le fichier audio correspondant au format choisi avant d'enregistrer."
      );
    }
    // La vidéo ne se téléverse plus : elle doit être publiée sur YouTube puis
    // rattachée par son lien.
    if (veutVideo && !formulaire.url_video.trim()) {
      return t(
        'dashboard.form_youtube_required',
        "Collez le lien YouTube de votre vidéo. Publiez-la d'abord sur votre chaîne YouTube, puis revenez coller son lien ici."
      );
    }
    if (veutVideo && !extraireIdVideoYoutube(formulaire.url_video)) {
      return t(
        'dashboard.form_youtube_invalid',
        "Lien YouTube non reconnu. Formats acceptés : /watch?v=…, youtu.be/…, /embed/… ou /shorts/…"
      );
    }
    return '';
  }

  async function handleSoumission(event) {
    event.preventDefault();
    setErreurFormulaire('');
    setMessageFormulaire('');

    // L'attribut required natif laisse passer un titre compose uniquement
    // d'espaces (une chaine non vide a ses yeux) ; le serveur le rejette
    // ensuite via trim_whitespace, mais seulement apres un aller-retour reseau.
    if (!formulaire.titre.trim()) {
      setErreurFormulaire(t('dashboard.form_title_required', 'Le titre est obligatoire.'));
      return;
    }

    const erreurMedia = erreurSourceMedia();
    if (erreurMedia) {
      setErreurFormulaire(erreurMedia);
      return;
    }

    setSoumission(true);

    try {
      const corps = construireCorps();
      if (enEdition) {
        await api.patch(`/predications/${enEdition}/`, corps);
        toast.current?.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.update_success', 'Modification enregistrée avec succès.'), life: 4000 });
      } else {
        await api.post('/predications/', corps);
        toast.current?.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.create_success', 'Vidéo ajoutée avec succès.'), life: 4000 });
      }
      reinitialiserFormulaire();
    } catch (error) {
      setErreurFormulaire(extraireErreurFormulaire(error));
      setSoumission(false);
      return;
    }

    // Hors du bloc precedent : un echec de rafraichissement signalait a tort
    // que l'enregistrement avait echoue, alors qu'il etait bien passe.
    try {
      await rechargerResume();
    } catch {
      toast.current?.show({
        severity: 'warn',
        summary: 'Liste non actualisée',
        detail: "L'enregistrement a réussi, mais la liste n'a pas pu être rechargée.",
        life: 5000,
      });
    } finally {
      setSoumission(false);
    }
  }



  // Recalculés à chaque rendu : figés à l'ouverture, l'aperçu et l'aide
  // cesseraient de refléter la saisie en cours.
  const lienChaineReconnue = estLienChaineValide(lienChaine);
  const idVideoSaisie = extraireIdVideoYoutube(formulaire.url_video);
  const lienVideoNonReconnu = Boolean(formulaire.url_video?.trim()) && !idVideoSaisie;

  if (erreurStats) {
    return (
      <div className="dashboard-intro" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <h2>{t('dashboard.error_title')}</h2>
        <p style={{ color: 'var(--danger)' }}>{erreurStats}</p>
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
          <div style={{ margin: '0 2.5rem 1.5rem', padding: '1.25rem', backgroundColor: 'rgba(var(--warning-rgb), 0.1)', border: '1px solid rgba(var(--warning-rgb), 0.3)', borderLeft: '4px solid var(--warning)', borderRadius: '8px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
              {t('dashboard.account_pending')}
            </p>
          </div>
        )}

        {souscription && !souscription.est_active && (
          <div style={{ margin: '0 2.5rem 1.5rem', padding: '1.25rem', backgroundColor: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid rgba(var(--danger-rgb), 0.3)', borderLeft: '4px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} />
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
              Votre abonnement a expiré. Vous ne pouvez plus publier de nouvelles vidéos ou documents. <a href="#" onClick={(e) => { e.preventDefault(); setOngletActif('abonnement'); }} style={{ color: 'var(--danger)', textDecoration: 'underline', fontWeight: 600 }}>Renouveler maintenant</a>.
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
                  <button className="btn" type="button" disabled={souscription && !souscription.est_active} style={{ backgroundColor: (souscription && !souscription.est_active) ? 'var(--border-color)' : '#ef4444', color: (souscription && !souscription.est_active) ? 'var(--text-muted)' : '#ffffff', border: 'none', display: 'flex', alignItems: 'center' }} onClick={() => {
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
                      style={{ backgroundColor: 'rgba(var(--danger-rgb), 0.12)', color: 'var(--danger)', border: '1px solid rgba(var(--danger-rgb), 0.4)' }}
                    >
                      {t('dashboard.delete_selection', { count: selectionnes.length })}
                    </button>
                  )}
                </div>
              </div>

              <div className="table-card-header">
                <div className="table-title">
                  <h3>{t('dashboard.videos_title')}</h3>
                  <span>{t('dashboard.videos_loaded', { count: totalPredications })}</span>
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
                  {t('dashboard.pagination_info', { current: predicationsPagination.length, total: totalPredications })}
                </span>
                <div className="pagination-controls" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    disabled={pageCourante === 1} 
                    onClick={() => setPageActuelle(pageCourante - 1)}
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.5rem' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="page-number">{t('dashboard.pagination_page', { current: pageCourante, total: totalPages })}</span>
                  <button 
                    disabled={pageCourante === totalPages} 
                    onClick={() => setPageActuelle(pageCourante + 1)}
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
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <Clock size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem auto', display: 'block' }} />
                <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>{t('dashboard.pending_account_title')}</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
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
                      maxLength={255}
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
                      accept=".mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,audio/*"
                      onChange={(e) => mettreAJourFichier('fichier_audio', e.target.files?.[0] || null)}
                    />
                    <small className="champ-aide">
                      Formats : {CONTRAINTES_FICHIERS.fichier_audio.extensions.join(', ')} — {CONTRAINTES_FICHIERS.fichier_audio.tailleMaxMo} Mo maximum.
                    </small>
                    {erreursFichiers.fichier_audio ? (
                      <small className="dashboard-error" role="alert">{erreursFichiers.fichier_audio}</small>
                    ) : null}
                  </label>
                ) : null}

                {(formulaire.type_media === 'VIDEO' || formulaire.type_media === 'BOTH') ? (
                  <>
                    {/* Marche a suivre rappelee dans le formulaire : la video
                        n'est pas hebergee par la plateforme, elle est diffusee
                        depuis YouTube. */}
                    <div className="info-banner-premium">
                      <Youtube size={15} />
                      <span>
                        {t(
                          'dashboard.form_youtube_workflow',
                          "Les vidéos ne sont pas hébergées ici : publiez d'abord votre vidéo sur votre chaîne YouTube, puis collez son lien ci-dessous. Elle sera lue directement dans l'application."
                        )}
                      </span>
                    </div>

                    <label className="dashboard-field">
                      <span>
                        {t('dashboard.form_youtube_label')}
                        <span className="champ-obligatoire" aria-hidden="true"> *</span>
                      </span>
                      <input
                        value={formulaire.url_video || ''}
                        onChange={(e) => mettreAJourChamp('url_video', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        aria-invalid={lienVideoNonReconnu}
                        aria-describedby={lienVideoNonReconnu ? 'url-video-erreur' : undefined}
                      />
                      <small className="champ-aide">
                        {t('dashboard.form_youtube_help')}
                      </small>

                      {/* Le serveur n'enregistre youtube_id que si l'URL
                          correspond à l'un de ses motifs. Sans ce retour, un
                          lien mal formé était accepté puis stocké sans
                          identifiant : pas de dédoublonnage, et un lecteur
                          incapable d'afficher la vidéo. */}
                      {lienVideoNonReconnu ? (
                        <small id="url-video-erreur" className="dashboard-error" role="alert">
                          {t(
                            'dashboard.form_youtube_invalid',
                            "Lien YouTube non reconnu. Formats acceptés : /watch?v=…, youtu.be/…, /embed/… ou /shorts/…"
                          )}
                        </small>
                      ) : null}

                      {idVideoSaisie ? (
                        // Pas de loading="lazy" : l'aperçu répond à une saisie
                        // en cours et se trouve souvent sous la ligne de
                        // flottaison, où il resterait vide jusqu'au défilement.
                        // onError masque la vignette si l'identifiant est bien
                        // formé mais ne correspond à aucune vidéo.
                        <span className="apercu-youtube">
                          <img
                            src={miniatureYoutube(idVideoSaisie)}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <small className="champ-aide">
                            {t('dashboard.form_youtube_preview', 'Vidéo détectée — vérifiez qu\'il s\'agit de la bonne.')}
                          </small>
                        </span>
                      ) : null}
                    </label>

                  </>
                ) : null}

                {/* Image de couverture : egalement geree par le code, sans champ
                    pour la choisir. Elle s'affiche sur les cartes du catalogue
                    public et sur la page d'accueil. */}
                <label className="dashboard-field">
                  <span>
                    {t('dashboard.form_cover_label', 'Image de couverture')}{' '}
                    <small className="champ-aide">{t('dashboard.optional', 'optionnelle')}</small>
                  </span>
                  <input
                    key={`couverture-${resetFichiersKey}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                    onChange={(e) => mettreAJourFichier('image_couverture', e.target.files?.[0] || null)}
                  />
                  <small className="champ-aide">
                    Affichée sur les cartes du catalogue. Formats : {CONTRAINTES_FICHIERS.image_couverture.extensions.join(', ')} — {CONTRAINTES_FICHIERS.image_couverture.tailleMaxMo} Mo maximum.
                  </small>
                  {erreursFichiers.image_couverture ? (
                    <small className="dashboard-error" role="alert">{erreursFichiers.image_couverture}</small>
                  ) : null}
                </label>

                <div className="dashboard-grid-2">
                  <label className="dashboard-field">
                    <span>{t('dashboard.form_preacher_label')}</span>
                    <input
                      value={formulaire.nom_predicateur || ''}
                      onChange={(e) => mettreAJourChamp('nom_predicateur', e.target.value)}
                      placeholder={t('dashboard.form_preacher_placeholder')}
                      maxLength={255}
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
                    )) : <span style={{ color: 'var(--pd-text-muted)' }}>{t('dashboard.no_categories')}</span>}
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
                <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 16px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,74,148,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Paperclip size={18} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{t('dashboard.pdf_attachments')}</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', marginLeft: '3rem' }}>
                    {t('dashboard.pdf_help')}
                  </p>
                  <GestionPiecesJointes predicationId={enEdition} />
                </div>
              ) : null}
              </Card>
            ) : (
            <Card>
              {/* Un <form> et non un <div> : la touche Entrée dans le champ ne
                  déclenchait aucune soumission. */}
              <form className="dashboard-form" onSubmit={handleSynchronisation}>
                <label className="dashboard-field">
                  <span>{t('dashboard.sync_youtube_label')}</span>
                  <input
                    value={lienChaine}
                    onChange={(e) => {
                      setLienChaine(e.target.value);
                      if (syncErreur) setSyncErreur('');
                    }}
                    placeholder="https://www.youtube.com/@votrechaine"
                    aria-invalid={!!syncErreur}
                    disabled={syncEnCours}
                  />
                  <small className="champ-aide">
                    {t('dashboard.sync_youtube_help')}
                  </small>
                  {lienChaineReconnue ? (
                    <small className="dashboard-status" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> {t('dashboard.sync_link_recognised', 'Format de lien reconnu.')}
                    </small>
                  ) : null}
                </label>

                <div className="info-banner-premium">
                  <CheckCircle2 size={15} />
                  <span>
                    {t('dashboard.sync_auto_info')}
                  </span>
                </div>

                {syncErreur ? <p className="dashboard-error" role="alert">{syncErreur}</p> : null}
                {syncMessage ? <p className="dashboard-status" role="status">{syncMessage}</p> : null}

                <div className="dashboard-inline" style={{ marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={syncEnCours || !lienChaine.trim()}
                  >
                    {syncEnCours ? t('dashboard.starting_import') : t('dashboard.start_sync')}
                  </button>
                </div>
              </form>
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