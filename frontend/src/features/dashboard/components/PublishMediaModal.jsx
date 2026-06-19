import React, { useState } from 'react';
import { api } from '../../../services/api';
import { X, Upload, Youtube, Link as LinkIcon, FileVideo } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './PublishMediaModal.css';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form pour la synchro YouTube
  const [lienChaine, setLienChaine] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({ titre: '', description: '', type_media: 'VIDEO', url_video: '', nom_predicateur: '', est_publie: true });
    setFile(null);
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

  // Publier une vidéo (par lien YouTube ou fichier)
  const handleSubmitVideo = async (e) => {
    e.preventDefault();
    if (!pasteurId) return;
    setLoading(true);
    setError('');
    setSuccess('');

    const hasFile = Boolean(file);

    if (!hasFile && !form.url_video) {
      setError('Veuillez fournir un lien YouTube ou un fichier vidéo.');
      setLoading(false);
      return;
    }

    try {
      let body;
      if (hasFile) {
        body = new FormData();
        body.append('titre', form.titre);
        body.append('description', form.description || '');
        body.append('type_media', form.type_media);
        if (form.url_video) body.append('url_video', form.url_video);
        if (form.nom_predicateur) body.append('nom_predicateur', form.nom_predicateur);
        body.append('est_publie', form.est_publie ? 'true' : 'false');
        body.append('fichier_video', file);
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

      await api.post('/predications/', body, hasFile ? {
        headers: { 'Content-Type': 'multipart/form-data' },
      } : undefined);

      setSuccess('Vidéo publiée avec succès !');
      setTimeout(() => {
        resetForm();
        onPublished();
        onClose();
      }, 1500);
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (detail?.detail) {
        setError(detail.detail);
      } else if (typeof detail === 'object') {
        const messages = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(messages.join(' | '));
      } else {
        setError('Erreur lors de la publication.');
      }
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

            <div className="pmmodal-field">
              <label htmlFor="pm-url">
                <Youtube size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Lien YouTube (ou autre URL vidéo)
              </label>
              <input
                id="pm-url"
                name="url_video"
                value={form.url_video}
                onChange={handleChange}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <small className="pmmodal-help">Collez un lien YouTube ou Vimeo pour l'intégrer directement.</small>
            </div>

            <div className="pmmodal-separator">
              <span>ou</span>
            </div>

            <div className="pmmodal-field">
              <label>
                <FileVideo size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Fichier vidéo
              </label>
              <input type="file" accept="video/*,audio/*" onChange={(e) => setFile(e.target.files[0])} />
              <small className="pmmodal-help">Formats supportés : MP4, WebM, MOV, MP3, WAV, etc.</small>
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
