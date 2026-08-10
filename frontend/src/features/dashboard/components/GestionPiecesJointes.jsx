import { useEffect, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import { AlertTriangle, FileText, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, extraireListe } from '../../../services/api';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import './ModerationCommentaires.css';

export function GestionPiecesJointes({ predicationId }) {
  const { t } = useTranslation();
  const [pieces, setPieces] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nom, setNom] = useState('');
  const [fichier, setFichier] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [pieceASupprimer, setPieceASupprimer] = useState(null);
  const toast = useRef(null);
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
          setErreur(t('dashboard.attachments_load_error'));
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
      setErreur(t('dashboard.attachments_select_file'));
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
      toast.current?.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.attachments_add_success'), life: 5000 });
      charger();
    } catch (error) {
      const data = error.response?.data;
      setErreur(data?.fichier?.[0] || data?.detail || t('dashboard.attachments_add_error'));
    } finally {
      setEnvoi(false);
    }
  }

  function demanderSuppression(piece) {
    setPieceASupprimer(piece);
  }

  async function executerSuppression() {
    if (!pieceASupprimer) return;
    try {
      await api.delete(`/pieces-jointes/${pieceASupprimer.id}/`);
      setPieces((actuels) => actuels.filter((item) => item.id !== pieceASupprimer.id));
      toast.current?.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.attachments_delete_success'), life: 5000 });
    } catch {
      setErreur(t('dashboard.attachments_delete_error'));
    } finally {
      setPieceASupprimer(null);
    }
  }

  return (
    <div className="moderation-liste">
      <Toast ref={toast} />
      <form className="dashboard-inline" onSubmit={ajouter} style={{ alignItems: 'flex-end' }}>
        <label className="dashboard-field" style={{ flex: '1 1 160px' }}>
          <span>{t('dashboard.attachments_name_label')}</span>
          <input value={nom} onChange={(event) => setNom(event.target.value)} placeholder={t('dashboard.attachments_name_placeholder')} />
        </label>
        <label className="dashboard-field" style={{ flex: '1 1 200px' }}>
          <span>{t('dashboard.attachments_file_label')}</span>
          <input
            key={`pj-${resetKey}`}
            type="file"
            accept=".pdf,.doc,.docx,.odt,.txt,.rtf,.ppt,.pptx"
            onChange={(event) => setFichier(event.target.files?.[0] || null)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={envoi}>
          <Upload size={15} />
          {envoi ? t('dashboard.attachments_sending') : t('dashboard.attachments_add')}
        </button>
      </form>

      {erreur ? <p className="moderation-erreur">{erreur}</p> : null}

      {chargement ? (
        <p className="moderation-info">{t('dashboard.attachments_loading')}</p>
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
                {t('dashboard.attachments_open')}
              </a>
              <button type="button" className="btn dashboard-danger-button" onClick={() => demanderSuppression(piece)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="moderation-info">{t('dashboard.attachments_empty')}</p>
      )}

      <ConfirmModal
        isOpen={!!pieceASupprimer}
        onClose={() => setPieceASupprimer(null)}
        onConfirm={executerSuppression}
        title={t('dashboard.attachments_modal_title')}
        message={`${t('dashboard.attachments_modal_desc')} "${pieceASupprimer?.nom}" ?\n\n${t('dashboard.attachments_modal_warning')}`}
        confirmText={t('dashboard.attachments_confirm')}
        cancelText={t('dashboard.attachments_cancel')}
        variant="danger"
        icon={AlertTriangle}
      />
    </div>
  );
}
