import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api, extraireListe } from '../../../services/api';
import { FileText, PlusCircle, Trash2, PencilLine, Eye, Download, Search, AlertTriangle } from 'lucide-react';
import { IconButton } from '../../../components/ui/IconButton';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { DocumentIcon } from '../../../components/ui/DocumentIcon';
import { Toast } from 'primereact/toast';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

export function GestionDocuments() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [documentASupprimer, setDocumentASupprimer] = useState(null);
  const [enEdition, setEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');
  const toast = useRef(null);

  const [formulaire, setFormulaire] = useState({
    titre: '',
    description: '',
    est_publie: true,
    categories_ids: [],
  });
  const [fichier, setFichier] = useState(null);
  const [imageCouverture, setImageCouverture] = useState(null);

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

  function reinitialiserFormulaire() {
    setEnEdition(null);
    setFormulaire({ titre: '', description: '', est_publie: true, categories_ids: [] });
    setFichier(null);
    setImageCouverture(null);
  }

  function commencerEdition(doc) {
    setEnEdition(doc.id);
    setFormulaire({
      titre: doc.titre,
      description: doc.description || '',
      est_publie: doc.est_publie,
      categories_ids: (doc.categories || []).map(c => c.id)
    });
    setFichier(null);
    setImageCouverture(null);
  }

  async function handleSoumettre(e) {
    e.preventDefault();
    if (!enEdition && !fichier) {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Un fichier est requis.' });
      return;
    }

    const formData = new FormData();
    formData.append('titre', formulaire.titre);
    formData.append('description', formulaire.description);
    formData.append('est_publie', formulaire.est_publie ? 'true' : 'false');
    formulaire.categories_ids.forEach(id => formData.append('categories_ids', id));
    if (fichier) formData.append('fichier', fichier);
    if (imageCouverture) formData.append('image_couverture', imageCouverture);

    try {
      if (enEdition) {
        await api.patch(`/documents/${enEdition}/`, formData);
        toast.current?.show({ severity: 'success', summary: 'Succès', detail: 'Document mis à jour.' });
      } else {
        await api.post('/documents/', formData);
        toast.current?.show({ severity: 'success', summary: 'Succès', detail: 'Document ajouté.' });
      }
      reinitialiserFormulaire();
      chargerDonnees();
    } catch (err) {
      console.error(err);
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Erreur lors de l\'enregistrement.' });
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

  function basculerCategorie(id) {
    setFormulaire(prev => ({
      ...prev,
      categories_ids: prev.categories_ids.includes(id) 
        ? prev.categories_ids.filter(c => c !== id) 
        : [...prev.categories_ids, id]
    }));
  }

  const documentsFiltres = documents.filter(d => 
    (d.titre || '').toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="gestion-documents dashboard-tab-content">
      <Toast ref={toast} />
      
      <div className="dashboard-title-area" style={{ marginBottom: '1.5rem' }}>
        <h1>Gestion des Documents</h1>
        <p>Ajoutez et gérez vos documents (PDF, Word, etc.)</p>
      </div>

      <div className="docs-layout-grid">
        
        {/* Liste des documents */}
        <div className="dashboard-section" style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pd-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Vos documents publiés ({documents.length})</h3>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                style={{ padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '6px', border: '1px solid var(--pd-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          {chargement ? (
            <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
          ) : documentsFiltres.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-alt)', borderRadius: '8px' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>Aucun document trouvé.</p>
            </div>
          ) : (
            <Table 
              data={documentsFiltres}
              keyExtractor={(doc) => doc.id}
              rowStyle={(doc) => doc.id === enEdition ? { backgroundColor: 'rgba(var(--primary-rgb), 0.08)' } : {}}
              columns={[
                { 
                  header: 'Document',
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
                  header: 'Date',
                  cellStyle: { color: 'var(--text-muted)', fontSize: '0.9rem' },
                  render: (doc) => new Date(doc.cree_le).toLocaleDateString()
                },
                { 
                  header: 'Statistiques',
                  cellStyle: { color: 'var(--text-muted)', fontSize: '0.9rem' },
                  render: (doc) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Download size={14} /> {doc.nombre_telechargements}
                    </div>
                  )
                },
                { 
                  header: 'Statut',
                  render: (doc) => (
                    <Badge variant={doc.est_publie ? 'success' : 'warning'}>
                      {doc.est_publie ? 'Publié' : 'Brouillon'}
                    </Badge>
                  )
                },
                { 
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

        {/* Formulaire d'ajout/modification */}
        <div className="dashboard-section form-card" style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--pd-border)', position: 'sticky', top: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            {enEdition ? <PencilLine size={20} /> : <PlusCircle size={20} />}
            {enEdition ? 'Modifier le document' : 'Nouveau document'}
          </h3>

          <form onSubmit={handleSoumettre} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Titre *</label>
              <input 
                type="text" 
                required 
                value={formulaire.titre} 
                onChange={(e) => setFormulaire({...formulaire, titre: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pd-border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Description</label>
              <textarea 
                rows="2" 
                value={formulaire.description} 
                onChange={(e) => setFormulaire({...formulaire, description: e.target.value})}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--pd-border)', resize: 'vertical', background: 'var(--bg-card)', color: 'var(--text-main)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Fichier (PDF, DOCX...) {!enEdition && '*'}
                </label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={(e) => setFichier(e.target.files[0])}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                {enEdition && <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem', fontSize: '0.75rem' }}>Vide = conserver l'actuel.</small>}
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Logo du document
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImageCouverture(e.target.files[0])}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Catégories</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => basculerCategorie(cat.id)}
                    style={{
                      padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid', cursor: 'pointer',
                      backgroundColor: formulaire.categories_ids.includes(cat.id) ? '#004a94' : 'transparent',
                      color: formulaire.categories_ids.includes(cat.id) ? 'white' : 'var(--text-muted)',
                      borderColor: formulaire.categories_ids.includes(cat.id) ? 'var(--primary)' : 'var(--pd-border)'
                    }}
                  >
                    {cat.nom}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={formulaire.est_publie} 
                onChange={(e) => setFormulaire({...formulaire, est_publie: e.target.checked})}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontWeight: 500 }}>Publier immédiatement</span>
            </label>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" style={{ flex: 1 }}>
                {enEdition ? 'Enregistrer' : 'Ajouter'}
              </Button>
              {enEdition && (
                <Button type="button" variant="outline" onClick={reinitialiserFormulaire}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

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
