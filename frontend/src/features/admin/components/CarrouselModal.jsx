import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Image as ImageIcon, Film, Save } from 'lucide-react';
import { Button } from '../../../components/Button';
import './CarrouselModal.css';

const CarrouselModal = ({ isOpen, onClose, onSave, mediaToEdit = null }) => {
  const { t } = useTranslation();
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [typeMedia, setTypeMedia] = useState('IMAGE');
  const [fichier, setFichier] = useState(null);
  const [fichierPreview, setFichierPreview] = useState(null);
  const [urlVideo, setUrlVideo] = useState('');
  const [estActif, setEstActif] = useState(true);
  const [ordre, setOrdre] = useState(0);

  useEffect(() => {
    if (mediaToEdit) {
      setTitre(mediaToEdit.titre || '');
      setDescription(mediaToEdit.description || '');
      setTypeMedia(mediaToEdit.type_media || 'IMAGE');
      setEstActif(mediaToEdit.est_actif !== undefined ? mediaToEdit.est_actif : true);
      setOrdre(mediaToEdit.ordre || 0);
      setFichierPreview(mediaToEdit.fichier);
      setUrlVideo(mediaToEdit.url_video || '');
      setFichier(null);
    } else {
      setTitre('');
      setDescription('');
      setTypeMedia('IMAGE');
      setFichier(null);
      setFichierPreview(null);
      setUrlVideo('');
      setEstActif(true);
      setOrdre(0);
    }
  }, [mediaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFichier(file);
      setFichierPreview(URL.createObjectURL(file));
      // Détection automatique du type
      if (file.type.startsWith('video/')) {
        setTypeMedia('VIDEO');
      } else {
        setTypeMedia('IMAGE');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (titre) formData.append('titre', titre);
    if (description) formData.append('description', description);
    formData.append('type_media', typeMedia);
    formData.append('est_actif', estActif);
    formData.append('ordre', ordre);
    
    if (typeMedia === 'IMAGE' && fichier) {
      formData.append('fichier', fichier);
    } else if (typeMedia === 'VIDEO' && urlVideo) {
      formData.append('url_video', urlVideo);
    }

    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content carrousel-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mediaToEdit ? "Modifier le média" : "Ajouter un média au carrousel"}</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body carrousel-form">
          <div className="form-group">
            <label>Type de média</label>
            <div className="type-media-toggles">
              <button 
                type="button" 
                className={`type-toggle ${typeMedia === 'IMAGE' ? 'active' : ''}`}
                onClick={() => setTypeMedia('IMAGE')}
              >
                <ImageIcon size={18} /> Image
              </button>
              <button 
                type="button" 
                className={`type-toggle ${typeMedia === 'VIDEO' ? 'active' : ''}`}
                onClick={() => setTypeMedia('VIDEO')}
              >
                <Film size={18} /> Vidéo
              </button>
            </div>
          </div>

          <div className="form-group">
            {typeMedia === 'IMAGE' ? (
              <>
                <label>Fichier Image {!mediaToEdit && <span className="required">*</span>}</label>
                <div className="file-upload-container">
                  <input 
                    type="file" 
                    id="fichier-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="fichier-upload" className="file-upload-btn">
                    <Upload size={20} />
                    <span>{fichier ? fichier.name : "Choisir une image..."}</span>
                  </label>
                </div>
                {fichierPreview && (
                  <div className="media-preview-container">
                    <img src={fichierPreview} alt="Aperçu" className="media-preview" />
                  </div>
                )}
              </>
            ) : (
              <>
                <label htmlFor="url_video">Lien YouTube <span className="required">*</span></label>
                <input
                  type="url"
                  id="url_video"
                  value={urlVideo}
                  onChange={(e) => setUrlVideo(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required={typeMedia === 'VIDEO'}
                />
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="titre">Titre (optionnel)</label>
            <input
              type="text"
              id="titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Texte affiché sur le média"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (optionnelle)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sous-texte affiché sur le média"
              rows={2}
            />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="ordre">Ordre d'affichage</label>
              <input
                type="number"
                id="ordre"
                value={ordre}
                onChange={(e) => setOrdre(parseInt(e.target.value, 10))}
                min="0"
              />
              <small className="help-text">Les médias avec un ordre plus petit s'afficheront en premier.</small>
            </div>
            
            <div className="form-group checkbox-group" style={{ flex: 1, marginTop: '2rem' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={estActif}
                  onChange={(e) => setEstActif(e.target.checked)}
                />
                <span className="checkmark"></span>
                Actif (Affiché)
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" disabled={!mediaToEdit && (typeMedia === 'IMAGE' ? !fichier : !urlVideo)}>
              <Save size={18} style={{ marginRight: '8px' }} />
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CarrouselModal;
