import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { api, extraireListe } from '../services/api';
import './ModerationCommentaires.css';

export function ModerationCommentaires({ predicationId }) {
  const [commentaires, setCommentaires] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let active = true;
    setChargement(true);
    setErreur('');

    api
      .get(`/commentaires/?predication=${predicationId}&moderation=true`)
      .then((response) => {
        if (active) {
          setCommentaires(extraireListe(response.data));
        }
      })
      .catch(() => {
        if (active) {
          setErreur('Impossible de charger les commentaires.');
        }
      })
      .finally(() => {
        if (active) {
          setChargement(false);
        }
      });

    return () => {
      active = false;
    };
  }, [predicationId]);

  async function basculerMasquage(commentaire) {
    try {
      const response = await api.post(`/commentaires/${commentaire.id}/basculer_masquage/`);
      setCommentaires((actuels) =>
        actuels.map((item) =>
          item.id === commentaire.id ? { ...item, est_masque: response.data.est_masque } : item
        )
      );
    } catch {
      setErreur("L'action de moderation a echoue.");
    }
  }

  async function supprimer(commentaire) {
    const confirme = typeof window === 'undefined' ? true : window.confirm('Supprimer ce commentaire ?');
    if (!confirme) {
      return;
    }
    try {
      await api.delete(`/commentaires/${commentaire.id}/`);
      setCommentaires((actuels) => actuels.filter((item) => item.id !== commentaire.id));
    } catch {
      setErreur('La suppression a echoue.');
    }
  }

  if (chargement) {
    return <p className="moderation-info">Chargement des commentaires...</p>;
  }

  if (erreur) {
    return <p className="moderation-erreur">{erreur}</p>;
  }

  if (!commentaires.length) {
    return <p className="moderation-info">Aucun commentaire pour cette predication.</p>;
  }

  return (
    <div className="moderation-liste">
      {commentaires.map((commentaire) => (
        <div
          key={commentaire.id}
          className={`moderation-item${commentaire.est_masque ? ' moderation-item-masque' : ''}`}
        >
          <div className="moderation-contenu">
            <strong>{commentaire.utilisateur?.username || 'Utilisateur'}</strong>
            <p>{commentaire.contenu}</p>
            {commentaire.est_masque ? <span className="moderation-badge">Masque</span> : null}
          </div>
          <div className="moderation-actions">
            <button
              type="button"
              className="btn app-ghost-button"
              onClick={() => basculerMasquage(commentaire)}
              title={commentaire.est_masque ? 'Reafficher' : 'Masquer'}
            >
              {commentaire.est_masque ? <Eye size={15} /> : <EyeOff size={15} />}
              {commentaire.est_masque ? 'Afficher' : 'Masquer'}
            </button>
            <button
              type="button"
              className="btn dashboard-danger-button"
              onClick={() => supprimer(commentaire)}
              title="Supprimer"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
