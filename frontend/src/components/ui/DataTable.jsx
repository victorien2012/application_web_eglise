import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown, FileSpreadsheet, Search } from 'lucide-react';
import Pagination from '../Pagination';
import { exporterCsv } from '../../utils/exportCsv';
import './Table.css';
import './DataTable.css';

const TAILLES_PAGE_DEFAUT = [10, 25, 50, 100];

/**
 * Tableau générique : recherche rapide, tri par colonne, export CSV/Excel,
 * pagination et sélection multiple optionnelle. Les colonnes suivent la même
 * forme que le composant Table existant ({ header, field, render, style,
 * cellStyle }), avec deux ajouts optionnels : sortValue(row) rend la colonne
 * triable, exportValue(row) contrôle ce qui part dans l'export (par défaut,
 * la valeur brute de `field` — nécessaire dès qu'une colonne affiche du JSX
 * via `render` plutôt qu'un champ simple).
 *
 * Mode serverSide : pour les listes trop volumineuses pour être chargées
 * d'un coup (predications admin : 1500+ lignes). `data` ne contient alors
 * que la page courante déjà filtrée/paginée par le serveur — la recherche,
 * le tri et le découpage interne sont désactivés (le parent les pilote via
 * ses propres filtres et `onPageChange`), seuls l'affichage, l'export de la
 * page visible et la navigation restent gérés ici.
 */
