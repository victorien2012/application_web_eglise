import { describe, it, expect } from 'vitest';
import { extraireListe } from './api';

/**
 * `extraireListe` est le point qui rend la pagination optionnelle sans risque :
 * l'API renvoie soit une liste brute (ecrans qui ont besoin de tout : espace
 * pasteur, administration, accueil), soit un objet pagine DRF (page Videos).
 * Si cette fonction cassait, ces ecrans se videraient silencieusement.
 */
describe('extraireListe', () => {
  it('renvoie tel quel un tableau brut (API non paginee)', () => {
    const donnees = [{ id: 1 }, { id: 2 }];
    expect(extraireListe(donnees)).toBe(donnees);
  });

  it('extrait results d une reponse paginee DRF', () => {
    const reponse = {
      count: 1523,
      next: 'http://api/predications/?page=2',
      previous: null,
      results: [{ id: 10 }, { id: 11 }],
    };
    expect(extraireListe(reponse)).toEqual([{ id: 10 }, { id: 11 }]);
  });

  it('renvoie un tableau vide pour une reponse paginee sans element', () => {
    expect(extraireListe({ count: 0, results: [] })).toEqual([]);
  });

  it('renvoie un tableau vide plutot que de planter sur null ou undefined', () => {
    expect(extraireListe(null)).toEqual([]);
    expect(extraireListe(undefined)).toEqual([]);
  });

  it('renvoie un tableau vide si results n est pas un tableau', () => {
    expect(extraireListe({ results: 'inattendu' })).toEqual([]);
    expect(extraireListe({ detail: 'Erreur' })).toEqual([]);
  });

  it('renvoie un tableau vide pour des types inattendus', () => {
    expect(extraireListe('texte')).toEqual([]);
    expect(extraireListe(42)).toEqual([]);
  });
});
