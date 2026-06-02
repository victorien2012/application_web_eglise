import { useEffect, useState } from 'react';
import { BarChart3, Download, Headphones, Mic2, PlusCircle, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import './PastorDashboard.css';

export function PastorDashboard() {
  const [stats, setStats] = useState(null);
  const [predications, setPredications] = useState([]);
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [erreurStats, setErreurStats] = useState('');
  const [erreurFormulaire, setErreurFormulaire] = useState('');
  const [messageFormulaire, setMessageFormulaire] = useState('');
  const [chargementInitial, setChargementInitial] = useState(true);
  const [soumission, setSoumission] = useState(false);
  const [filtrePublication, setFiltrePublication] = useState('tous');
  const [formulaire, setFormulaire] = useState({
    titre: '',
    description: '',
    type_media: 'AUDIO',
    duree_secondes: 0,
    est_publie: true,
    serie: '',
    categories_ids: [],
  });

  useEffect(() => {
    let active = true;

    async function chargerDonnees() {
      try {
        const [statsResponse, predicationsResponse, seriesResponse, categoriesResponse] = await Promise.all([
          api.get('/pasteurs/statistiques_tableau_de_bord/'),
          api.get('/predications/?espace_pasteur=true'),
          api.get('/series/'),
          api.get('/categories/'),
        ]);

        if (active) {
          setStats(statsResponse.data);
          setPredications(predicationsResponse.data);
          setSeries(seriesResponse.data);
          setCategories(categoriesResponse.data);
        }
      } catch (error) {
        if (active) {
          setErreurStats(error.response?.data?.detail || 'Impossible de charger le tableau de bord.');
        }
      } finally {
        if (active) {
          setChargementInitial(false);
        }
      }
    }

    chargerDonnees();
    return () => {
      active = false;
    };
  }, []);

  function mettreAJourChamp(cle, valeur) {
    setFormulaire((actuel) => ({ ...actuel, [cle]: valeur }));
  }

  function basculerCategorie(idCategorie) {
    setFormulaire((actuel) => {
      const presente = actuel.categories_ids.includes(idCategorie);
      return {
        ...actuel,
        categories_ids: presente
          ? actuel.categories_ids.filter((id) => id !== idCategorie)
          : [...actuel.categories_ids, idCategorie],
      };
    });
  }

  async function rechargerResume() {
    const [statsResponse, predicationsResponse] = await Promise.all([
      api.get('/pasteurs/statistiques_tableau_de_bord/'),
      api.get('/predications/?espace_pasteur=true'),
    ]);
    setStats(statsResponse.data);
    setPredications(predicationsResponse.data);
  }

  async function handleCreation(event) {
    event.preventDefault();
    setErreurFormulaire('');
    setMessageFormulaire('');
    setSoumission(true);

    try {
      await api.post('/predications/', {
        ...formulaire,
        duree_secondes: Number(formulaire.duree_secondes) || 0,
        serie: formulaire.serie || null,
      });
      setFormulaire({
        titre: '',
        description: '',
        type_media: 'AUDIO',
        duree_secondes: 0,
        est_publie: true,
        serie: '',
        categories_ids: [],
      });
      setMessageFormulaire('Predication creee avec succes.');
      await rechargerResume();
    } catch (error) {
      const details = error.response?.data;
      if (typeof details === 'string') {
        setErreurFormulaire(details);
      } else if (details?.detail) {
        setErreurFormulaire(details.detail);
      } else {
        setErreurFormulaire('La creation de la predication a echoue.');
      }
    } finally {
      setSoumission(false);
    }
  }

  const predicationsFiltrees = predications.filter((predication) => {
    if (filtrePublication === 'publiees') {
      return predication.est_publie;
    }
    if (filtrePublication === 'brouillons') {
      return !predication.est_publie;
    }
    return true;
  });

  if (erreurStats) {
    return (
      <section className="glass-card" style={{ padding: '1.25rem', maxWidth: 760 }}>
        <h1 style={{ marginTop: 0 }}>Mon espace</h1>
        <p style={{ color: '#ffb1b1' }}>{erreurStats}</p>
      </section>
    );
  }

  if (chargementInitial || !stats) {
    return (
      <section className="glass-card" style={{ padding: '1.25rem', maxWidth: 760 }}>
        <h1 style={{ marginTop: 0 }}>Mon espace</h1>
        <p style={{ color: '#bbb' }}>Chargement des statistiques...</p>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="glass-card dashboard-intro">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 0 }}>
          <BarChart3 size={24} />
          Mon espace
        </h1>
        <p style={{ color: '#bbb', lineHeight: 1.6 }}>
          Voici les indicateurs essentiels de vos predications sur les 30 derniers jours.
        </p>
      </div>

      <div className="dashboard-kpis">
        <div className="glass-card dashboard-kpi">
          <Mic2 size={18} />
          <p>Predications</p>
          <strong>{stats.total_predications}</strong>
        </div>
        <div className="glass-card dashboard-kpi">
          <Headphones size={18} />
          <p>Vues et lectures</p>
          <strong>{stats.total_vues}</strong>
        </div>
        <div className="glass-card dashboard-kpi">
          <Download size={18} />
          <p>Telechargements</p>
          <strong>{stats.total_telechargements}</strong>
        </div>
      </div>

      <div className="glass-card dashboard-section">
        <div className="dashboard-header-row">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <PlusCircle size={20} />
              Nouvelle predication
            </h2>
            <p style={{ marginTop: 0, color: '#bbb' }}>
              Creez rapidement une predication de base depuis le web.
            </p>
          </div>
        </div>

        <form className="dashboard-form" onSubmit={handleCreation}>
          <div className="dashboard-grid-2">
            <label className="dashboard-field">
              <span>Titre</span>
              <input
                value={formulaire.titre}
                onChange={(event) => mettreAJourChamp('titre', event.target.value)}
                placeholder="Ex: Marcher dans la foi"
                required
              />
            </label>

            <label className="dashboard-field">
              <span>Type de media</span>
              <select
                value={formulaire.type_media}
                onChange={(event) => mettreAJourChamp('type_media', event.target.value)}
              >
                <option value="AUDIO">Audio</option>
                <option value="VIDEO">Video</option>
                <option value="BOTH">Audio + Video</option>
              </select>
            </label>
          </div>

          <label className="dashboard-field">
            <span>Description</span>
            <textarea
              value={formulaire.description}
              onChange={(event) => mettreAJourChamp('description', event.target.value)}
              placeholder="Resume, contexte, reference biblique..."
            />
          </label>

          <div className="dashboard-grid-2">
            <label className="dashboard-field">
              <span>Duree en secondes</span>
              <input
                type="number"
                min="0"
                value={formulaire.duree_secondes}
                onChange={(event) => mettreAJourChamp('duree_secondes', event.target.value)}
              />
            </label>

            <label className="dashboard-field">
              <span>Serie</span>
              <select
                value={formulaire.serie}
                onChange={(event) => mettreAJourChamp('serie', event.target.value)}
              >
                <option value="">Aucune serie</option>
                {series.map((serie) => (
                  <option key={serie.id} value={serie.id}>{serie.titre}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="dashboard-field">
            <span>Categories</span>
            <div className="dashboard-inline">
              {categories.length ? categories.map((categorie) => (
                <label key={categorie.id} className="dashboard-checkbox">
                  <input
                    type="checkbox"
                    checked={formulaire.categories_ids.includes(categorie.id)}
                    onChange={() => basculerCategorie(categorie.id)}
                  />
                  {categorie.nom}
                </label>
              )) : <span style={{ color: '#bbb' }}>Aucune categorie disponible.</span>}
            </div>
          </div>

          <label className="dashboard-checkbox">
            <input
              type="checkbox"
              checked={formulaire.est_publie}
              onChange={(event) => mettreAJourChamp('est_publie', event.target.checked)}
            />
            Publier immediatement
          </label>

          {erreurFormulaire ? <p className="dashboard-error">{erreurFormulaire}</p> : null}
          {messageFormulaire ? <p className="dashboard-status">{messageFormulaire}</p> : null}

          <div className="dashboard-inline">
            <button className="btn btn-primary" type="submit" disabled={soumission}>
              {soumission ? 'Creation...' : 'Creer la predication'}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card dashboard-section">
        <div className="dashboard-header-row">
          <div>
            <h2 style={{ marginBottom: '0.4rem' }}>Catalogue du pasteur</h2>
            <p style={{ marginTop: 0, color: '#bbb' }}>
              Retrouvez vos predications, leur statut et leurs performances.
            </p>
          </div>
          <label className="dashboard-field" style={{ minWidth: 220 }}>
            <span>Filtrer</span>
            <select value={filtrePublication} onChange={(event) => setFiltrePublication(event.target.value)}>
              <option value="tous">Toutes</option>
              <option value="publiees">Publiees</option>
              <option value="brouillons">Brouillons</option>
            </select>
          </label>
        </div>

        {predicationsFiltrees.length ? (
          <div className="dashboard-list">
            {predicationsFiltrees.map((predication) => (
              <article key={predication.id} className="dashboard-card">
                <div className="dashboard-card-top">
                  <div>
                    <strong>{predication.titre}</strong>
                    <p style={{ margin: '0.4rem 0 0', color: '#bbb' }}>
                      {predication.description || 'Aucune description pour le moment.'}
                    </p>
                  </div>
                  <span className="dashboard-chip">
                    {predication.est_publie ? 'Publiee' : 'Brouillon'}
                  </span>
                </div>
                <div className="dashboard-meta">
                  <span>{predication.type_media}</span>
                  <span>{predication.duree_secondes}s</span>
                  <span>{predication.nombre_vues} vues</span>
                  <span>{predication.nombre_telechargements} telechargements</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="dashboard-empty">Aucune predication pour ce filtre.</p>
        )}
      </div>

      <div className="glass-card dashboard-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 0 }}>
          <TrendingUp size={20} />
          Meilleures predications
        </h2>
        {stats.meilleures_predications.length ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {stats.meilleures_predications.map((predication) => (
              <div
                key={predication.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.9rem 0',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <strong>{predication.titre}</strong>
                  <p style={{ margin: '0.35rem 0 0', color: '#bbb' }}>{predication.type_media}</p>
                </div>
                <div style={{ textAlign: 'right', color: '#ddd' }}>
                  <div>{predication.nombre_vues} vues</div>
                  <div>{predication.nombre_telechargements} telechargements</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#bbb' }}>Aucune predication disponible pour le moment.</p>
        )}
      </div>
    </section>
  );
}
