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

// Repli sur '/api' : la pile Docker de production sert le front et l'API
// derriere le meme nginx, qui proxifie ce chemin. Sans ce repli, un build ou
// la variable manque produisait un baseURL `undefined` — axios repliait alors
// sur l'origine du site et chaque appel partait vers le front, en 404.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const session = lireSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Global response interceptor to handle authentication failures
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    if (error.response?.status === 401 && !url.includes('/auth/connexion') && !url.includes('/auth/rafraichir/')) {
      if (!originalRequest._retry) {
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers.Authorization = 'Bearer ' + token;
              return api(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const session = lireSession();
        if (session && session.refreshToken) {
          try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/rafraichir/`, {
              refresh: session.refreshToken
            });

            const newSession = {
              ...session,
              accessToken: res.data.access
            };
            if (res.data.refresh) {
               newSession.refreshToken = res.data.refresh;
            }
            enregistrerSession(newSession);

            api.defaults.headers.common['Authorization'] = 'Bearer ' + newSession.accessToken;
            originalRequest.headers.Authorization = 'Bearer ' + newSession.accessToken;

            processQueue(null, newSession.accessToken);
            return api(originalRequest);
          } catch (err) {
            processQueue(err, null);
            effacerSession();
            window.location.href = '/compte-fidele';
            return Promise.reject(err);
          } finally {
            isRefreshing = false;
          }
        } else {
          effacerSession();
          window.location.href = '/compte-fidele';
          return Promise.reject(error);
        }
      }
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

/**
 * Journalise une lecture (audio ou video) sur la plateforme : incremente
 * nombre_vues et alimente le journal analytique du pasteur. Ouvert aux
 * visiteurs non connectes (comme les vues YouTube), donc pas d'intercepteur
 * de token requis ici.
 * @param {number|string} predicationId
 */
export async function journaliserLecture(predicationId) {
  await api.post(`/predications/${predicationId}/journaliser_lecture/`);
}
