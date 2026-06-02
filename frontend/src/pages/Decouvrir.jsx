import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { SermonCard } from '../components/SermonCard';
import { api } from '../services/api';
import './Decouvrir.css';

export function Decouvrir() {
  const [predications, setPredications] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [typeMedia, setTypeMedia] = useState('');
  const [categorieActive, setCategorieActive] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let active = true;

    async function charger() {
      try {
        setChargement(true);
        const params = {};
        if (recherche.trim()) {
          params.search = recherche.trim();
        }
        if (typeMedia) {
          params.type_media = typeMedia;
        }

        const response = await api.get('/predications/', { params });
        if (active) {
          setPredications(response.data);
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || 'Impossible de charger les predications.');
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
  }, [recherche, typeMedia]);

  const categories = useMemo(() => {
    const uniques = new Map();
    predications.forEach((predication) => {
      predication.categories.forEach((categorie) => {
        uniques.set(categorie.nom, categorie.nom);
      });
    });
    return Array.from(uniques.values());
  }, [predications]);

  const predicationsFiltrees = useMemo(() => {
    if (!categorieActive) {
      return predications;
    }
    return predications.filter((predication) =>
      predication.categories.some((categorie) => categorie.nom === categorieActive)
    );
  }, [categorieActive, predications]);

  return (
    <section className="decouvrir-page">
      <header className="decouvrir-hero">
        <p className="section-kicker">Explorer</p>
        <h1>Decouvrir les predications</h1>
        <p>
          Cherchez par theme, type de media ou pasteur, puis trouvez rapidement la bonne
          predication pour votre moment d'ecoute.
        </p>
        {!chargement && !erreur ? (
          <div className="decouvrir-summary">
            <span>{predicationsFiltrees.length} resultat{predicationsFiltrees.length > 1 ? 's' : ''}</span>
            {categorieActive ? <span>Categorie: {categorieActive}</span> : null}
          </div>
        ) : null}
      </header>

      <section className="glass-card decouvrir-toolbar">
        <label className="decouvrir-search">
          <Search size={18} />
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Titre, description ou pasteur"
          />
        </label>

        <label className="decouvrir-filter">
          <SlidersHorizontal size={18} />
          <select value={typeMedia} onChange={(event) => setTypeMedia(event.target.value)}>
            <option value="">Tous les medias</option>
            <option value="AUDIO">Audio</option>
            <option value="VIDEO">Video</option>
            <option value="BOTH">Audio + Video</option>
          </select>
        </label>
      </section>

      {categories.length ? (
        <div className="decouvrir-categories">
          <button
            className={`category-pill ${categorieActive === '' ? 'active' : ''}`}
            onClick={() => setCategorieActive('')}
            type="button"
          >
            Toutes
          </button>
          {categories.map((categorie) => (
            <button
              key={categorie}
              className={`category-pill ${categorieActive === categorie ? 'active' : ''}`}
              onClick={() => setCategorieActive(categorie)}
              type="button"
            >
              {categorie}
            </button>
          ))}
        </div>
      ) : null}

      {chargement ? <p className="page-state">Chargement des predications...</p> : null}
      {erreur ? <p className="page-state error">{erreur}</p> : null}

      {!chargement && !erreur ? (
        predicationsFiltrees.length ? (
          <div className="grid sermon-grid">
            {predicationsFiltrees.map((predication) => (
              <SermonCard key={predication.id} sermon={predication} />
            ))}
          </div>
        ) : (
          <p className="page-state">Aucune predication ne correspond a cette recherche.</p>
        )
      ) : null}
    </section>
  );
}
