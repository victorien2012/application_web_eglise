import { createContext, useContext, useEffect, useState } from 'react';
import { api, effacerSession, enregistrerSession, lireSession } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => lireSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function rehydrater() {
      const sessionLocale = lireSession();
      if (!sessionLocale?.accessToken) {
        if (active) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      if (sessionLocale.pasteur) {
        try {
          const response = await api.get('/pasteurs/mon_profil/');
          const prochaineSession = { ...sessionLocale, pasteur: response.data };
          enregistrerSession(prochaineSession);
          if (active) {
            setSession(prochaineSession);
          }
        } catch {
          effacerSession();
          if (active) {
            setSession(null);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
        return;
      }

      if (active) {
        setSession(sessionLocale);
        setLoading(false);
      }
    }

    rehydrater();
    return () => {
      active = false;
    };
  }, []);

  async function connexion({ username, password }) {
    const response = await api.post('/auth/connexion/', { username, password });
    const prochaineSession = {
      accessToken: response.data.access,
      refreshToken: response.data.refresh,
      pasteur: response.data.pasteur,
      emailVerifie: response.data.email_verifie,
      estAdmin: response.data.est_admin,
      contact: response.data.contact,
      username,
    };
    enregistrerSession(prochaineSession);
    setSession(prochaineSession);
    return prochaineSession;
  }

  async function inscription(donnees) {
    // Axios gère automatiquement les FormData avec le bon Content-Type (multipart/form-data)
    const response = await api.post('/auth/inscription/', donnees);
    
    // Si donnees est un FormData, on extrait le username avec .get()
    const extractedUsername = donnees instanceof FormData ? donnees.get('username') : donnees.username;
    
    const prochaineSession = {
      accessToken: response.data.access,
      refreshToken: response.data.refresh,
      pasteur: response.data.pasteur,
      emailVerifie: response.data.email_verifie,
      estAdmin: response.data.est_admin,
      contact: response.data.contact,
      username: extractedUsername,
    };
    enregistrerSession(prochaineSession);
    setSession(prochaineSession);
    return prochaineSession;
  }

  function deconnexion() {
    effacerSession();
    setSession(null);
  }

  function marquerEmailVerifie() {
    setSession((courante) => {
      if (!courante) {
        return courante;
      }
      const prochaineSession = { ...courante, emailVerifie: true };
      enregistrerSession(prochaineSession);
      return prochaineSession;
    });
  }

  async function renvoyerVerification() {
    await api.post('/auth/renvoyer-verification/');
  }

  function actualiserProfilPasteur(nouveauPasteur) {
    setSession((courante) => {
      if (!courante) return courante;
      const prochaineSession = { ...courante, pasteur: { ...courante.pasteur, ...nouveauPasteur } };
      enregistrerSession(prochaineSession);
      return prochaineSession;
    });
  }

  const value = {
    session,
    accessToken: session?.accessToken ?? null,
    pasteur: session?.pasteur ?? null,
    estConnecte: Boolean(session?.accessToken),
    estPasteur: Boolean(session?.pasteur),
    estAdmin: Boolean(session?.estAdmin),
    emailVerifie: session?.emailVerifie ?? false,
    loading,
    connexion,
    inscription,
    deconnexion,
    marquerEmailVerifie,
    renvoyerVerification,
    actualiserProfilPasteur,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider.");
  }
  return context;
}
