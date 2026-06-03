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
