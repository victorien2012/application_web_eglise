import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Loader2, FileDown } from 'lucide-react';
import { api, extraireListe } from '../../../services/api';
import { DataTable } from '../../../components/ui/DataTable';
import { DocumentIcon } from '../../../components/ui/DocumentIcon';
import './Documents.css';

export function Documents() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('toutes');

  useEffect(() => {
    let active = true;

    async function charger() {
      try {
        setChargement(true);
        const [docsRes, catsRes] = await Promise.all([
          api.get('/documents/'),
          api.get('/categories/')
        ]);
        if (active) {
          setDocuments(extraireListe(docsRes.data));
          setCategories(extraireListe(catsRes.data));
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || 'Impossible de charger les documents.');
        }
      } finally {
        if (active) {
          setChargement(false);
        }
      }
    }

    charger();
    return () => { active = false; };
  }, []);

  const documentsFiltres = useMemo(() => {
    if (filtreCategorie === 'toutes') return documents;
    return documents.filter(doc => doc.categories && doc.categories.some(c => c.id.toString() === filtreCategorie));
  }, [documents, filtreCategorie]);

  const handleDownload = async (doc) => {
    if (doc.fichier) {
      window.open(doc.fichier, '_blank');
    } else if (doc.url_fichier) {
      window.open(doc.url_fichier, '_blank');
    }
    try {
      await api.post(`/documents/${doc.id}/enregistrer_telechargement/`);
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, nombre_telechargements: d.nombre_telechargements + 1 } : d));
    } catch (err) {
      console.error("Erreur lors de l'incrémentation", err);
    }
  };

  return (
    <div className="videos-container">

      {/* HERO */}
      <div className="videos-hero-wrapper">
        <div className="videos-header-title">
          <span className="section-badge">Bibliothèque</span>
          <h1>Ressources & Documents</h1>
          <p>Consultez et téléchargez les documents publiés par nos pasteurs.</p>
        </div>
      </div>

      {/* CORPS */}
      <div className="videos-body">

        {/* Filtre catégories */}
        {categories.length > 0 && (
          <div className="documents-category-filter">
            <button
              type="button"
              className={`doc-cat-btn ${filtreCategorie === 'toutes' ? 'active' : ''}`}
              onClick={() => setFiltreCategorie('toutes')}
            >
              Toutes
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                className={`doc-cat-btn ${filtreCategorie === c.id.toString() ? 'active' : ''}`}
                onClick={() => setFiltreCategorie(c.id.toString())}
              >
                {c.nom}
              </button>
            ))}
          </div>
        )}

        <div className="table-card">
          <div className="table-card-header">
            <div className="table-title">
              <h3>Documents disponibles</h3>
              <span>{documentsFiltres.length} document{documentsFiltres.length > 1 ? 's' : ''} trouvé{documentsFiltres.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          {chargement && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 className="spinner" size={32} style={{ margin: '0 auto 1rem', display: 'block', animation: 'spin 1s linear infinite' }} />
              <p>Chargement des documents...</p>
            </div>
          )}

          {erreur && <div className="error-message" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>{erreur}</div>}

          {!chargement && !erreur && (
            <DataTable
              variant="site"
              data={documentsFiltres}
              keyExtractor={(doc) => doc.id}
              searchFields={['titre', 'description']}
              searchPlaceholder="Rechercher un document..."
              exportable={false}
              emptyMessage={(
                <>
                  <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', display: 'block' }} />
                  Aucun document ne correspond à vos critères.
                </>
              )}
              columns={[
                {
                  key: 'image',
                  header: '',
                  style: { width: '50px' },
                  className: 'cell-image',
                  render: (doc) => (
                    doc.image_couverture || doc.url_image_couverture ? (
                      <div className="image-wrapper">
                        <img src={doc.image_couverture || doc.url_image_couverture} alt={doc.titre} onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                    ) : (
                      <DocumentIcon url={doc.fichier || doc.url_fichier} size={24} className="image-wrapper" />
                    )
                  ),
                },
                {
                  key: 'titre',
                  header: 'Titre',
                  className: 'cell-title',
                  sortValue: (doc) => doc.titre || '',
                  render: (doc) => <span title={doc.titre}>{doc.titre}</span>,
                },
                {
                  key: 'pasteur',
                  header: 'Pasteur',
                  sortValue: (doc) => doc.pasteur?.nom_affichage || '',
                  render: (doc) => doc.pasteur?.nom_affichage || '-',
                },
                {
                  key: 'date',
                  header: 'Date',
                  sortValue: (doc) => doc.cree_le || '',
                  exportValue: (doc) => (doc.cree_le ? new Date(doc.cree_le).toLocaleDateString() : '-'),
                  render: (doc) => (doc.cree_le ? new Date(doc.cree_le).toLocaleDateString() : '-'),
                },
                {
                  key: 'telechargements',
                  header: 'Téléchargements',
                  sortValue: (doc) => doc.nombre_telechargements || 0,
                  render: (doc) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                      <FileDown size={14} />
                      {doc.nombre_telechargements || 0}
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  style: { textAlign: 'right' },
                  cellStyle: { textAlign: 'right', verticalAlign: 'middle' },
                  render: (doc) => (
                    <div className="cell-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '0.5rem' }}>
                      {(doc.fichier || doc.url_fichier) && (
                        <button type="button" className="btn-action btn-icon-only btn-download" onClick={() => handleDownload(doc)} title="Télécharger">
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Documents;
