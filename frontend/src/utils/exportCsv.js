// Export "Excel" au format CSV plutôt qu'un vrai .xlsx : Excel l'ouvre
// nativement sans dépendance supplémentaire côté client. Point-virgule comme
// séparateur (et non virgule) car Excel en locale française interprète la
// virgule comme séparateur décimal — un CSV à virgules s'ouvrirait en une
// seule colonne.
export function exporterCsv(nomFichier, colonnes, lignes) {
  const echapper = (valeur) => {
    const texte = valeur === null || valeur === undefined ? '' : String(valeur);
    return `"${texte.replace(/"/g, '""')}"`;
  };

  const entetes = colonnes.map((colonne) => echapper(colonne.header)).join(';');
  const corps = lignes
    .map((ligne) =>
      colonnes
        .map((colonne) => {
          const valeur = colonne.exportValue
            ? colonne.exportValue(ligne)
            : colonne.field
              ? ligne[colonne.field]
              : '';
          return echapper(valeur);
        })
        .join(';')
    )
    .join('\r\n');

  // BOM UTF-8 : sans lui, Excel affiche les caractères accentués comme du
  // charabia au lieu de les décoder en UTF-8.
  const BOM_UTF8 = '﻿';
  const contenu = BOM_UTF8 + entetes + '\r\n' + corps;
  const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `${nomFichier}.csv`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
