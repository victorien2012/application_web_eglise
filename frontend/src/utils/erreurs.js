/**
 * Extraction d'un message lisible depuis une réponse d'erreur Axios/DRF.
 *
 * Une erreur DRF prend plusieurs formes selon son origine : une simple
 * chaîne, {"detail": "..."}, ou {"champ": ["message", ...]} pour une
 * erreur de validation par champ. Cette logique de repli (détail, sinon
 * premier champ en erreur, sinon message générique) était réécrite
 * indépendamment dans plusieurs formulaires de l'espace pasteur.
 *
 * Deux options reproduisent les variantes déjà en usage :
 * - avecNomChamp : préfixe le message par le nom du champ fautif
 *   ("titre: Ce champ est requis.") — utile sur un formulaire à plusieurs
 *   champs sans affichage d'erreur inline par champ.
 * - tousLesChamps : au lieu du premier champ en erreur, joint TOUS les
 *   messages ("titre: ... | description: ...") — utile quand plusieurs
 *   champs peuvent échouer à la fois et que l'utilisateur doit tous les
 *   voir en un seul passage.
 *
 * Ne couvre pas les formulaires qui donnent volontairement la priorité à
 * un champ précis avant "detail" (ex. lien_youtube dans les formulaires de
 * synchronisation) : cette priorité est spécifique au contexte et reste
 * plus claire écrite explicitement au point d'appel.
 */
export function extraireErreurServeur(error, {
  repli = 'Une erreur est survenue.',
  avecNomChamp = false,
  tousLesChamps = false,
} = {}) {
  const donnees = error?.response?.data;
  if (!donnees) return repli;
  if (typeof donnees === 'string') return donnees;
  if (donnees.detail) return donnees.detail;

  const cles = Object.keys(donnees);
  if (!cles.length) return repli;

  if (tousLesChamps) {
    return cles
      .map((cle) => {
        const valeur = donnees[cle];
        const message = Array.isArray(valeur) ? valeur.join(', ') : valeur;
        return `${cle}: ${message}`;
      })
      .join(' | ');
  }

  const premiereCle = cles[0];
  const premiereValeur = donnees[premiereCle];
  const message = Array.isArray(premiereValeur) ? premiereValeur[0] : premiereValeur;
  if (!message) return repli;
  return avecNomChamp ? `${premiereCle}: ${message}` : message;
}
