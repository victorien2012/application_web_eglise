import axios from 'axios';

const STORAGE_KEY = 'eglise_auth';

export function lireSession() {
  try {
    const brute = window.localStorage.getItem(STORAGE_KEY);
    return brute ? JSON.parse(brute) : null;
  } catch {
    return null;
  }
}

export function enregistrerSession(session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function effacerSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Normalise une reponse de liste: accepte un tableau brut (API non paginee)
 * ou un objet pagine DRF { count, next, previous, results }.
 */
export function extraireListe(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const session = lireSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// Global response interceptor to handle authentication failures
api.interceptors.response.use(
  response => response,
  error => {
    const url = error.config?.url || '';
    if (error.response && error.response.status === 401 && !url.includes('/auth/connexion')) {
      // Token invalid or expired – clear session and redirect to login
      effacerSession();
      // Simple redirect; a full React navigation would require context
      window.location.href = '/compte-fidele';
    }
    return Promise.reject(error);
  }
);

/**
 * Telecharge un fichier de predication via l'endpoint protege (exige un compte connecte).
 * Le token JWT est ajoute automatiquement par l'intercepteur ci-dessus.
 * @param {number|string} predicationId
 * @param {'audio'|'video'} format
 */
export async function telechargerRessource(predicationId, format = 'audio') {
  const reponse = await api.get(`/predications/${predicationId}/telecharger/?media=${format}`, {
    responseType: 'blob',
  });

  // Recupere le nom de fichier suggere par l'en-tete Content-Disposition.
  const entete = reponse.headers['content-disposition'] || '';
  const correspondance = entete.match(/filename="?([^"]+)"?/);
  const nomFichier = correspondance ? correspondance[1] : `predication-${predicationId}`;

  const url = window.URL.createObjectURL(reponse.data);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Recupere le lien direct via yt-dlp sur le serveur et lance le telechargement (redirection native du navigateur).
 * @param {number|string} predicationId 
 * @param {'audio'|'video'} format 
 */
export async function telechargerRessourceExterne(predicationId, format = 'video') {
  const reponse = await api.get(`/predications/${predicationId}/lien_telechargement_externe/?media=${format}`);
  if (reponse.data?.url) {
    // Rediriger le navigateur vers l'url directe du flux video/audio
    window.location.href = reponse.data.url;
  }
}
