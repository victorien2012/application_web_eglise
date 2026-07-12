import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, Trash2, Loader2, UserRound, LogIn } from 'lucide-react';
import { api, extraireListe } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import './SectionCommentaires.css';

const MAX_CHARS = 500;

function tempsRelatif(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AvatarInitiales({ nom, size = 36 }) {
  const lettre = (nom || '?')[0].toUpperCase();
  const couleurs = [
    ['#7c3aed', '#ddd6fe'], ['#0891b2', '#cffafe'], ['#059669', '#d1fae5'],
    ['#004a94', '#fef3c7'], ['#db2777', '#fce7f3'], ['#dc2626', '#fee2e2'],
  ];
  const idx = lettre.charCodeAt(0) % couleurs.length;
  const [bg, fg] = couleurs[idx];
  return (
    <div
      className="comment-avatar-initiales"
      style={{ width: size, height: size, minWidth: size, background: bg, color: fg, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {lettre}
    </div>
  );
}

export function SectionCommentaires({ predicationId }) {
  const { estConnecte, session } = useAuth();
  const [commentaires, setCommentaires] = useState([]);
  const [contenu, setContenu] = useState('');
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [suppressions, setSuppressions] = useState(new Set());
  const textareaRef = useRef(null);

  useEffect(() => {
    let active = true;
    setChargement(true);
    api
      .get(`/commentaires/?predication=${predicationId}`)
      .then((r) => { if (active) setCommentaires(extraireListe(r.data)); })
      .catch(() => { if (active) setErreur('Impossible de charger les commentaires.'); })
      .finally(() => { if (active) setChargement(false); });
    return () => { active = false; };
  }, [predicationId]);

  async function publier(e) {
    e.preventDefault();
    if (!contenu.trim() || envoi) return;
    setEnvoi(true);
    setErreur('');
    try {
      const r = await api.post('/commentaires/', { predication: predicationId, contenu: contenu.trim() });
      setCommentaires((prev) => [r.data, ...prev]);
      setContenu('');
      textareaRef.current?.focus();
    } catch {
      setErreur('Impossible de publier le commentaire. Veuillez réessayer.');
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(id) {
    setSuppressions((s) => new Set(s).add(id));
    try {
      await api.delete(`/commentaires/${id}/`);
      setCommentaires((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setErreur('Impossible de supprimer ce commentaire.');
    } finally {
      setSuppressions((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  const restants = MAX_CHARS - contenu.length;
  const peutSupprimer = (c) => session?.username && c.utilisateur?.username === session.username;

  return (
    <section className="sc-section" aria-label="Commentaires">

      {/* En-tête */}
      <div className="sc-header">
        <h2 className="sc-titre">
          <MessageSquare size={20} />
          Commentaires
          {commentaires.length > 0 && (
            <span className="sc-count">{commentaires.length}</span>
          )}
        </h2>
      </div>

      {/* Formulaire */}
      {estConnecte ? (
        <form className="sc-form" onSubmit={publier}>
          <div className="sc-form-row">
            <AvatarInitiales nom={session?.username} size={38} />
            <div className="sc-textarea-wrapper">
              <textarea
                ref={textareaRef}
                className="sc-textarea"
                value={contenu}
                onChange={(e) => setContenu(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Partagez ce que cette prédication vous inspire..."
                rows={3}
                disabled={envoi}
                aria-label="Votre commentaire"
              />
              <div className="sc-form-footer">
                <span className={`sc-chars ${restants < 50 ? (restants < 20 ? 'danger' : 'warn') : ''}`}>
                  {restants} caractère{restants !== 1 ? 's' : ''} restant{restants !== 1 ? 's' : ''}
                </span>
                <button
                  type="submit"
                  className="sc-submit-btn"
                  disabled={envoi || !contenu.trim()}
                  aria-label="Publier le commentaire"
                >
                  {envoi ? (
                    <Loader2 size={15} className="sc-spinner" />
                  ) : (
                    <Send size={15} />
                  )}
                  {envoi ? 'Publication…' : 'Publier'}
                </button>
              </div>
            </div>
          </div>
          {erreur && <p className="sc-erreur" role="alert">{erreur}</p>}
        </form>
      ) : (
        <div className="sc-invite-bloc">
          <div className="sc-invite-icon"><LogIn size={22} /></div>
          <div>
            <p className="sc-invite-titre">Participez à la discussion</p>
            <p className="sc-invite-texte">
              <Link to="/compte-fidele" className="sc-invite-lien">Connectez-vous</Link> ou{' '}
              <span className="sc-invite-lien" style={{ textDecoration: 'underline' }}>créez un compte</span> pour laisser un commentaire.
            </p>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="sc-liste-wrapper">
        {chargement ? (
          <div className="sc-etat">
            <Loader2 size={28} className="sc-spinner" style={{ color: '#7c5cff' }} />
            <span>Chargement des commentaires…</span>
          </div>
        ) : commentaires.length === 0 ? (
          <div className="sc-vide">
            <div className="sc-vide-icon">💬</div>
            <p className="sc-vide-titre">Soyez le premier à commenter</p>
            <p className="sc-vide-texte">Partagez votre ressenti sur cette prédication.</p>
          </div>
        ) : (
          <ul className="sc-liste">
            {commentaires.map((c, i) => (
              <li
                key={c.id}
                className="sc-item"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <AvatarInitiales nom={c.utilisateur?.username} size={38} />
                <div className="sc-item-body">
                  <div className="sc-item-header">
                    <span className="sc-item-auteur">{c.utilisateur?.username || 'Utilisateur'}</span>
                    <span className="sc-item-date">{c.cree_le ? tempsRelatif(c.cree_le) : ''}</span>
                    {peutSupprimer(c) && (
                      <button
                        type="button"
                        className="sc-delete-btn"
                        onClick={() => supprimer(c.id)}
                        disabled={suppressions.has(c.id)}
                        title="Supprimer ce commentaire"
                        aria-label="Supprimer"
                      >
                        {suppressions.has(c.id)
                          ? <Loader2 size={13} className="sc-spinner" />
                          : <Trash2 size={13} />
                        }
                      </button>
                    )}
                  </div>
                  <p className="sc-item-contenu">{c.contenu}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
