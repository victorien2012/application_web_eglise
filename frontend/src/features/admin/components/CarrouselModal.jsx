import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Image as ImageIcon, Film, Save } from 'lucide-react';
import { Button } from '../../../components/Button';
import { verifierFichier } from '../../../utils/fichiers';
import './CarrouselModal.css';

const EXTENSIONS_IMAGE = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
const TAILLE_MAX_MO = 5;
const LIMITE_TITRE = 255;

// Regex identique à celle de HomeCarousel.jsx : c'est ce composant qui affiche
// le média sur la page d'accueil. S'il extrayait un identifiant différent (ou
// aucun), l'aperçu montré ici mentirait sur ce que verront les visiteurs — or
// quand HomeCarousel ne trouve pas d'identifiant, la diapositive reste
// silencieusement vide.
function extraireIdYoutube(url) {
  if (!url) return null;
  const correspondance = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (correspondance && correspondance[2].length === 11) ? correspondance[2] : null;
}

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
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const apercuLocal = useRef(null);

  // Libère la dernière URL objet créée si le composant se démonte pendant
  // qu'un fichier est en cours de prévisualisation (fermeture de la modale
  // en cours d'édition, navigation ailleurs).
  useEffect(() => () => {
    if (apercuLocal.current) URL.revokeObjectURL(apercuLocal.current);
  }, []);

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
    if (!file) return;

    // Le carrousel s'affiche en page d'accueil : refuser ici ce que le serveur
    // refusera de toute facon evite un envoi inutile et un message obscur.
    const messageErreur = verifierFichier(file, { extensions: EXTENSIONS_IMAGE, tailleMaxMo: TAILLE_MAX_MO });
    if (messageErreur) {
      setErreur(messageErreur);
      e.target.value = '';
      return;
    }

    setErreur('');
    setFichier(file);
    if (apercuLocal.current) URL.revokeObjectURL(apercuLocal.current);
    apercuLocal.current = URL.createObjectURL(file);
    setFichierPreview(apercuLocal.current);
    setTypeMedia('IMAGE');
  };

  // Un identifiant extrait ici avec succès garantit que HomeCarousel pourra
  // afficher la diapositive : sans ce contrôle, un lien mal formé (page
  // d'accueil YouTube, playlist, lien copié tronqué...) passait la validation
  // du serveur — une simple URLField, sans lien avec YouTube — et produisait
  // une diapositive vide et silencieuse sur la page d'accueil.
  const idYoutube = typeMedia === 'VIDEO' ? extraireIdYoutube(urlVideo) : null;
  const urlVideoInvalide = typeMedia === 'VIDEO' && urlVideo.trim() !== '' && !idYoutube;

  // Une image reste valide en édition même sans nouveau fichier : celle déjà
  // enregistrée sera conservée. Calculé à chaque rendu plutôt que figé à
  // l'ouverture, pour rester juste si l'admin bascule le type en cours de
  // saisie.
  const aImageValide = Boolean(fichier) || (typeMedia === 'IMAGE' && Boolean(fichierPreview));
  const peutEnregistrer = typeMedia === 'IMAGE' ? aImageValide : Boolean(idYoutube);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enCours || !peutEnregistrer) return;

    const titreNettoye = titre.trim();
    const descriptionNettoyee = description.trim();

    const formData = new FormData();
    if (titreNettoye) formData.append('titre', titreNettoye);
    if (descriptionNettoyee) formData.append('description', descriptionNettoyee);
    formData.append('type_media', typeMedia);
    formData.append('est_actif', estActif);
    formData.append('ordre', ordre);

    if (typeMedia === 'IMAGE' && fichier) {
      formData.append('fichier', fichier);
    } else if (typeMedia === 'VIDEO' && idYoutube) {
      formData.append('url_video', urlVideo.trim());
    }

    setErreur('');
    setEnCours(true);
    try {
      // Sans attente ni verrou, un double-clic creait deux entrees identiques.
      await onSave(formData);
    } catch (err) {
      const donnees = err?.response?.data;
      const premierChamp = donnees && typeof donnees === 'object'
        ? Object.values(donnees).flat().find((valeur) => typeof valeur === 'string')
        : null;
      // L'erreur s'affichait derriere la modale restee ouverte : elle est
      // desormais montree dans le formulaire lui-meme.
      setErreur(donnees?.detail || premierChamp || "Erreur lors de l'enregistrement du média.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={enCours ? undefined : onClose}>
      <div className="modal-content carrousel-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mediaToEdit ? "Modifier le média" : "Ajouter un média au carrousel"}</h2>
          <button className="close-btn" onClick={onClose} disabled={enCours} aria-label="Fermer"><X size={24} /></button>
        </div>

        {erreur && (
          <div className="modal-error" role="alert" style={{ margin: '0 1.5rem', color: 'var(--danger)', fontWeight: 600 }}>
            {erreur}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body carrousel-form">
          <div className="form-group">
            <label id="label-type-media">Type de média</label>
            <div className="type-media-toggles" role="group" aria-labelledby="label-type-media">
              <button
                type="button"
                className={`type-toggle ${typeMedia === 'IMAGE' ? 'active' : ''}`}
                aria-pressed={typeMedia === 'IMAGE'}
                onClick={() => { setTypeMedia('IMAGE'); setErreur(''); }}
              >
                <ImageIcon size={18} /> Image
              </button>
              <button
                type="button"
                className={`type-toggle ${typeMedia === 'VIDEO' ? 'active' : ''}`}
                aria-pressed={typeMedia === 'VIDEO'}
                onClick={() => { setTypeMedia('VIDEO'); setErreur(''); }}
              >
                <Film size={18} /> Vidéo
              </button>
            </div>
          </div>

          <div className="form-group">
            {typeMedia === 'IMAGE' ? (
              <>
                <label htmlFor="fichier-upload">Fichier Image {!aImageValide && <span className="required">*</span>}</label>
                {/* Vignette fixe a cote du bouton plutot qu'un aperçu empile
                    en dessous : la modale gardait la meme hauteur qu'un
                    fichier soit choisi ou non, au lieu de s'etirer d'un coup
                    des qu'une image apparaissait. */}
                <div className="media-picker-row">
                  <div className="media-picker-thumb">
                    {fichierPreview ? (
                      <img src={fichierPreview} alt="Aperçu" />
                    ) : (
                      <ImageIcon size={20} aria-hidden="true" />
                    )}
                  </div>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="fichier-upload"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.svg,image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="fichier-upload" className="file-upload-btn">
                      <Upload size={18} />
                      <span>{fichier ? fichier.name : mediaToEdit?.type_media === 'IMAGE' ? 'Changer l’image...' : 'Choisir une image...'}</span>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="url_video">Lien YouTube {!idYoutube && <span className="required">*</span>}</label>
                <div className="media-picker-row">
                  <div className="media-picker-thumb">
                    {idYoutube ? (
                      <img
                        src={`https://img.youtube.com/vi/${idYoutube}/hqdefault.jpg`}
                        alt="Aperçu de la vidéo YouTube"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Film size={20} aria-hidden="true" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="url"
                      id="url_video"
                      value={urlVideo}
                      onChange={(e) => setUrlVideo(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      aria-invalid={urlVideoInvalide}
                      aria-describedby={urlVideoInvalide ? 'url_video-erreur' : undefined}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                {/* Aperçu de ce que HomeCarousel affichera réellement : une
                    diapositive silencieusement vide n'est plus decouverte
                    qu'une fois publiee sur la page d'accueil. */}
                {urlVideoInvalide && (
                  <small id="url_video-erreur" className="champ-erreur" role="alert">
                    Lien YouTube non reconnu. Utilisez un lien de la forme youtube.com/watch?v=… ou youtu.be/…
                  </small>
                )}
              </>
            )}
          </div>

          {/* Titre et case Actif sur une meme ligne (deux controles courts,
              meme hauteur) : la modale s'etirait inutilement en vertical
              alors que rien ici n'a besoin de toute sa largeur. */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="titre">Titre (optionnel)</label>
              <input
                type="text"
                id="titre"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Texte affiché sur le média"
                maxLength={LIMITE_TITRE}
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={estActif}
                  onChange={(e) => setEstActif(e.target.checked)}
                />
                <span className="checkmark"></span>
                Actif
              </label>
            </div>
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


          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={enCours}>Annuler</Button>
            {/* Auparavant desactive uniquement a la creation (!mediaToEdit) :
                en edition, basculer le type sans fournir la nouvelle source
                laissait le bouton actif et renvoyait vers une erreur serveur
                peu claire. Le calcul vaut maintenant dans les deux cas. */}
            <Button type="submit" variant="primary" disabled={enCours || !peutEnregistrer}>
              <Save size={18} style={{ marginRight: '8px' }} />
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CarrouselModal;
