import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, extraireListe } from '../services/api';
import './ModerationCommentaires.css';

export function ModerationCommentaires({ predicationId }) {
  const { t } = useTranslation();
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
          setErreur(t('dashboard.comments_load_error'));
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
      setErreur(t('dashboard.comments_mod_error'));
    }
  }

  async function supprimer(commentaire) {
    const confirme = typeof window === 'undefined' ? true : window.confirm(t('dashboard.comments_delete_confirm'));
    if (!confirme) {
      return;
    }
    try {
      await api.delete(`/commentaires/${commentaire.id}/`);
      setCommentaires((actuels) => actuels.filter((item) => item.id !== commentaire.id));
    } catch {
      setErreur(t('dashboard.comments_delete_error'));
    }
  }

  if (chargement) {
    return <p className="moderation-info">{t('dashboard.comments_loading')}</p>;
  }

  if (erreur) {
    return <p className="moderation-erreur">{erreur}</p>;
  }

  if (!commentaires.length) {
    return <p className="moderation-info">{t('dashboard.comments_empty')}</p>;
  }

  return (
    <div className="moderation-liste">
      {commentaires.map((commentaire) => (
        <div
          key={commentaire.id}
          className={`moderation-item${commentaire.est_masque ? ' moderation-item-masque' : ''}`}
        >
          <div className="moderation-contenu">
            <strong>{commentaire.utilisateur?.username || t('dashboard.comments_user')}</strong>
            <p>{commentaire.contenu}</p>
            {commentaire.est_masque ? <span className="moderation-badge">{t('dashboard.comments_hidden')}</span> : null}
          </div>
          <div className="moderation-actions">
            <button
              type="button"
              className="btn app-ghost-button"
              onClick={() => basculerMasquage(commentaire)}
              title={commentaire.est_masque ? t('dashboard.comments_show') : t('dashboard.comments_hide')}
            >
              {commentaire.est_masque ? <Eye size={15} /> : <EyeOff size={15} />}
              {commentaire.est_masque ? t('dashboard.comments_show_label') : t('dashboard.comments_hide')}
            </button>
            <button
              type="button"
              className="btn dashboard-danger-button"
              onClick={() => supprimer(commentaire)}
              title={t('dashboard.comments_delete')}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
