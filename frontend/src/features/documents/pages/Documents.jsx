import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, FileText, Loader2, FileDown } from 'lucide-react';
import { api, extraireListe } from '../../../services/api';
import Pagination from '../../../components/Pagination';
import { Table } from '../../../components/ui/Table';
import { DocumentIcon } from '../../../components/ui/DocumentIcon';
import './Documents.css';

export function Documents() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('toutes');
  const [page, setPage] = useState(1);
  const ELEMENTS_PAR_PAGE = 10;

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
    return documents.filter(doc => {
      const matchRecherche = (doc.titre || '').toLowerCase().includes(recherche.toLowerCase()) ||
                             (doc.description || '').toLowerCase().includes(recherche.toLowerCase());
      
      const matchCategorie = filtreCategorie === 'toutes' || 
                             (doc.categories && doc.categories.some(c => c.id.toString() === filtreCategorie));
      
      return matchRecherche && matchCategorie;
    });
  }, [documents, recherche, filtreCategorie]);

  const totalPages = Math.ceil(documentsFiltres.length / ELEMENTS_PAR_PAGE) || 1;
  const docsPagination = useMemo(() => {
    const debut = (page - 1) * ELEMENTS_PAR_PAGE;
    return documentsFiltres.slice(debut, debut + ELEMENTS_PAR_PAGE);
  }, [documentsFiltres, page]);

  useEffect(() => {
    setPage(1);
  }, [recherche, filtreCategorie]);

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
            <div className="search-input-wrapper">
              <Search className="search-icon" size={16} />
              <input 
                placeholder="Rechercher un document..." 
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
          </div>

          {chargement && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="spinner" size={32} style={{ margin: '0 auto 1rem', display: 'block', animation: 'spin 1s linear infinite' }} />
              <p>Chargement des documents...</p>
            </div>
          )}

          {erreur && <div className="error-message" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{erreur}</div>}

          {!chargement && !erreur && (
            <Table
              columns={[
                { header: '', style: { width: '50px' } },
                { header: 'Titre' },
                { header: 'Pasteur' },
                { header: 'Date' },
                { header: 'Téléchargements' },
                { header: 'Actions', style: { textAlign: 'right' } }
              ]}
            >
                  {docsPagination.length > 0 ? (
                    docsPagination.map((doc) => (
                      <tr key={doc.id} className="datatable-row">
                        <td className="cell-image">
                          {doc.image_couverture || doc.url_image_couverture ? (
                            <div className="image-wrapper">
                              <img src={doc.image_couverture || doc.url_image_couverture} alt={doc.titre} onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                          ) : (
                            <DocumentIcon url={doc.fichier || doc.url_fichier} size={24} className="image-wrapper" />
                          )}
                        </td>
                        <td className="cell-title" title={doc.titre}>
                          {doc.titre}
                        </td>
                        <td>
                          {doc.pasteur?.nom_affichage || '-'}
                        </td>
                        <td>
                          {doc.cree_le ? new Date(doc.cree_le).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b' }}>
                            <FileDown size={14} />
                            {doc.nombre_telechargements || 0}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                          <div className="cell-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '0.5rem' }}>
                            {(doc.fichier || doc.url_fichier) && (
                              <button type="button" className="btn-action btn-icon-only btn-download" onClick={() => handleDownload(doc)} title="Télécharger">
                                <Download size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <FileText size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem', display: 'block' }} />
                        Aucun document ne correspond à vos critères.
                      </td>
                    </tr>
                  )}
            </Table>
          )}

          {!chargement && !erreur && docsPagination.length > 0 && (
            <div className="datatable-footer-pagination">
              <span>Affichage de {(page - 1) * ELEMENTS_PAR_PAGE + 1} à {Math.min(page * ELEMENTS_PAR_PAGE, documentsFiltres.length)} sur {documentsFiltres.length}</span>
              <Pagination current={page} total={totalPages} onChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Documents;
