import { useEffect, useState } from 'react';
import { BarChart3, Download, Headphones, MessageSquare, Mic2, Paperclip, PencilLine, PlusCircle, Trash2, TrendingUp } from 'lucide-react';
import { api, extraireListe } from '../services/api';
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
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (valeur) => String(valeur).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [filtrePublication, setFiltrePublication] = useState('tous');
  const [enEdition, setEnEdition] = useState(null);
  const [commentairesOuverts, setCommentairesOuverts] = useState(null);
  const [piecesOuvertes, setPiecesOuvertes] = useState(null);
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [fichiers, setFichiers] = useState(FICHIERS_VIDES);
  const [resetFichiersKey, setResetFichiersKey] = useState(0);

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
    return () => {
      active = false;
    };
  }, []);

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
    const aDesFichiers = Boolean(
      fichiers.fichier_audio || fichiers.fichier_video || fichiers.image_couverture
    );

    if (!aDesFichiers) {
      const corpsJson = {
        ...formulaire,
        duree_secondes: Number(formulaire.duree_secondes) || 0,
        serie: formulaire.serie || null,
        date_publication: formulaire.date_publication || null,
      };
      if (!corpsJson.url_video) {
        delete corpsJson.url_video;
      }
      return corpsJson;
    }

    const corps = new FormData();
    corps.append('titre', formulaire.titre);
    corps.append('description', formulaire.description || '');
    corps.append('type_media', formulaire.type_media);
    if (formulaire.url_video) {
      corps.append('url_video', formulaire.url_video);
    }
    corps.append('duree_secondes', Number(formulaire.duree_secondes) || 0);
    corps.append('est_publie', formulaire.est_publie ? 'true' : 'false');
    if (formulaire.date_publication) {
      corps.append('date_publication', formulaire.date_publication);
    }
    if (formulaire.serie) {
      corps.append('serie', formulaire.serie);
    }
    formulaire.categories_ids.forEach((id) => corps.append('categories_ids', id));
    if (fichiers.fichier_audio) {
      corps.append('fichier_audio', fichiers.fichier_audio);
    }
    if (fichiers.fichier_video) {
      corps.append('fichier_video', fichiers.fichier_video);
    }
    if (fichiers.image_couverture) {
      corps.append('image_couverture', fichiers.image_couverture);
    }
    return corps;
  }

  function extraireErreurFormulaire(error) {
    const details = error.response?.data;
    if (!details) {
      return "L'enregistrement de la predication a echoue.";
    }
    if (typeof details === 'string') {
      return details;
    }
    if (details.detail) {
      return details.detail;
    }
    const premiereCle = Object.keys(details)[0];
    const premiereValeur = details[premiereCle];
    const message = Array.isArray(premiereValeur) ? premiereValeur[0] : premiereValeur;
    return premiereCle ? `${premiereCle}: ${message}` : "L'enregistrement de la predication a echoue.";
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
        setMessageFormulaire('Predication mise a jour avec succes.');
      } else {
        await api.post('/predications/', corps);
        setMessageFormulaire('Predication creee avec succes.');
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
    const confirme = typeof window === 'undefined'
      ? true
      : window.confirm(`Supprimer definitivement "${predication.titre}" ?`);
    if (!confirme) {
      return;
    }
    try {
      await api.delete(`/predications/${predication.id}/`);
      if (enEdition === predication.id) {
        reinitialiserFormulaire();
      }
      await rechargerResume();
    } catch (error) {
      setErreurStats(error.response?.data?.detail || 'La suppression a echoue.');
    }
  }

  const predicationsFiltrees = predications.filter((predication) => {
    if (filtrePublication === 'publiees') {
      return predication.est_publie;
    }
    if (filtrePublication === 'brouillons') {
      return !predication.est_publie;
    }
    return true;
  });

  if (erreurStats) {
    return (
      <section className="glass-card" style={{ padding: '1.25rem', maxWidth: 760 }}>
        <h1 style={{ marginTop: 0 }}>Mon espace</h1>
        <p style={{ color: '#ffb1b1' }}>{erreurStats}</p>
      </section>
    );
  }

  if (chargementInitial || !stats) {
    return (
      <section className="glass-card" style={{ padding: '1.25rem', maxWidth: 760 }}>
        <h1 style={{ marginTop: 0 }}>Mon espace</h1>
        <p style={{ color: '#bbb' }}>Chargement des statistiques...</p>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="glass-card dashboard-intro">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 0 }}>
          <BarChart3 size={24} />
          Mon espace
        </h1>
        <p style={{ color: '#bbb', lineHeight: 1.6 }}>
          Voici les indicateurs essentiels de vos predications sur les 30 derniers jours.
        </p>
      </div>

      <div className="dashboard-kpis">
        <div className="glass-card dashboard-kpi">
          <Mic2 size={18} />
          <p>Predications</p>
          <strong>{stats.total_predications}</strong>
        </div>
        <div className="glass-card dashboard-kpi">
          <Headphones size={18} />
          <p>Vues et lectures</p>
          <strong>{stats.total_vues}</strong>
        </div>
        <div className="glass-card dashboard-kpi">
          <Download size={18} />
          <p>Telechargements</p>
          <strong>{stats.total_telechargements}</strong>
        </div>
      </div>

      <div className="glass-card dashboard-section">
        <div className="dashboard-header-row">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <PlusCircle size={20} />
              {enEdition ? 'Modifier la predication' : 'Nouvelle predication'}
            </h2>
            <p style={{ marginTop: 0, color: '#bbb' }}>
              {enEdition
                ? 'Modifiez les informations puis enregistrez. Laissez un champ fichier vide pour conserver le media actuel.'
                : 'Creez une predication et televersez vos fichiers audio, video et image de couverture.'}
            </p>
          </div>
          {enEdition ? (
            <button type="button" className="btn app-ghost-button" onClick={reinitialiserFormulaire}>
              Annuler la modification
            </button>
          ) : null}
        </div>

        <form className="dashboard-form" onSubmit={handleSoumission}>
          <div className="dashboard-grid-2">
            <label className="dashboard-field">
              <span>Titre</span>
              <input
                value={formulaire.titre}
                onChange={(event) => mettreAJourChamp('titre', event.target.value)}
                placeholder="Ex: Marcher dans la foi"
                required
              />
            </label>

            <label className="dashboard-field">
              <span>Type de media</span>
              <select
                value={formulaire.type_media}
                onChange={(event) => mettreAJourChamp('type_media', event.target.value)}
              >
                <option value="AUDIO">Audio</option>
                <option value="VIDEO">Video</option>
                <option value="BOTH">Audio + Video</option>
              </select>
            </label>
          </div>

          <label className="dashboard-field">
            <span>Description</span>
            <textarea
              value={formulaire.description}
              onChange={(event) => mettreAJourChamp('description', event.target.value)}
              placeholder="Resume, contexte, reference biblique..."
            />
          </label>

          <div className="dashboard-grid-2">
            <label className="dashboard-field">
              <span>Fichier audio</span>
              <input
                key={`audio-${resetFichiersKey}`}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                onChange={(event) => mettreAJourFichier('fichier_audio', event.target.files?.[0] || null)}
              />
            </label>

            <label className="dashboard-field">
              <span>Fichier video</span>
              <input
                key={`video-${resetFichiersKey}`}
                type="file"
                accept="video/*,.mp4,.webm,.mov,.m4v,.mkv"
                onChange={(event) => mettreAJourFichier('fichier_video', event.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="dashboard-grid-2">
            <label className="dashboard-field">
              <span>Image de couverture</span>
              <input
                key={`cover-${resetFichiersKey}`}
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
                onChange={(event) => mettreAJourFichier('image_couverture', event.target.files?.[0] || null)}
              />
            </label>

            <label className="dashboard-field">
              <span>Lien video externe (optionnel)</span>
              <input
                value={formulaire.url_video || ''}
                onChange={(event) => mettreAJourChamp('url_video', event.target.value)}
                placeholder="https://youtube.com/..."
              />
            </label>
          </div>

          <div className="dashboard-grid-2">
            <label className="dashboard-field">
              <span>Duree en secondes</span>
              <input
                type="number"
                min="0"
                value={formulaire.duree_secondes}
                onChange={(event) => mettreAJourChamp('duree_secondes', event.target.value)}
              />
            </label>

            <label className="dashboard-field">
              <span>Serie</span>
              <select
                value={formulaire.serie}
                onChange={(event) => mettreAJourChamp('serie', event.target.value)}
              >
                <option value="">Aucune serie</option>
                {series.map((serie) => (
                  <option key={serie.id} value={serie.id}>{serie.titre}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="dashboard-field">
            <span>Categories</span>
            <div className="dashboard-inline">
              {categories.length ? categories.map((categorie) => (
                <label key={categorie.id} className="dashboard-checkbox">
                  <input
                    type="checkbox"
                    checked={formulaire.categories_ids.includes(categorie.id)}
                    onChange={() => basculerCategorie(categorie.id)}
                  />
                  {categorie.nom}
                </label>
              )) : <span style={{ color: '#bbb' }}>Aucune categorie disponible.</span>}
            </div>
          </div>

          <div className="dashboard-grid-2">
            <label className="dashboard-checkbox">
              <input
                type="checkbox"
                checked={formulaire.est_publie}
                onChange={(event) => mettreAJourChamp('est_publie', event.target.checked)}
              />
              {formulaire.est_publie ? 'Publiee (visible publiquement)' : 'Brouillon (non visible)'}
            </label>

            <label className="dashboard-field">
              <span>Publication planifiee (optionnel)</span>
              <input
                type="datetime-local"
                value={formulaire.date_publication}
                onChange={(event) => mettreAJourChamp('date_publication', event.target.value)}
              />
            </label>
          </div>
          {formulaire.est_publie && formulaire.date_publication ? (
            <p className="dashboard-status">
              Cette predication deviendra publique a la date indiquee.
            </p>
          ) : null}

          {erreurFormulaire ? <p className="dashboard-error">{erreurFormulaire}</p> : null}
          {messageFormulaire ? <p className="dashboard-status">{messageFormulaire}</p> : null}

          <div className="dashboard-inline">
            <button className="btn btn-primary" type="submit" disabled={soumission}>
              {soumission
                ? 'Enregistrement...'
                : enEdition ? 'Enregistrer les modifications' : 'Creer la predication'}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card dashboard-section">
        <div className="dashboard-header-row">
          <div>
            <h2 style={{ marginBottom: '0.4rem' }}>Catalogue du pasteur</h2>
            <p style={{ marginTop: 0, color: '#bbb' }}>
              Retrouvez vos predications, leur statut et leurs performances.
            </p>
          </div>
          <label className="dashboard-field" style={{ minWidth: 220 }}>
            <span>Filtrer</span>
            <select value={filtrePublication} onChange={(event) => setFiltrePublication(event.target.value)}>
              <option value="tous">Toutes</option>
              <option value="publiees">Publiees</option>
              <option value="brouillons">Brouillons</option>
            </select>
          </label>
        </div>

        {predicationsFiltrees.length ? (
          <div className="dashboard-list">
            {predicationsFiltrees.map((predication) => (
              <article key={predication.id} className="dashboard-card">
                <div className="dashboard-card-top">
                  <div>
                    <strong>{predication.titre}</strong>
                    <p style={{ margin: '0.4rem 0 0', color: '#bbb' }}>
                      {predication.description || 'Aucune description pour le moment.'}
                    </p>
                  </div>
                  <span className="dashboard-chip">
                    {predication.est_planifiee
                      ? 'Planifiee'
                      : predication.est_publie ? 'Publiee' : 'Brouillon'}
                  </span>
                </div>
                <div className="dashboard-meta">
                  <span>{predication.type_media}</span>
                  <span>{predication.duree_secondes}s</span>
                  <span>{predication.nombre_vues} vues</span>
                  <span>{predication.nombre_telechargements} telechargements</span>
                  {predication.fichier_audio ? <span>audio</span> : null}
                  {predication.fichier_video ? <span>video</span> : null}
                </div>
                <div className="dashboard-card-actions">
                  <button
                    type="button"
                    className="btn app-ghost-button"
                    onClick={() => commencerEdition(predication)}
                  >
                    <PencilLine size={15} />
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="btn app-ghost-button"
                    onClick={() => setCommentairesOuverts(
                      (actuel) => (actuel === predication.id ? null : predication.id)
                    )}
                  >
                    <MessageSquare size={15} />
                    Commentaires
                  </button>
                  <button
                    type="button"
                    className="btn app-ghost-button"
                    onClick={() => setPiecesOuvertes(
                      (actuel) => (actuel === predication.id ? null : predication.id)
                    )}
                  >
                    <Paperclip size={15} />
                    Pieces jointes
                  </button>
                  <button
                    type="button"
                    className="btn dashboard-danger-button"
                    onClick={() => handleSuppression(predication)}
                  >
                    <Trash2 size={15} />
                    Supprimer
                  </button>
                </div>
                {commentairesOuverts === predication.id ? (
                  <ModerationCommentaires predicationId={predication.id} />
                ) : null}
                {piecesOuvertes === predication.id ? (
                  <GestionPiecesJointes predicationId={predication.id} />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="dashboard-empty">Aucune predication pour ce filtre.</p>
        )}
      </div>

      <div className="glass-card dashboard-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 0 }}>
          <TrendingUp size={20} />
          Meilleures predications
        </h2>
        {stats.meilleures_predications.length ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {stats.meilleures_predications.map((predication) => (
              <div
                key={predication.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.9rem 0',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <strong>{predication.titre}</strong>
                  <p style={{ margin: '0.35rem 0 0', color: '#bbb' }}>{predication.type_media}</p>
                </div>
                <div style={{ textAlign: 'right', color: '#ddd' }}>
                  <div>{predication.nombre_vues} vues</div>
                  <div>{predication.nombre_telechargements} telechargements</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#bbb' }}>Aucune predication disponible pour le moment.</p>
        )}
      </div>
    </section>
  );
}
