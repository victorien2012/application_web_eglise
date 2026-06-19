import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { Button } from '../../../components/Button';
import './AnnonceModal.css';

export function AnnonceModal({ isOpen, onClose, onSaved, annonceInitiale = null }) {
  const { t } = useTranslation();
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [estActif, setEstActif] = useState(true);
  const [dateExpiration, setDateExpiration] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (annonceInitiale) {
        setTitre(annonceInitiale.titre || '');
        setMessage(annonceInitiale.message || '');
        setEstActif(annonceInitiale.est_actif ?? true);
        if (annonceInitiale.date_expiration) {
          // Format from API (ISO) to datetime-local (YYYY-MM-DDThh:mm)
          const date = new Date(annonceInitiale.date_expiration);
          const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setDateExpiration(formatted);
        } else {
          setDateExpiration('');
        }
      } else {
        setTitre('');
        setMessage('');
        setEstActif(true);
        setDateExpiration('');
      }
      setErreur('');
    }
  }, [isOpen, annonceInitiale]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);

    try {
      const payload = {
        titre,
        message,
        est_actif: estActif,
        date_expiration: dateExpiration ? new Date(dateExpiration).toISOString() : null,
      };

      if (annonceInitiale?.id) {
        await api.put(`/annonces/${annonceInitiale.id}/`, payload);
      } else {
        await api.post('/annonces/', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setErreur(err.response?.data?.detail || err.response?.data?.titre?.[0] || 'Erreur lors de la sauvegarde.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content annonce-modal-content">
        <button className="modal-close" onClick={onClose} type="button">
          <X size={24} />
        </button>

        <div className="modal-header">
          <h2>{annonceInitiale ? 'Modifier l\'annonce' : 'Créer une annonce'}</h2>
          <p>Les annonces actives apparaîtront sur la page d'accueil.</p>
        </div>

        {erreur && <div className="modal-error">{erreur}</div>}

        <form onSubmit={handleSubmit} className="annonce-form">
          <div className="form-group">
            <label htmlFor="titre">Titre de l'annonce *</label>
            <input
              id="titre"
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
              placeholder="Ex: Soirée de louange ce vendredi"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message (optionnel)</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="4"
              placeholder="Ajoutez des détails ici..."
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={estActif}
                onChange={(e) => setEstActif(e.target.checked)}
              />
              <span className="checkmark"></span>
              <strong>Annonce active</strong> (Affichée sur la page d'accueil)
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="dateExpiration">Date d'expiration *</label>
            <input
              id="dateExpiration"
              type="datetime-local"
              value={dateExpiration}
              onChange={(e) => setDateExpiration(e.target.value)}
              required
            />
            <small>L'annonce disparaîtra automatiquement après cette date.</small>
          </div>

          <div className="modal-actions">
            <Button variant="secondary" onClick={onClose} type="button">
              Annuler
            </Button>
            <Button variant="primary" type="submit" icon={Save} disabled={enCours}>
              {enCours ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
