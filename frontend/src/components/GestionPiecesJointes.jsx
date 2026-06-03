import { useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { api, extraireListe } from '../services/api';
import './ModerationCommentaires.css';

export function GestionPiecesJointes({ predicationId }) {
  const [pieces, setPieces] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nom, setNom] = useState('');
  const [fichier, setFichier] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const monteRef = useRef(true);

  function charger() {
    setChargement(true);
    api
      .get(`/pieces-jointes/?predication=${predicationId}`)
      .then((response) => {
        if (monteRef.current) {
          setPieces(extraireListe(response.data));
        }
      })
      .catch(() => {
        if (monteRef.current) {
          setErreur('Impossible de charger les pieces jointes.');
        }
      })
      .finally(() => {
        if (monteRef.current) {
          setChargement(false);
        }
      });
  }

  useEffect(() => {
    monteRef.current = true;
    charger();
    return () => {
      monteRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predicationId]);

  async function ajouter(event) {
    event.preventDefault();
    setErreur('');
    if (!fichier) {
      setErreur('Selectionnez un fichier.');
      return;
    }
    setEnvoi(true);
    try {
      const corps = new FormData();
      corps.append('predication', predicationId);
      corps.append('nom', nom || fichier.name);
      corps.append('fichier', fichier);
      await api.post('/pieces-jointes/', corps);
      setNom('');
      setFichier(null);
      setResetKey((cle) => cle + 1);
      charger();
    } catch (error) {
      const data = error.response?.data;
      setErreur(data?.fichier?.[0] || data?.detail || "L'ajout a echoue.");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(piece) {
    const confirme = typeof window === 'undefined' ? true : window.confirm('Supprimer cette piece jointe ?');
    if (!confirme) {
      return;
    }
    try {
      await api.delete(`/pieces-jointes/${piece.id}/`);
      setPieces((actuels) => actuels.filter((item) => item.id !== piece.id));
    } catch {
      setErreur('La suppression a echoue.');
    }
  }

  return (
    <div className="moderation-liste">
      <form className="dashboard-inline" onSubmit={ajouter} style={{ alignItems: 'flex-end' }}>
        <label className="dashboard-field" style={{ flex: '1 1 160px' }}>
          <span>Nom (optionnel)</span>
          <input value={nom} onChange={(event) => setNom(event.target.value)} placeholder="Notes de predication" />
        </label>
        <label className="dashboard-field" style={{ flex: '1 1 200px' }}>
          <span>Fichier</span>
          <input
            key={`pj-${resetKey}`}
            type="file"
            accept=".pdf,.doc,.docx,.odt,.txt,.rtf,.ppt,.pptx"
            onChange={(event) => setFichier(event.target.files?.[0] || null)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={envoi}>
          <Upload size={15} />
          {envoi ? 'Envoi...' : 'Ajouter'}
        </button>
      </form>

      {erreur ? <p className="moderation-erreur">{erreur}</p> : null}

      {chargement ? (
        <p className="moderation-info">Chargement des pieces jointes...</p>
      ) : pieces.length ? (
        pieces.map((piece) => (
          <div key={piece.id} className="moderation-item">
            <div className="moderation-contenu">
              <strong>
                <FileText size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                {piece.nom}
              </strong>
            </div>
            <div className="moderation-actions">
              <a className="btn app-ghost-button" href={piece.fichier} target="_blank" rel="noreferrer">
                Ouvrir
              </a>
              <button type="button" className="btn dashboard-danger-button" onClick={() => supprimer(piece)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="moderation-info">Aucune piece jointe.</p>
      )}
    </div>
  );
}
