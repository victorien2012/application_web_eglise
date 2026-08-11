import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '../../../components/Button';
import { verifierFichier } from '../../../utils/fichiers';
import './DocumentModal.css';

const CONTRAINTES = {
  fichier: { extensions: ['pdf', 'doc', 'docx', 'odt', 'txt', 'rtf', 'ppt', 'pptx', 'xls', 'xlsx'], tailleMaxMo: 50 },
  image_couverture: { extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'], tailleMaxMo: 5 },
};

export function DocumentModal({ isOpen, onClose, onSave, documentToEdit = null, categories = [] }) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [estPublie, setEstPublie] = useState(true);
  const [categoriesIds, setCategoriesIds] = useState([]);
  const [fichier, setFichier] = useState(null);
  const [imageCouverture, setImageCouverture] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [erreurFichier, setErreurFichier] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (documentToEdit) {
      setTitre(documentToEdit.titre || '');
      setDescription(documentToEdit.description || '');
      setEstPublie(documentToEdit.est_publie);
      setCategoriesIds((documentToEdit.categories || []).map((c) => c.id));
    } else {
      setTitre('');
      setDescription('');
      setEstPublie(true);
      setCategoriesIds([]);
    }
    setFichier(null);
    setImageCouverture(null);
    setErreurFichier('');
    setErreur('');
  }, [documentToEdit, isOpen]);

  if (!isOpen) return null;

  function choisirFichier(cle, fichierChoisi, appliquer) {
    if (!fichierChoisi) {
      appliquer(null);
      setErreurFichier('');
      return;
    }
    const messageErreur = verifierFichier(fichierChoisi, CONTRAINTES[cle]);
    if (messageErreur) {
      setErreurFichier(messageErreur);
      appliquer(null);
      return;
    }
    setErreurFichier('');
    appliquer(fichierChoisi);
  }

  function basculerCategorie(id) {
    setCategoriesIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (enCours) return;
    if (!documentToEdit && !fichier) {
      setErreur('Un fichier est requis.');
      return;
    }
    if (erreurFichier) return;

    const formData = new FormData();
    formData.append('titre', titre.trim());
    formData.append('description', description.trim());
    formData.append('est_publie', estPublie ? 'true' : 'false');
    categoriesIds.forEach((id) => formData.append('categories_ids', id));
    if (fichier) formData.append('fichier', fichier);
    if (imageCouverture) formData.append('image_couverture', imageCouverture);

    setErreur('');
    setEnCours(true);
    try {
      // Sans attente ni verrou, un double-clic creait deux documents identiques.
      await onSave(formData);
    } catch (err) {
      setErreur(err?.message || "Erreur lors de l'enregistrement du document.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={enCours ? undefined : onClose}>
      <div className="modal-content document-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{documentToEdit ? 'Modifier le document' : 'Ajouter un document'}</h2>
          <button className="close-btn" onClick={onClose} disabled={enCours} aria-label="Fermer"><X size={24} /></button>
        </div>

        {erreur && (
          <div className="modal-error" role="alert" style={{ margin: '0 1.5rem 1rem', color: 'var(--danger)', fontWeight: 600 }}>
            {erreur}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body document-modal-form">
          <div className="form-group">
            <label htmlFor="doc-titre">Titre <span className="required">*</span></label>
            <input
              id="doc-titre"
              type="text"
              required
              maxLength={255}
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="doc-description">Description</label>
            <textarea
              id="doc-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="doc-fichier">
                Fichier (PDF, DOCX...) {!documentToEdit && <span className="required">*</span>}
              </label>
              <input
                id="doc-fichier"
                type="file"
                accept=".pdf,.doc,.docx,.odt,.txt,.rtf,.ppt,.pptx,.xls,.xlsx"
                onChange={(e) => choisirFichier('fichier', e.target.files?.[0] || null, setFichier)}
              />
              {documentToEdit && <small className="help-text">Vide = conserver l'actuel.</small>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="doc-logo">Logo du document</label>
              <input
                id="doc-logo"
                type="file"
                accept="image/*"
                onChange={(e) => choisirFichier('image_couverture', e.target.files?.[0] || null, setImageCouverture)}
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="form-group">
              <label>Catégories</label>
              <div className="document-modal-categories">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`document-modal-categorie ${categoriesIds.includes(cat.id) ? 'active' : ''}`}
                    onClick={() => basculerCategorie(cat.id)}
                  >
                    {cat.nom}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="checkbox-label-inline">
            <input
              type="checkbox"
              checked={estPublie}
              onChange={(e) => setEstPublie(e.target.checked)}
            />
            Publier immédiatement
          </label>

          {erreurFichier && (
            <p role="alert" className="champ-erreur">{erreurFichier}</p>
          )}

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={enCours}>Annuler</Button>
            <Button type="submit" variant="primary" disabled={enCours}>
              <Save size={18} style={{ marginRight: '8px' }} />
              {enCours ? 'Enregistrement…' : documentToEdit ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
