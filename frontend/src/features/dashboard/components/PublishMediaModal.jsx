import React, { useState } from 'react';
import { api } from '../../../services/api';
import { X, Upload, Youtube, Link as LinkIcon, FileAudio, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { extraireIdVideoYoutube, miniatureYoutube } from '../../../utils/youtube';
import { verifierFichier } from '../../../utils/fichiers';
import { extraireErreurServeur } from '../../../utils/erreurs';
import './PublishMediaModal.css';

// Mêmes limites que le champ audio de l'espace pasteur (PastorDashboard.jsx)
// et que le serializer serveur : ce formulaire n'appliquait jusqu'ici AUCUNE
// validation de fichier, contrairement aux trois autres formulaires d'upload
// de l'application — un fichier trop lourd n'était rejeté qu'après l'envoi.
const CONTRAINTE_AUDIO = {
  extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac'],
  tailleMaxMo: 100,
};

export function PublishMediaModal({ isOpen, onClose, pasteurId, onPublished }) {
  const { t } = useTranslation();

  // Mode: 'video' (ajout par lien ou fichier) ou 'youtube' (synchroniser chaîne)
  const [mode, setMode] = useState('video');

  // Form pour l'ajout de vidéo
  const [form, setForm] = useState({
    titre: '',
    description: '',
    type_media: 'VIDEO',
    url_video: '',
    nom_predicateur: '',
    est_publie: true,
  });
  const [file, setFile] = useState(null);
  const [erreurFichier, setErreurFichier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form pour la synchro YouTube
  const [lienChaine, setLienChaine] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Un fichier audio choisi en type "Audio" puis conserve apres passage a
    // "Video" aurait ete envoye quand meme (body l'ajoute des que file existe),
    // sans lien avec le format finalement choisi.
    if (name === 'type_media' && value === 'VIDEO') {
      setFile(null);
      setErreurFichier('');
    }
  };

  const choisirAudio = (fichierChoisi) => {
    if (!fichierChoisi) {
      setFile(null);
      setErreurFichier('');
      return;
    }
    const erreur = verifierFichier(fichierChoisi, CONTRAINTE_AUDIO);
    if (erreur) {
      setErreurFichier(erreur);
      setFile(null);
      return;
    }
    setErreurFichier('');
    setFile(fichierChoisi);
  };

  const resetForm = () => {
    setForm({ titre: '', description: '', type_media: 'VIDEO', url_video: '', nom_predicateur: '', est_publie: true });
    setFile(null);
    setErreurFichier('');
    setError('');
    setSuccess('');
    setLienChaine('');
    setSyncError('');
    setSyncSuccess('');
  };

  const handleClose = () => {
    resetForm();
    setMode('video');
    onClose();
  };

  // Publier une vidéo (toujours par lien YouTube — la plateforme n'héberge
  // plus de fichier vidéo) et/ou un fichier audio.
  const veutAudio = form.type_media === 'AUDIO' || form.type_media === 'BOTH';
  const veutVideo = form.type_media === 'VIDEO' || form.type_media === 'BOTH';
  const idVideoDetecte = extraireIdVideoYoutube(form.url_video);
  const lienVideoNonReconnu = veutVideo && Boolean(form.url_video.trim()) && !idVideoDetecte;

  const handleSubmitVideo = async (e) => {
    e.preventDefault();
    if (!pasteurId) return;
    setError('');
    setSuccess('');

    if (erreurFichier) {
      setError(erreurFichier);
      return;
    }
    if (veutAudio && !file) {
      setError("Ajoutez le fichier audio correspondant au format choisi.");
      return;
    }
    if (veutVideo && !form.url_video.trim()) {
      setError("Collez le lien YouTube de la vidéo. Elle doit d'abord être publiée sur la chaîne YouTube du pasteur.");
      return;
    }
    if (veutVideo && !idVideoDetecte) {
      setError("Lien YouTube non reconnu. Formats acceptés : /watch?v=…, youtu.be/…, /embed/… ou /shorts/…");
      return;
    }

    setLoading(true);

    try {
      let body;
      if (file) {
        body = new FormData();
        body.append('titre', form.titre);
        body.append('description', form.description || '');
        body.append('type_media', form.type_media);
        if (form.url_video) body.append('url_video', form.url_video);
        if (form.nom_predicateur) body.append('nom_predicateur', form.nom_predicateur);
        body.append('est_publie', form.est_publie ? 'true' : 'false');
        body.append('fichier_audio', file);
        body.append('pasteur_id', pasteurId);
      } else {
        body = {
          titre: form.titre,
          description: form.description || '',
          type_media: form.type_media,
          url_video: form.url_video,
          nom_predicateur: form.nom_predicateur || null,
          est_publie: form.est_publie,
          pasteur_id: pasteurId,
        };
      }

      await api.post('/predications/', body, file ? {
        headers: { 'Content-Type': 'multipart/form-data' },
      } : undefined);

      setSuccess('Vidéo publiée avec succès !');
      setTimeout(() => {
        resetForm();
        onPublished();
        onClose();
      }, 1500);
    } catch (err) {
      setError(extraireErreurServeur(err, { repli: 'Erreur lors de la publication.', tousLesChamps: true }));
    } finally {
      setLoading(false);
    }
  };

  // Synchroniser la chaîne YouTube du pasteur
  const handleSyncYoutube = async (e) => {
    e.preventDefault();
    if (!pasteurId) return;
    setSyncLoading(true);
    setSyncError('');
    setSyncSuccess('');

    if (!lienChaine.trim()) {
      setSyncError('Le lien de la chaîne YouTube est requis.');
      setSyncLoading(false);
      return;
    }

    try {
      const { data } = await api.post(`/pasteurs/${pasteurId}/admin_synchroniser_youtube/`, {
        lien_youtube: lienChaine.trim(),
      });
      setSyncSuccess(data.detail || 'Import démarré avec succès !');
      setTimeout(() => {
        onPublished();
      }, 2000);
    } catch (err) {
      const detail = err.response?.data;
      setSyncError(detail?.lien_youtube || detail?.detail || 'Erreur lors de la synchronisation.');
    } finally {
      setSyncLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pmmodal-overlay" onClick={handleClose}>
      <div className="pmmodal-content" onClick={(e) => e.stopPropagation()}>
        <button className="pmmodal-close" onClick={handleClose} type="button">
          <X size={20} />
        </button>

        <div className="pmmodal-header">
          <div className="pmmodal-icon">
            <Upload size={24} />
          </div>
          <h3>{t('admin.publish_media', 'Publier un média')}</h3>
        </div>

        {/* Onglets : Vidéo / Synchroniser YouTube */}
        <div className="pmmodal-tabs">
          <button
            type="button"
            className={`pmmodal-tab ${mode === 'video' ? 'active' : ''}`}
            onClick={() => { setMode('video'); setError(''); setSuccess(''); }}
          >
            <LinkIcon size={16} />
            Ajouter une vidéo
          </button>
          <button
            type="button"
            className={`pmmodal-tab ${mode === 'youtube' ? 'active' : ''}`}
            onClick={() => { setMode('youtube'); setSyncError(''); setSyncSuccess(''); }}
          >
            <Youtube size={16} />
            Synchroniser YouTube
          </button>
        </div>

        {/* Mode : Ajouter une vidéo par lien ou fichier */}
        {mode === 'video' && (
          <form className="pmmodal-form" onSubmit={handleSubmitVideo}>
            <div className="pmmodal-field">
              <label htmlFor="pm-titre">Titre *</label>
              <input id="pm-titre" name="titre" value={form.titre} onChange={handleChange} required />
            </div>
            <div className="pmmodal-field">
              <label htmlFor="pm-description">Description</label>
              <textarea id="pm-description" name="description" value={form.description} onChange={handleChange} rows={3} />
            </div>

            <div className="pmmodal-row-inline">
              <div className="pmmodal-field" style={{ flex: 1 }}>
                <label htmlFor="pm-predicateur">Prédicateur</label>
                <input id="pm-predicateur" name="nom_predicateur" value={form.nom_predicateur} onChange={handleChange} placeholder="Nom du prédicateur (optionnel)" />
              </div>
              <div className="pmmodal-field" style={{ flex: 1 }}>
                <label htmlFor="pm-type">Type de média</label>
                <select id="pm-type" name="type_media" value={form.type_media} onChange={handleChange}>
                  <option value="VIDEO">Vidéo</option>
                  <option value="AUDIO">Audio</option>
                  <option value="BOTH">Les deux</option>
                </select>
              </div>
            </div>

            {veutVideo && (
              <>
                {/* La plateforme n'héberge pas de fichier vidéo : la vidéo est
                    diffusée depuis YouTube, jamais téléversée ici. */}
                <div className="pmmodal-youtube-info" style={{ background: 'rgba(var(--primary-rgb), 0.08)', borderColor: 'rgba(var(--primary-rgb), 0.3)', color: 'var(--primary)' }}>
                  <Youtube size={24} />
                  <p style={{ color: 'var(--text-muted)' }}>
                    La vidéo doit d'abord être publiée sur la chaîne YouTube du pasteur. Collez ensuite son lien ci-dessous.
                  </p>
                </div>

                <div className="pmmodal-field">
                  <label htmlFor="pm-url">
                    <Youtube size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Lien YouTube de la vidéo *
                  </label>
                  <input
                    id="pm-url"
                    name="url_video"
                    value={form.url_video}
                    onChange={handleChange}
                    placeholder="https://www.youtube.com/watch?v=..."
                    aria-invalid={lienVideoNonReconnu}
                  />
                  <small className="pmmodal-help">Formats acceptés : /watch?v=…, youtu.be/…, /embed/…, /shorts/…</small>
                  {lienVideoNonReconnu && (
                    <small className="pmmodal-error" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> Lien YouTube non reconnu.
                    </small>
                  )}
                  {idVideoDetecte && (
                    <img
                      src={miniatureYoutube(idVideoDetecte)}
                      alt=""
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{ marginTop: '0.4rem', width: '160px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                  )}
                </div>
              </>
            )}

            {veutAudio && (
              <div className="pmmodal-field">
                <label>
                  <FileAudio size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Fichier audio {veutVideo ? '' : '*'}
                </label>
                <input type="file" accept="audio/*" onChange={(e) => choisirAudio(e.target.files[0] || null)} />
                <small className="pmmodal-help">Formats supportés : MP3, WAV, M4A, AAC, OGG, FLAC — 100 Mo maximum.</small>
                {erreurFichier && (
                  <small className="pmmodal-error" role="alert">{erreurFichier}</small>
                )}
              </div>
            )}

            {error && <div className="pmmodal-error">{error}</div>}
            {success && <div className="pmmodal-success">{success}</div>}

            <div className="pmmodal-footer">
              <button type="button" className="pmmodal-btn pmmodal-btn-cancel" onClick={handleClose}>
                Annuler
              </button>
              <button type="submit" className="pmmodal-btn pmmodal-btn-confirm" disabled={loading}>
                {loading ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </form>
        )}

        {/* Mode : Synchroniser la chaîne YouTube */}
        {mode === 'youtube' && (
          <form className="pmmodal-form" onSubmit={handleSyncYoutube}>
            <div className="pmmodal-youtube-info">
              <Youtube size={32} />
              <div>
                <h4>Importer depuis YouTube</h4>
                <p>Entrez le lien de la chaîne YouTube du pasteur. Toutes les vidéos publiques seront automatiquement importées et associées à son profil.</p>
              </div>
            </div>

            <div className="pmmodal-field">
              <label htmlFor="pm-chaine">Lien de la chaîne YouTube *</label>
              <input
                id="pm-chaine"
                value={lienChaine}
                onChange={(e) => setLienChaine(e.target.value)}
                placeholder="https://www.youtube.com/@nomchaine"
                required
              />
              <small className="pmmodal-help">
                Formats acceptés : youtube.com/@nom, youtube.com/channel/ID, youtube.com/c/nom
              </small>
            </div>

            {syncError && <div className="pmmodal-error">{syncError}</div>}
            {syncSuccess && <div className="pmmodal-success">{syncSuccess}</div>}

            <div className="pmmodal-footer">
              <button type="button" className="pmmodal-btn pmmodal-btn-cancel" onClick={handleClose}>
                Annuler
              </button>
              <button type="submit" className="pmmodal-btn pmmodal-btn-youtube" disabled={syncLoading}>
                <Youtube size={16} />
                {syncLoading ? 'Synchronisation...' : 'Synchroniser'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