export function DataTable({
  columns,
  data,
  keyExtractor,
  searchable = true,
  searchPlaceholder = 'Rechercher...',
  searchFields,
  selectable = false,
  onSelectionChange,
  exportable = true,
  exportFilename = 'export',
  pageSizeOptions = TAILLES_PAGE_DEFAUT,
  defaultPageSize = TAILLES_PAGE_DEFAUT[0],
  emptyMessage = 'Aucun élément trouvé.',
  toolbarExtra,
  rowStyle,
  serverSide = false,
  totalItems,
  page: pageControlee,
  onPageChange,
  pageSize: taillePageServeur,
}) {
  const [recherche, setRecherche] = useState('');
  const [pageInterne, setPageInterne] = useState(1);
  const [taillePage, setTaillePage] = useState(defaultPageSize);
  const [tri, setTri] = useState(null); // { cle, direction: 'asc' | 'desc' }
  const [selection, setSelection] = useState(() => new Set());

  const rechercheActive = searchable && !serverSide;

  const extraireCle = (ligne, index) => (keyExtractor ? keyExtractor(ligne) : index);

  // Recherche texte libre : sur les champs déclarés (searchFields), ou à
  // défaut sur toutes les valeurs de type chaîne/nombre de la ligne — évite
  // d'exiger une config pour le cas courant où toutes les colonnes visibles
  // viennent directement des champs de la ligne.
  const donneesFiltrees = useMemo(() => {
    if (serverSide) return data;
    const q = recherche.trim().toLowerCase();
    if (!q) return data;
    return data.filter((ligne) => {
      const valeurs = searchFields
        ? searchFields.map((champ) => ligne[champ])
        : Object.values(ligne);
      return valeurs.some(
        (valeur) =>
          (typeof valeur === 'string' || typeof valeur === 'number') &&
          String(valeur).toLowerCase().includes(q)
      );
    });
  }, [data, recherche, searchFields, serverSide]);

  const donneesTriees = useMemo(() => {
    if (serverSide || !tri) return donneesFiltrees;
    const colonne = columns.find((c) => c.key === tri.cle);
    if (!colonne?.sortValue) return donneesFiltrees;
    const copie = [...donneesFiltrees];
    copie.sort((a, b) => {
      const va = colonne.sortValue(a);
      const vb = colonne.sortValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' });
    });
    if (tri.direction === 'desc') copie.reverse();
    return copie;
  }, [donneesFiltrees, tri, columns, serverSide]);

  // En mode serveur, `data` EST la page courante : ni tri ni découpage
  // supplémentaires, page/total viennent des props pilotées par le parent.
  const totalPages = serverSide
    ? Math.max(1, Math.ceil((totalItems ?? data.length) / (taillePageServeur || data.length || 1)))
    : Math.max(1, Math.ceil(donneesTriees.length / taillePage));
  const pageCourante = serverSide ? (pageControlee || 1) : Math.min(pageInterne, totalPages);
  const debut = serverSide ? (pageCourante - 1) * (taillePageServeur || data.length || 0) : (pageCourante - 1) * taillePage;
  const donneesPage = serverSide ? data : donneesTriees.slice(debut, debut + taillePage);
  const totalAffiche = serverSide ? (totalItems ?? data.length) : donneesTriees.length;

  function changerPage(nouvellePage) {
    if (serverSide) onPageChange?.(nouvellePage);
    else setPageInterne(nouvellePage);
  }

  function changerRecherche(valeur) {
    setRecherche(valeur);
    setPageInterne(1);
  }

  function changerTaillePage(valeur) {
    setTaillePage(Number(valeur));
    setPageInterne(1);
  }

  function basculerTri(cle) {
    setTri((actuel) => {
      if (!actuel || actuel.cle !== cle) return { cle, direction: 'asc' };
      if (actuel.direction === 'asc') return { cle, direction: 'desc' };
      return null;
    });
  }

  function notifierSelection(prochaine) {
    setSelection(prochaine);
    onSelectionChange?.(Array.from(prochaine));
  }

  function basculerLigne(cle) {
    const prochaine = new Set(selection);
    if (prochaine.has(cle)) prochaine.delete(cle);
    else prochaine.add(cle);
    notifierSelection(prochaine);
  }

  function basculerTout() {
    if (selection.size === donneesPage.length && donneesPage.length > 0) {
      notifierSelection(new Set());
    } else {
      notifierSelection(new Set(donneesPage.map((ligne, i) => extraireCle(ligne, i))));
    }
  }

  function exporter() {
    // En mode serveur, seule la page chargée est exportable — pas de second
    // appel réseau dédié à l'export ici.
    exporterCsv(exportFilename, columns.filter((c) => c.key !== '__selection__'), donneesTriees);
  }

  const toutCoche = donneesPage.length > 0 && selection.size === donneesPage.length;

  return (
    <div className="datatable-conteneur">
      <div className="datatable-barre-outils">
        <div className="datatable-barre-gauche">
          {!serverSide && (
            <label className="datatable-taille-page">
              Afficher
              <select value={taillePage} onChange={(e) => changerTaillePage(e.target.value)}>
                {pageSizeOptions.map((taille) => (
                  <option key={taille} value={taille}>{taille}</option>
                ))}
              </select>
              éléments
            </label>
          )}

          {exportable && (
            <button
              type="button"
              className="datatable-btn-export"
              onClick={exporter}
              disabled={donneesTriees.length === 0}
              title={serverSide ? 'Exporter la page affichée au format Excel (CSV)' : 'Exporter au format Excel (CSV)'}
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>
          )}

          {toolbarExtra}
        </div>

        {rechercheActive && (
          <div className="datatable-recherche">
            <Search size={16} aria-hidden="true" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => changerRecherche(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>
        )}
      </div>

      {donneesPage.length === 0 ? (
        <div className="datatable-vide">{emptyMessage}</div>
      ) : (
        <div className="datatable-responsive">
          <table className="premium-table datatable-triable">
            <thead>
              <tr>
                {columns.map((colonne) => (
                  <th
                    key={colonne.key}
                    style={colonne.style}
                    className={colonne.sortValue ? 'datatable-th-triable' : undefined}
                    onClick={colonne.sortValue ? () => basculerTri(colonne.key) : undefined}
                    aria-sort={
                      tri?.cle === colonne.key
                        ? (tri.direction === 'asc' ? 'ascending' : 'descending')
                        : undefined
                    }
                  >
                    <span className="datatable-th-contenu">
                      {colonne.header}
                      {colonne.sortValue ? (
                        tri?.cle === colonne.key ? (
                          tri.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                        ) : (
                          <ChevronsUpDown size={13} className="datatable-icone-tri-inactive" />
                        )
                      ) : null}
                    </span>
                  </th>
                ))}
                {selectable && (
                  <th style={{ width: '44px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={toutCoche}
                      onChange={basculerTout}
                      aria-label="Sélectionner tous les éléments de la page"
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {donneesPage.map((ligne, i) => {
                const cle = extraireCle(ligne, i);
                return (
                  <tr key={cle} className="datatable-row" style={rowStyle ? rowStyle(ligne) : undefined}>
                    {columns.map((colonne) => (
                      <td key={colonne.key} style={colonne.cellStyle} className={colonne.className || ''}>
                        {colonne.render ? colonne.render(ligne) : ligne[colonne.field]}
                      </td>
                    ))}
                    {selectable && (
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selection.has(cle)}
                          onChange={() => basculerLigne(cle)}
                          aria-label="Sélectionner cette ligne"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {donneesPage.length > 0 && (
        <div className="datatable-pied">
          <span className="datatable-info-pagination">
            Affichage de {Math.min(debut + 1, totalAffiche)} à {Math.min(debut + donneesPage.length, totalAffiche)} sur {totalAffiche} élément{totalAffiche > 1 ? 's' : ''}
          </span>
          <Pagination current={pageCourante} total={totalPages} onChange={changerPage} />
        </div>
      )}
    </div>
  );
}
