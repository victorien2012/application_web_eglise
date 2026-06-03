import { useEffect, useState } from 'react';
import { api, extraireListe } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Gere l'etat "favori" d'une predication pour l'utilisateur connecte.
 */
export function useFavori(predicationId) {
  const { estConnecte } = useAuth();
  const [favoriId, setFavoriId] = useState(null);
  const [pret, setPret] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!estConnecte || !predicationId) {
      setFavoriId(null);
      setPret(true);
      return undefined;
    }
    let active = true;
    setPret(false);
    api
      .get('/favoris/')
      .then((response) => {
        if (!active) return;
        const cible = Number(predicationId);
        const trouve = extraireListe(response.data).find(
          (favori) => favori.predication === cible || favori.predication_detail?.id === cible
        );
        setFavoriId(trouve ? trouve.id : null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPret(true);
      });
    return () => {
      active = false;
    };
  }, [estConnecte, predicationId]);

  async function basculer() {
    if (enCours || !estConnecte) return;
    setEnCours(true);
    try {
      if (favoriId) {
        await api.delete(`/favoris/${favoriId}/`);
        setFavoriId(null);
      } else {
        const response = await api.post('/favoris/', { predication: predicationId });
        setFavoriId(response.data.id);
      }
    } finally {
      setEnCours(false);
    }
  }

  return { estFavori: Boolean(favoriId), basculer, pret, enCours };
}

/**
 * Gere l'etat "abonnement" a un pasteur pour l'utilisateur connecte.
 */
export function useAbonnement(pasteurId) {
  const { estConnecte } = useAuth();
  const [abonnementId, setAbonnementId] = useState(null);
  const [pret, setPret] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!estConnecte || !pasteurId) {
      setAbonnementId(null);
      setPret(true);
      return undefined;
    }
    let active = true;
    setPret(false);
    api
      .get('/abonnements/')
      .then((response) => {
        if (!active) return;
        const cible = Number(pasteurId);
        const trouve = extraireListe(response.data).find(
          (abo) => abo.pasteur === cible || abo.pasteur_detail?.id === cible
        );
        setAbonnementId(trouve ? trouve.id : null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPret(true);
      });
    return () => {
      active = false;
    };
  }, [estConnecte, pasteurId]);

  async function basculer() {
    if (enCours || !estConnecte) return;
    setEnCours(true);
    try {
      if (abonnementId) {
        await api.delete(`/abonnements/${abonnementId}/`);
        setAbonnementId(null);
      } else {
        const response = await api.post('/abonnements/', { pasteur: pasteurId });
        setAbonnementId(response.data.id);
      }
    } finally {
      setEnCours(false);
    }
  }

  return { estAbonne: Boolean(abonnementId), basculer, pret, enCours };
}
