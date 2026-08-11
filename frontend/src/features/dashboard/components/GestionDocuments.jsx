import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api, extraireListe } from '../../../services/api';
import { FileText, PlusCircle, Trash2, PencilLine, Download, AlertTriangle } from 'lucide-react';
import { IconButton } from '../../../components/ui/IconButton';
import { Button } from '../../../components/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { DocumentIcon } from '../../../components/ui/DocumentIcon';
import { DocumentModal } from './DocumentModal';
import { Toast } from 'primereact/toast';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { extraireErreurServeur } from '../../../utils/erreurs';

export function GestionDocuments() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [documentASupprimer, setDocumentASupprimer] = useState(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [documentEnEdition, setDocumentEnEdition] = useState(null);
  const toast = useRef(null);

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    try {
      setChargement(true);
      const [docsRes, catsRes] = await Promise.all([
        api.get('/documents/?espace_pasteur=true'),
        api.get('/categories/')
      ]);
      setDocuments(extraireListe(docsRes.data));
      setCategories(extraireListe(catsRes.data));
    } catch (err) {
      console.error(err);
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les documents.' });
    } finally {
      setChargement(false);
    }
  }

  function ouvrirAjout() {
    setDocumentEnEdition(null);
    setModalOuvert(true);
  }

  function commencerEdition(doc) {
    setDocumentEnEdition(doc);
    setModalOuvert(true);
  }

  function fermerModal() {
    setModalOuvert(false);
    setDocumentEnEdition(null);
  }

  async function enregistrerDocument(formData) {
    try {
      if (documentEnEdition) {
        await api.patch(`/documents/${documentEnEdition.id}/`, formData);
        toast.current?.show({ severity: 'success', summary: 'Succès', detail: 'Document mis à jour.' });
      } else {
        await api.post('/documents/', formData);
        toast.current?.show({ severity: 'success', summary: 'Succès', detail: 'Document ajouté.' });
      }
      fermerModal();
      chargerDonnees();
    } catch (err) {
      // Les messages de validation du serveur (format refusé, fichier trop
      // lourd, abonnement expiré) étaient remplacés par un texte générique.
      throw new Error(extraireErreurServeur(err, { repli: "Erreur lors de l'enregistrement." }));
    }
  }

  function demanderSuppression(doc) {
    setDocumentASupprimer(doc);
  }

  async function confirmerSuppression() {
    if (!documentASupprimer) return;
    try {
      await api.delete(`/documents/${documentASupprimer.id}/`);
      toast.current?.show({ severity: 'success', summary: 'Succès', detail: 'Document supprimé.' });
      chargerDonnees();
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Erreur de suppression.' });
    } finally {
      setDocumentASupprimer(null);
    }
  }

  return (
    <div className="gestion-documents dashboard-tab-content">
      <Toast ref={toast} />

      <div className="dashboard-title-area" style={{ marginBottom: '1.5rem' }}>
        <h1>Gestion des Documents</h1>
        <p>Ajoutez et gérez vos documents (PDF, Word, etc.)</p>
      </div>

      <div className="dashboard-section" style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pd-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Vos documents publiés ({documents.length})</h3>
          <Button variant="primary" icon={PlusCircle} onClick={ouvrirAjout}>
            Ajouter un document
          </Button>
        </div>

        {chargement ? (
          <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-alt)', borderRadius: '8px' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Aucun document trouvé.</p>
          </div>
        ) : (
          <DataTable
            variant="site"
            exportable={false}
            searchFields={['titre']}
            searchPlaceholder="Rechercher..."
            data={documents}
            keyExtractor={(doc) => doc.id}
            rowStyle={(doc) => doc.id === documentEnEdition?.id ? { backgroundColor: 'rgba(var(--primary-rgb), 0.08)' } : {}}
            columns={[
              {
                key: 'document',
                header: 'Document',
                sortValue: (doc) => doc.titre || '',
                render: (doc) => {
                  const logoUrl = doc.image_couverture || doc.url_image_couverture;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="logo" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <DocumentIcon url={doc.fichier || doc.url_fichier} size={24} />
                      )}
                      <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{doc.titre}</span>
                    </div>
                  );
                }
              },
              {
                key: 'date',
                header: 'Date',
                cellStyle: { color: 'var(--text-muted)', fontSize: '0.9rem' },
                sortValue: (doc) => doc.cree_le || '',
                render: (doc) => new Date(doc.cree_le).toLocaleDateString()
              },
              {
                key: 'stats',
                header: 'Statistiques',
                cellStyle: { color: 'var(--text-muted)', fontSize: '0.9rem' },
                sortValue: (doc) => doc.nombre_telechargements || 0,
                render: (doc) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Download size={14} /> {doc.nombre_telechargements}
                  </div>
                )
              },
              {
                key: 'statut',
                header: 'Statut',
                sortValue: (doc) => (doc.est_publie ? 1 : 0),
                render: (doc) => (
                  <Badge variant={doc.est_publie ? 'success' : 'warning'}>
                    {doc.est_publie ? 'Publié' : 'Brouillon'}
                  </Badge>
                )
              },
              {
                key: 'actions',
                header: 'Actions',
                style: { textAlign: 'right' },
                cellStyle: { textAlign: 'right' },
                render: (doc) => (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <IconButton icon={PencilLine} onClick={() => commencerEdition(doc)} title="Modifier" colorVariant="default" />
                    <IconButton icon={Trash2} onClick={() => demanderSuppression(doc)} title="Supprimer" colorVariant="danger" />
                  </div>
                )
              }
            ]}
          />
        )}
      </div>

      <DocumentModal
        isOpen={modalOuvert}
        onClose={fermerModal}
        onSave={enregistrerDocument}
        documentToEdit={documentEnEdition}
        categories={categories}
      />

      <ConfirmModal
        isOpen={!!documentASupprimer}
        onClose={() => setDocumentASupprimer(null)}
        onConfirm={confirmerSuppression}
        title="Confirmation de suppression"
        message={`Voulez-vous vraiment supprimer "${documentASupprimer?.titre}" ?`}
        confirmText="Supprimer"
        variant="danger"
        icon={AlertTriangle}
      />
    </div>
  );
}
