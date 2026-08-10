/**
 * Validation côté client des fichiers téléversés (extension + taille).
 *
 * Reproduit à l'identique le seuil du serveur
 * (backend/api/serializers/contenu.py, valider_fichier_uploade :
 * taille_max_mo * 1024 * 1024). Un désaccord sur la définition du
 * mégaoctet (1024*1024 contre 1000*1000, comme le faisait une des
 * versions dupliquées de cette validation) ferait refuser côté client des
 * fichiers que le serveur aurait pourtant acceptés.
 *
 * Retourne une chaîne vide si le fichier convient, sinon un message
 * d'erreur. `messageFormatInvalide`/`messageTropVolumineux` permettent à
 * un appelant de fournir son propre libellé (ex. traduit via i18n) sans
 * dupliquer la logique de vérification elle-même.
 */
export function verifierFichier(fichier, {
  extensions,
  tailleMaxMo,
  messageFormatInvalide,
  messageTropVolumineux,
}) {
  if (!fichier) return '';

  const extension = (fichier.name.split('.').pop() || '').toLowerCase();
  if (!extensions.includes(extension)) {
    return messageFormatInvalide
      ? messageFormatInvalide(extension)
      : `Format non supporté (${extension || 'inconnu'}). Formats acceptés : ${extensions.join(', ')}.`;
  }

  if (fichier.size > tailleMaxMo * 1024 * 1024) {
    const tailleMo = (fichier.size / (1024 * 1024)).toFixed(1);
    return messageTropVolumineux
      ? messageTropVolumineux(tailleMo)
      : `Fichier trop volumineux (${tailleMo} Mo). Maximum : ${tailleMaxMo} Mo.`;
  }

  return '';
}
