import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SermonCard } from '../components/SermonCard';
import { api, extraireListe } from '../services/api';
import './Decouvrir.css';

export function Decouvrir() {
  const { t } = useTranslation();
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
          setPredications(extraireListe(response.data));
          setErreur('');
        }
      } catch (error) {
        if (active) {
          setErreur(error.response?.data?.detail || t('discover.load_error'));
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
        <p className="section-kicker">{t('discover.kicker')}</p>
        <h1>{t('discover.title')}</h1>
        <p>
          {t('discover.subtitle')}
        </p>
        {!chargement && !erreur ? (
          <div className="decouvrir-summary">
            <span>{predicationsFiltrees.length} {predicationsFiltrees.length > 1 ? t('discover.result_plural') : t('discover.result_singular')}</span>
            {categorieActive ? <span>{t('discover.category')} {categorieActive}</span> : null}
          </div>
        ) : null}
      </header>

      <section className="glass-card decouvrir-toolbar">
        <label className="decouvrir-search">
          <Search size={18} />
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder={t('discover.search_placeholder')}
          />
        </label>

        <label className="decouvrir-filter">
          <SlidersHorizontal size={18} />
          <select value={typeMedia} onChange={(event) => setTypeMedia(event.target.value)}>
            <option value="">{t('discover.all_media')}</option>
            <option value="AUDIO">{t('discover.audio_only')}</option>
            <option value="VIDEO">{t('discover.video_only')}</option>
            <option value="BOTH">{t('discover.audio_video')}</option>
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
            {t('discover.all_categories')}
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

      {chargement ? <p className="page-state">{t('discover.loading')}</p> : null}
      {erreur ? <p className="page-state error">{erreur}</p> : null}

      {!chargement && !erreur ? (
        predicationsFiltrees.length ? (
          <div className="grid sermon-grid">
            {predicationsFiltrees.map((predication) => (
              <SermonCard key={predication.id} sermon={predication} />
            ))}
          </div>
        ) : (
          <p className="page-state">{t('discover.no_results')}</p>
        )
      ) : null}
    </section>
  );
}
