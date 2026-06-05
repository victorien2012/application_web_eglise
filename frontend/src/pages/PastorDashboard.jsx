import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, Download, Headphones, MessageSquare, Mic2, Paperclip,
  PencilLine, PlusCircle, Trash2, TrendingUp, Search, Calendar,
  ChevronLeft, ChevronRight, Eye, Film, CheckCircle2, AlertCircle, Youtube
} from 'lucide-react';
import { api, extraireListe } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ModerationCommentaires } from '../components/ModerationCommentaires';
import { GestionPiecesJointes } from '../components/GestionPiecesJointes';
import './PastorDashboard.css';

const FORMULAIRE_VIDE = {
  titre: '',
  description: '',
  type_media: 'AUDIO',
  url_video: '',
  duree_secondes: 0,
  est_publie: true,
  date_publication: '',
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
  const [stats, setStats] = useState(null);
  const [predications, setPredications] = useState([]);
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [erreurStats, setErreurStats] = useState('');
  const [erreurFormulaire, setErreurFormulaire] = useState('');
  const [messageFormulaire, setMessageFormulaire] = useState('');
  const [chargementInitial, setChargementInitial] = useState(true);
  const [soumission, setSoumission] = useState(false);
  
  // États indispensables au Datatable (Recherche, Filtre & Pagination)
  const [filtrePublication, setFiltrePublication] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [pageActuelle, setPageActuelle] = useState(1);
  const elementsParPage = 5;

  const [enEdition, setEnEdition] = useState(null);
  const [commentairesOuverts, setCommentairesOuverts] = useState(null);
  const [piecesOuvertes, setPiecesOuvertes] = useState(null);
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [fichiers, setFichiers] = useState(FICHIERS_VIDES);
  const [resetFichiersKey, setResetFichiersKey] = useState(0);
  const [ongletActif, setOngletActif] = useState('apercu');

  // Publication : 'chaine' (synchro complète) ou 'video' (ajout d'une vidéo à l'unité).
  const { pasteur } = useAuth();
  const [modePublication, setModePublication] = useState('chaine');
  const [lienChaine, setLienChaine] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncErreur, setSyncErreur] = useState('');
  const [syncEnCours, setSyncEnCours] = useState(false);

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
      setSyncErreur('Veuillez renseigner le lien de votre chaîne YouTube.');
      return;
    }
    setSyncEnCours(true);
    try {
      const { data } = await api.post('/pasteurs/synchroniser_youtube/', {
        lien_youtube: lienChaine.trim(),
      });
      setSyncMessage(data.detail || 'Import démarré.');
    } catch (error) {
      const details = error.response?.data;
      setSyncErreur(details?.lien_youtube || details?.detail || "La synchronisation a échoué.");
    } finally {
      setSyncEnCours(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function chargerDonnees() {
      try {
        const [statsResponse, predicationsResponse, seriesResponse, categoriesResponse] = await Promise.all([
          api.get('/pasteurs/statistiques_tableau_de_bord/'),
          api.get('/predications/?espace_pasteur=true'),
          api.get('/series/'),
          api.get('/categories/'),
        ]);

        if (active) {
          setStats(statsResponse.data);
          setPredications(extraireListe(predicationsResponse.data));
          setSeries(extraireListe(seriesResponse.data));
          setCategories(extraireListe(categoriesResponse.data));
        }
      } catch (error) {
        if (active) {
          setErreurStats(error.response?.data?.detail || 'Impossible de charger le tableau de bord.');
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
      duree_secondes: predication.duree_secondes,
      est_publie: predication.est_publie,
      date_publication: isoVersInputLocal(predication.date_publication),
      serie: predication.serie?.id || '',
      categories_ids: (predication.categories || []).map((categorie) => categorie.id),
    });
    setFichiers(FICHIERS_VIDES);
    setResetFichiersKey((cle) => cle + 1);
    setOngletActif('publier');
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
      };
      if (!corpsJson.url_video) delete corpsJson.url_video;
      return corpsJson;
    }

    const corps = new FormData();
    corps.append('titre', formulaire.titre);
    corps.append('description', formulaire.description || '');
    corps.append('type_media', formulaire.type_media);
    if (formulaire.url_video) corps.append('url_video', formulaire.url_video);
    corps.append('duree_secondes', Number(formulaire.duree_secondes) || 0);
    corps.append('est_publie', formulaire.est_publie ? 'true' : 'false');
    if (formulaire.date_publication) corps.append('date_publication', formulaire.date_publication);
    if (formulaire.serie) corps.append('serie', formulaire.serie);
    formulaire.categories_ids.forEach((id) => corps.append('categories_ids', id));
    
    if (fichiers.fichier_audio) corps.append('fichier_audio', fichiers.fichier_audio);
    if (fichiers.fichier_video) corps.append('fichier_video', fichiers.fichier_video);
    if (fichiers.image_couverture) corps.append('image_couverture', fichiers.image_couverture);
    return corps;
  }

  function extraireErreurFormulaire(error) {
    const details = error.response?.data;
    if (!details) return "L'enregistrement a échoué.";
    if (typeof details === 'string') return details;
    if (details.detail) return details.detail;
    const premiereCle = Object.keys(details)[0];
    const premiereValeur = details[premiereCle];
    const message = Array.isArray(premiereValeur) ? premiereValeur[0] : premiereValeur;
    return premiereCle ? `${premiereCle}: ${message}` : "L'enregistrement a échoué.";
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
        setMessageFormulaire('Prédication mise à jour avec succès.');
      } else {
        await api.post('/predications/', corps);
        setMessageFormulaire('Prédication créée avec succès.');
      }
      reinitialiserFormulaire();
      await rechargerResume();
    } catch (error) {
      setErreurFormulaire(extraireErreurFormulaire(error));
    } finally {
      setSoumission(false);
    }
  }

  async function handleSuppression(predication) {
    const confirme = typeof window === 'undefined' ? true : window.confirm(`Supprimer définitivement "${predication.titre}" ?`);
    if (!confirme) return;
    try {
      await api.delete(`/predications/${predication.id}/`);
      if (enEdition === predication.id) reinitialiserFormulaire();
      await rechargerResume();
    } catch (error) {
      setErreurStats(error.response?.data?.detail || 'La suppression a échoué.');
    }
  }

  if (erreurStats) {
    return (
      <div className="dashboard-intro" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <AlertCircle size={40} color="#dc2626" style={{ marginBottom: '1rem' }} />
        <h2>Une erreur est survenue</h2>
        <p style={{ color: '#b91c1c' }}>{erreurStats}</p>
      </div>
    );
  }

  if (chargementInitial || !stats) {
    return (
      <div className="dashboard-intro" style={{ padding: '5rem 2.5rem', textAlign: 'center' }}>
        <div className="sidebar-logo-icon" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Chargement de la bibliothèque...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Barre Latérale */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <BarChart3 size={20} className="sidebar-logo-icon" />
          <h2>Mon Espace</h2>
        </div>
        
        <nav className="sidebar-menu">
          <button
            type="button"
            className={`menu-item ${ongletActif === 'apercu' ? 'active' : ''}`}
            onClick={() => setOngletActif('apercu')}
          >
            <TrendingUp size={18} />
            <span>Vue d'ensemble</span>
          </button>
          
          <button
            type="button"
            className={`menu-item ${ongletActif === 'catalogue' ? 'active' : ''}`}
            onClick={() => setOngletActif('catalogue')}
          >
            <Mic2 size={18} />
            <span>Bibliothèque</span>
          </button>
          
          <button
            type="button"
            className={`menu-item ${ongletActif === 'publier' ? 'active' : ''}`}
            onClick={() => setOngletActif('publier')}
          >
            <Youtube size={18} />
            <span>{enEdition ? 'Modifier' : 'Ma chaîne'}</span>
          </button>
        </nav>
      </aside>

      {/* Zone d'affichage Principale */}
      <main className="dashboard-content">
        
        {/* Onglet 1 : VUE D'ENSEMBLE */}
        {ongletActif === 'apercu' ? (
          <div className="dashboard-tab-content">
            <div className="dashboard-intro">
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                <BarChart3 size={24} />
                Tableau de Bord
              </h1>
              <p style={{ color: 'var(--pd-muted)', margin: '0.5rem 0 0', lineHeight: 1.6 }}>
                Performance globale et rayonnement de vos messages au cours des 30 derniers jours.
              </p>
            </div>

            <div className="dashboard-kpis">
              <div className="dashboard-kpi">
                <p>Messages en Ligne</p>
                <strong>{stats.total_predications}</strong>
              </div>
              <div className="dashboard-kpi">
                <p>Auditeurs & Lectures</p>
                <strong>{stats.total_vues}</strong>
              </div>
              <div className="dashboard-kpi">
                <p>Téléchargements</p>
                <strong>{stats.total_telechargements}</strong>
              </div>
            </div>

            <div className="dashboard-section">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <TrendingUp size={20} className="sidebar-logo-icon" />
                Meilleures Écoutes
              </h2>
              {stats.meilleures_predications.length ? (
                <div className="premium-list">
                  {stats.meilleures_predications.map((predication) => (
                    <div key={predication.id} className="premium-list-item">
                      <div className="item-meta-left">
                        <div className="media-indicator">
                          {predication.type_media === 'VIDEO' ? <Film size={16} /> : <Mic2 size={16} />}
                        </div>
                        <div>
                          <span className="item-title">{predication.titre}</span>
                          <span className="item-subtitle">{predication.type_media}</span>
                        </div>
                      </div>
                      <div className="item-meta-right">
                        <span><strong>{predication.nombre_vues}</strong> écoutes</span>
                        <span><strong>{predication.nombre_telechargements}</strong> dl</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dashboard-empty">Aucun indicateur d'écoute enregistré.</p>
              )}
            </div>
          </div>
        ) : null}

        {/* Onglet 2 : CATALOGUE VIA DATATABLE */}
        {ongletActif === 'catalogue' ? (
          <div className="dashboard-tab-content">
            <div className="dashboard-section">
              <div className="dashboard-header-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0 }}>Gestion de la Bibliothèque</h2>
                  <p style={{ margin: '0.3rem 0 0', color: 'var(--pd-muted)', fontSize: '0.92rem' }}>
                    Recherchez, filtrez et gérez de façon centralisée l'historique de vos contenus.
                  </p>
                </div>
              </div>

              {/* Barre d'actions et filtres du Datatable */}
              <div className="datatable-filters-bar">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Filtrer par titre, description..." 
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                  />
                </div>
                <div className="filter-select-wrapper">
                  <select value={filtrePublication} onChange={(e) => setFiltrePublication(e.target.value)}>
                    <option value="tous">Tous les statuts</option>
                    <option value="publiees">Publiées uniquement</option>
                    <option value="brouillons">Brouillons uniquement</option>
                  </select>
                </div>
              </div>

              {/* Conteneur Responsif de la Table */}
              <div className="datatable-responsive">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Détails Prédication</th>
                      <th>Statut</th>
                      <th>Format</th>
                      <th>Portée</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predicationsPagination.length ? (
                      predicationsPagination.map((predication) => (
                        <tr key={predication.id} className="datatable-row">
                          <td className="cell-main-info">
                            <span className="table-row-title">{predication.titre}</span>
                            <p className="table-row-desc">{predication.description || 'Aucune description rédigée.'}</p>
                          </td>
                          <td>
                            <span className={`status-badge ${predication.est_planifiee ? 'scheduled' : predication.est_publie ? 'published' : 'draft'}`}>
                              {predication.est_planifiee ? 'Planifiée' : predication.est_publie ? 'Publiée' : 'Brouillon'}
                            </span>
                          </td>
                          <td>
                            <span className="media-type-tag">{predication.type_media}</span>
                          </td>
                          <td className="cell-stats">
                            <div className="stat-inline"><Eye size={13} /> {predication.nombre_vues} v</div>
                            <div className="stat-inline"><Download size={13} /> {predication.nombre_telechargements} dl</div>
                          </td>
                          <td>
                            <div className="table-actions-group">
                              <button type="button" className="action-btn" title="Modifier" onClick={() => commencerEdition(predication)}>
                                <PencilLine size={15} />
                              </button>
                              <button type="button" className={`action-btn ${commentairesOuverts === predication.id ? 'active' : ''}`} title="Commentaires" onClick={() => setCommentairesOuverts(commentairesOuverts === predication.id ? null : predication.id)}>
                                <MessageSquare size={15} />
                              </button>
                              <button type="button" className={`action-btn ${piecesOuvertes === predication.id ? 'active' : ''}`} title="Pièces Jointes" onClick={() => setPiecesOuvertes(piecesOuvertes === predication.id ? null : predication.id)}>
                                <Paperclip size={15} />
                              </button>
                              <button type="button" className="action-btn btn-danger" title="Supprimer" onClick={() => handleSuppression(predication)}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="table-empty-row">
                          Aucun enregistrement ne correspond à vos filtres actuels.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Contrôles de Pagination du Datatable */}
              <div className="datatable-footer-pagination">
                <span>
                  Affichage de {predicationsPagination.length} éléments sur {predicationsTraitees.length} trouvé(s)
                </span>
                <div className="pagination-controls">
                  <button 
                    disabled={pageActuelle === 1} 
                    onClick={() => setPageActuelle(p => p - 1)}
                    className="pagination-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="page-number">Page {pageActuelle} sur {totalPages}</span>
                  <button 
                    disabled={pageActuelle === totalPages} 
                    onClick={() => setPageActuelle(p => p + 1)}
                    className="pagination-btn"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Panneaux de sous-gestionnaires injectés dynamiquement */}
              {commentairesOuverts ? (
                <div className="nested-panel animate-slide-down">
                  <div className="nested-header"><h3>Modération des Commentaires</h3></div>
                  <ModerationCommentaires predicationId={commentairesOuverts} />
                </div>
              ) : null}
              {piecesOuvertes ? (
                <div className="nested-panel animate-slide-down">
                  <div className="nested-header"><h3>Documents et Pièces Annexes</h3></div>
                  <GestionPiecesJointes predicationId={piecesOuvertes} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Onglet 3 : SYNCHRONISATION CHAÎNE (par défaut) ou ÉDITION DES MÉTADONNÉES */}
        {ongletActif === 'publier' ? (
          <div className="dashboard-tab-content">
            {enEdition ? (
            <div className="dashboard-section">
              <div className="dashboard-header-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                    <PencilLine size={20} />
                    Modifier la Prédication
                  </h2>
                  <p style={{ margin: '0.3rem 0 0', color: 'var(--pd-muted)', fontSize: '0.92rem' }}>
                    {enEdition
                      ? 'Ajustez les métadonnées. Laissez les champs de fichiers vides pour conserver l\'audio ou la vidéo existante.'
                      : 'Collez un lien YouTube ou téléversez vos fichiers, puis configurez l\'indexation thématique de votre enseignement.'}
                  </p>
                </div>
                {enEdition ? (
                  <button type="button" className="btn-secondary" onClick={reinitialiserFormulaire}>
                    Annuler l'Édition
                  </button>
                ) : null}
              </div>

              <form className="dashboard-form" onSubmit={handleSoumission}>
                <div className="dashboard-grid-2">
                  <label className="dashboard-field">
                    <span>Titre de l'Enseignement</span>
                    <input
                      value={formulaire.titre}
                      onChange={(e) => mettreAJourChamp('titre', e.target.value)}
                      placeholder="Ex: Le bouclier de la foi"
                      required
                    />
                  </label>

                  <label className="dashboard-field">
                    <span>Format Requis</span>
                    <select value={formulaire.type_media} onChange={(e) => mettreAJourChamp('type_media', e.target.value)}>
                      <option value="AUDIO">Audio HD (Podcast)</option>
                      <option value="VIDEO">Vidéo Uniquement</option>
                      <option value="BOTH">Format Mixte (Audio + Vidéo)</option>
                    </select>
                  </label>
                </div>

                <label className="dashboard-field">
                  <span>Description & Références Textuelles</span>
                  <textarea
                    value={formulaire.description}
                    onChange={(e) => mettreAJourChamp('description', e.target.value)}
                    placeholder="Introduction, plan de la prédication, chapitres ou versets bibliques de référence..."
                  />
                </label>

                {/* Source du média — adaptée au format choisi (audio / vidéo YouTube ou fichier) */}
                {(formulaire.type_media === 'AUDIO' || formulaire.type_media === 'BOTH') ? (
                  <label className="dashboard-field">
                    <span>Fichier Audio <small className="champ-aide">(téléchargeable)</small></span>
                    <input
                      key={`audio-${resetFichiersKey}`}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => mettreAJourFichier('fichier_audio', e.target.files?.[0] || null)}
                    />
                  </label>
                ) : null}

                {(formulaire.type_media === 'VIDEO' || formulaire.type_media === 'BOTH') ? (
                  <div className="dashboard-grid-2">
                    <label className="dashboard-field">
                      <span>Lien YouTube de la vidéo</span>
                      <input
                        value={formulaire.url_video || ''}
                        onChange={(e) => mettreAJourChamp('url_video', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <small className="champ-aide">
                        Lecture intégrée sur la plateforme — formats acceptés : /watch, youtu.be, /shorts, /embed.
                      </small>
                    </label>

                    <label className="dashboard-field">
                      <span>Ou fichier vidéo <small className="champ-aide">(téléchargeable)</small></span>
                      <input
                        key={`video-${resetFichiersKey}`}
                        type="file"
                        accept="video/*"
                        onChange={(e) => mettreAJourFichier('fichier_video', e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                ) : null}

                <label className="dashboard-field">
                  <span>Image de Vignette (Cover)</span>
                  <input
                    key={`cover-${resetFichiersKey}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => mettreAJourFichier('image_couverture', e.target.files?.[0] || null)}
                  />
                </label>

                {(formulaire.type_media === 'VIDEO' || formulaire.type_media === 'BOTH') && formulaire.url_video && !fichiers.fichier_video ? (
                  <div className="info-banner-premium">
                    <CheckCircle2 size={15} />
                    <span>Diffusion via YouTube : la vidéo sera lue en intégré, mais ne sera pas téléchargeable. Ajoutez un fichier vidéo pour autoriser le téléchargement.</span>
                  </div>
                ) : null}

                <div className="dashboard-grid-2">
                  <label className="dashboard-field">
                    <span>Calibrage de la Durée (Secondes)</span>
                    <input
                      type="number"
                      min="0"
                      value={formulaire.duree_secondes}
                      onChange={(e) => mettreAJourChamp('duree_secondes', e.target.value)}
                    />
                  </label>

                  <label className="dashboard-field">
                    <span>Rattacher à une Série / Campagne</span>
                    <select value={formulaire.serie} onChange={(e) => mettreAJourChamp('serie', e.target.value)}>
                      <option value="">Aucune série attribuée</option>
                      {series.map((serie) => (
                        <option key={serie.id} value={serie.id}>{serie.titre}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="dashboard-field">
                  <span>Thématiques de Référencement</span>
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
                    )) : <span style={{ color: 'var(--pd-muted)' }}>Aucune thématique disponible pour le moment.</span>}
                  </div>
                </div>

                <div className="dashboard-grid-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                  <label className="dashboard-checkbox">
                    <input
                      type="checkbox"
                      checked={formulaire.est_publie}
                      onChange={(e) => mettreAJourChamp('est_publie', e.target.checked)}
                    />
                    {formulaire.est_publie ? 'Contenu visible publiquement sur la plateforme' : 'Enregistrer en tant que brouillon confidentiel'}
                  </label>

                  <label className="dashboard-field">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13}/> Programmer la Publication</span>
                    <input
                      type="datetime-local"
                      value={formulaire.date_publication}
                      onChange={(e) => mettreAJourChamp('date_publication', e.target.value)}
                    />
                  </label>
                </div>

                {formulaire.est_publie && formulaire.date_publication ? (
                  <div className="info-banner-premium">
                    <CheckCircle2 size={15} />
                    <span>Planification active : Ce message basculera automatiquement en mode public à la date indiquée.</span>
                  </div>
                ) : null}

                {erreurFormulaire ? <p className="dashboard-error">{erreurFormulaire}</p> : null}
                {messageFormulaire ? <p className="dashboard-status">{messageFormulaire}</p> : null}

                <div className="dashboard-inline">
                  <button className="btn-primary-premium" type="submit" disabled={soumission}>
                    {soumission ? 'Enregistrement…' : 'Sauvegarder les Modifications'}
                  </button>
                </div>
              </form>
            </div>
            ) : (
            <div className="dashboard-section">
              <div className="dashboard-header-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                    <Youtube size={20} />
                    Ma chaîne YouTube
                  </h2>
                  <p style={{ margin: '0.3rem 0 0', color: 'var(--pd-muted)', fontSize: '0.92rem' }}>
                    Renseignez le lien de votre chaîne : l'application importe automatiquement
                    toutes vos vidéos. Vous ne le faites qu'une fois — les nouvelles publications
                    sont ensuite synchronisées automatiquement.
                  </p>
                </div>
              </div>

              <div className="dashboard-form">
                <label className="dashboard-field">
                  <span>Lien de votre chaîne YouTube</span>
                  <input
                    value={lienChaine}
                    onChange={(e) => setLienChaine(e.target.value)}
                    placeholder="https://www.youtube.com/@votrechaine"
                  />
                  <small className="champ-aide">
                    Formats acceptés : /@identifiant, /channel/UC…, /user/nom.
                  </small>
                </label>

                <div className="info-banner-premium">
                  <CheckCircle2 size={15} />
                  <span>
                    Après l'import initial, une synchronisation automatique récupère régulièrement
                    vos nouvelles vidéos — aucune action manuelle nécessaire.
                  </span>
                </div>

                {syncErreur ? <p className="dashboard-error">{syncErreur}</p> : null}
                {syncMessage ? <p className="dashboard-status">{syncMessage}</p> : null}

                <div className="dashboard-inline">
                  <button
                    className="btn-primary-premium"
                    type="button"
                    onClick={handleSynchronisation}
                    disabled={syncEnCours}
                  >
                    {syncEnCours ? 'Démarrage de l\'import…' : 'Importer / synchroniser ma chaîne'}
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}