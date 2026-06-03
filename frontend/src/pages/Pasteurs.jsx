import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api, extraireListe } from '../services/api';
import './Pasteurs.css';

export function Pasteurs() {
  const [pasteurs, setPasteurs] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let active = true;

    async function charger() {
      try {
        setChargement(true);
        const response = await api.get('/pasteurs/', {
          params: recherche.trim() ? { search: recherche.trim() } : {},
        });
        if (active) {
          setPasteurs(extraireListe(response.data));
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || 'Impossible de charger les pasteurs.');
        }
      } finally {
        if (active) {
          setChargement(false);
        }
      }
    }

    charger();
    return () => {
      active = false;
    };
  }, [recherche]);

  const pasteursAffiches = useMemo(() => pasteurs, [pasteurs]);

  return (
    <section className="pasteurs-page">
      <header className="pasteurs-hero">
        <p className="section-kicker">Communautes</p>
        <h1>Pasteurs et eglises</h1>
        <p>
          Parcourez les ministeres presentes sur la plateforme et retrouvez leurs predications,
          leurs series et leurs thematiques.
        </p>
        {!chargement && !erreur ? (
          <div className="pasteurs-summary">
            <span>{pasteursAffiches.length} profil{pasteursAffiches.length > 1 ? 's' : ''}</span>
          </div>
        ) : null}
      </header>

      <section className="glass-card pasteurs-toolbar">
        <label className="pasteurs-search">
          <Search size={18} />
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un pasteur ou une eglise"
          />
        </label>
      </section>

      {chargement ? <p className="page-state">Chargement des pasteurs...</p> : null}
      {erreur ? <p className="page-state error">{erreur}</p> : null}

      {!chargement && !erreur ? (
        pasteursAffiches.length ? (
          <div className="pasteurs-grid">
            {pasteursAffiches.map((pasteur) => (
              <Link key={pasteur.id} to={`/pasteurs/${pasteur.id}`} className="pasteur-card glass-card">
                <div className="pasteur-avatar">
                  {pasteur.avatar ? (
                    <img src={pasteur.avatar} alt={pasteur.nom_affichage} />
                  ) : (
                    <span>{pasteur.nom_affichage.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h2>{pasteur.nom_affichage}</h2>
                  <p className="pasteur-eglise">{pasteur.nom_eglise || 'Eglise non renseignee'}</p>
                  <p className="pasteur-bio">
                    {pasteur.biographie || 'Profil en cours de presentation.'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="page-state">Aucun pasteur ne correspond a cette recherche.</p>
        )
      ) : null}
    </section>
  );
}
