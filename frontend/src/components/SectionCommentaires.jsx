import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send } from 'lucide-react';
import { api, extraireListe } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './SectionCommentaires.css';

export function SectionCommentaires({ predicationId }) {
  const { estConnecte } = useAuth();
  const [commentaires, setCommentaires] = useState([]);
  const [contenu, setContenu] = useState('');
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let active = true;
    setChargement(true);
    api
      .get(`/commentaires/?predication=${predicationId}`)
      .then((response) => {
        if (active) setCommentaires(extraireListe(response.data));
      })
      .catch(() => {
        if (active) setErreur('Impossible de charger les commentaires.');
      })
      .finally(() => {
        if (active) setChargement(false);
      });
    return () => {
      active = false;
    };
  }, [predicationId]);

  async function publier(event) {
    event.preventDefault();
    if (!contenu.trim()) return;
    setEnvoi(true);
    setErreur('');
    try {
      const response = await api.post('/commentaires/', {
        predication: predicationId,
        contenu: contenu.trim(),
      });
      setCommentaires((actuels) => [response.data, ...actuels]);
      setContenu('');
    } catch {
      setErreur("Impossible de publier le commentaire.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="commentaires-section">
      <h2 className="commentaires-titre">
        <MessageSquare size={18} />
        Commentaires {commentaires.length ? `(${commentaires.length})` : ''}
      </h2>

      {estConnecte ? (
        <form className="commentaires-form" onSubmit={publier}>
          <textarea
            value={contenu}
            onChange={(event) => setContenu(event.target.value)}
            placeholder="Partagez ce que cette predication vous inspire..."
            rows={3}
          />
          <button type="submit" className="btn btn-primary" disabled={envoi || !contenu.trim()}>
            <Send size={15} />
            {envoi ? 'Envoi...' : 'Publier'}
          </button>
        </form>
      ) : (
        <p className="commentaires-invite">
          <Link to="/connexion">Connectez-vous</Link> pour laisser un commentaire.
        </p>
      )}

      {erreur ? <p className="commentaires-erreur">{erreur}</p> : null}

      {chargement ? (
        <p className="commentaires-info">Chargement des commentaires...</p>
      ) : commentaires.length ? (
        <ul className="commentaires-liste">
          {commentaires.map((commentaire) => (
            <li key={commentaire.id} className="commentaires-item">
              <strong>{commentaire.utilisateur?.username || 'Utilisateur'}</strong>
              <p>{commentaire.contenu}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="commentaires-info">Aucun commentaire pour le moment. Soyez le premier !</p>
      )}
    </section>
  );
}
