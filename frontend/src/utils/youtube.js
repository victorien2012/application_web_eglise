/**
 * Analyse des liens YouTube côté client.
 *
 * Les motifs reproduisent volontairement, à l'identique, ceux du serveur
 * (`_MOTIFS_YOUTUBE` dans backend/api/serializers/contenu.py et
 * `resoudre_channel_id_youtube` dans backend/api/services/youtube_service.py).
 * Toute divergence ferait mentir l'aperçu : un lien annoncé comme valide ici
 * mais refusé là-bas produit une prédication dont `youtube_id` reste vide —
 * donc sans dédoublonnage ni lecteur intégré.
 */

const MOTIFS_VIDEO = [
  /youtube\.com\/watch\?v=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
  /youtube\.com\/shorts\/([\w-]{11})/,
];

/** Identifiant d'une vidéo YouTube, ou null si l'URL n'est pas reconnue. */
export function extraireIdVideoYoutube(url) {
  if (!url) return null;
  for (const motif of MOTIFS_VIDEO) {
    const correspondance = motif.exec(url);
    if (correspondance) return correspondance[1];
  }
  return null;
}

/** Miniature d'une vidéo YouTube à partir de son identifiant. */
export function miniatureYoutube(idVideo) {
  return `https://img.youtube.com/vi/${idVideo}/hqdefault.jpg`;
}

/**
 * Formats de lien de chaîne que le serveur sait résoudre.
 * Retourne le type reconnu, ou null.
 */
export function typeLienChaineYoutube(lien) {
  const valeur = (lien || '').trim();
  if (!valeur) return null;
  if (/\/channel\/UC[\w-]{22}/.test(valeur)) return 'channel';
  if (/^UC[\w-]{22}$/.test(valeur)) return 'id';
  if (/@[\w.-]+/.test(valeur)) return 'handle';
  if (/\/user\/[\w-]+/.test(valeur)) return 'user';
  if (/\/c\/[\w.-]+/.test(valeur)) return 'personnalise';
  return null;
}

/** Vrai si le serveur saura résoudre ce lien de chaîne. */
export function estLienChaineValide(lien) {
  return typeLienChaineYoutube(lien) !== null;
}
