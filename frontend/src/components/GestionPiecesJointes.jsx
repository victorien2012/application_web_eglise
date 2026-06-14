import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from 'primereact/toast';
import { FileText, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, extraireListe } from '../services/api';
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
      toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.attachments_add_success'), life: 5000 });
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
      toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.attachments_delete_success'), life: 5000 });
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

      {pieceASupprimer && createPortal(
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.75)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            padding: '2.5rem', 
            maxWidth: '440px', 
            width: '90%', 
            textAlign: 'center', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', 
            border: '1px solid rgba(226, 232, 240, 0.8)',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' 
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: '#fee2e2', 
              color: '#ef4444', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.5rem auto',
              boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2)'
            }}>
              <Trash2 size={40} />
            </div>

            <h3 style={{ 
              marginTop: 0, 
              fontSize: '1.5rem', 
              fontWeight: 800, 
              color: '#0f172a', 
              marginBottom: '1rem' 
            }}>
              {t('dashboard.attachments_modal_title')}
            </h3>
            
            <p style={{ 
              color: '#475569', 
              fontSize: '0.975rem', 
              lineHeight: 1.6, 
              margin: '0 0 2rem 0' 
            }}>
              {t('dashboard.attachments_modal_desc')} <strong>{pieceASupprimer.nom}</strong> ?
              <br />
              <span style={{ 
                display: 'block', 
                marginTop: '0.75rem', 
                fontSize: '0.85rem', 
                color: '#ef4444', 
                fontWeight: 600,
                backgroundColor: '#fef2f2',
                padding: '0.5rem 1rem',
                borderRadius: '8px'
              }}>
                {t('dashboard.attachments_modal_warning')}
              </span>
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setPieceASupprimer(null)} 
                style={{ 
                  flex: 1,
                  padding: '0.8rem 1.5rem', 
                  fontSize: '0.95rem', 
                  background: '#f1f5f9', 
                  color: '#475569', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontWeight: '600',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                {t('dashboard.attachments_cancel')}
              </button>
              <button 
                type="button" 
                onClick={executerSuppression} 
                style={{ 
                  flex: 1,
                  padding: '0.8rem 1.5rem', 
                  fontSize: '0.95rem', 
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                {t('dashboard.attachments_confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
