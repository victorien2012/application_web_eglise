import { useState } from 'react';
import { ListFilter, ChevronDown } from 'lucide-react';
import './SearchFilterPanel.css';

/**
 * Bandeau de critères de recherche repliable : mêmes rôles que sur la
 * maquette de référence (icône + titre, grille de champs libres passés en
 * enfants, Réinitialiser / Rechercher alignés à droite). Les champs
 * eux-mêmes restent à la charge de l'appelant (types, options, valeurs) —
 * ce composant ne fait que le cadre, l'agencement en grille et le
 * comportement (repli, soumission).
 */
export function SearchFilterPanel({
  title = 'Critères de recherche',
  children,
  onSearch,
  onReset,
  defaultOpen = true,
  avertissement,
}) {
  const [ouvert, setOuvert] = useState(defaultOpen);

  function soumettre(evenement) {
    evenement.preventDefault();
    onSearch?.();
  }

  return (
    <>
      {avertissement && (
        <div className="sfp-avertissement" role="status">
          {avertissement}
        </div>
      )}

      <form className="sfp-panneau" onSubmit={soumettre}>
        <button
          type="button"
          className="sfp-entete"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
        >
          <span className="sfp-entete-titre">
            <ListFilter size={16} aria-hidden="true" />
            {title}
          </span>
          <ChevronDown size={18} className={`sfp-chevron ${ouvert ? 'sfp-chevron-ouvert' : ''}`} aria-hidden="true" />
        </button>

        {ouvert && (
          <>
            <div className="sfp-grille">{children}</div>

            <div className="sfp-pied">
              <button type="button" className="sfp-btn sfp-btn-reset" onClick={onReset}>
                Réinitialiser les critères de recherche
              </button>
              <button type="submit" className="sfp-btn sfp-btn-search">
                Rechercher
              </button>
            </div>
          </>
        )}
      </form>
    </>
  );
}

/** Champ labellisé standard de la grille — <label> + input/select/date. */
export function ChampFiltre({ label, children }) {
  return (
    <label className="sfp-champ">
      <span>{label}</span>
      {children}
    </label>
  );
}
