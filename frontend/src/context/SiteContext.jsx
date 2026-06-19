import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const SiteContext = createContext();

export function SiteProvider({ children }) {
  const [siteConfig, setSiteConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSiteConfig = async () => {
    try {
      const response = await api.get('/configuration/current/');
      setSiteConfig(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration du site:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteConfig();
  }, []);

  return (
    <SiteContext.Provider value={{ siteConfig, loading, refetchSiteConfig: fetchSiteConfig }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite doit être utilisé à l\'intérieur d\'un SiteProvider');
  }
  return context;
}
