// src/components/FilterBar.jsx
import { Search } from 'lucide-react';
import './FilterBar.css';

export default function FilterBar({ recherche, setRecherche, filter, setFilter }) {
  return (
    <section className="filter-bar glass-card">
      <label className="filter-search">
        <Search size={18} />
        <input
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          placeholder="Titre, description ou pasteur"
        />
      </label>
      <div className="filter-options">
        <button
          type="button"
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Tous
        </button>
        <button
          type="button"
          className={filter === 'pdf' ? 'active' : ''}
          onClick={() => setFilter('pdf')}
        >
          PDF
        </button>
        <button
          type="button"
          className={filter === 'video' ? 'active' : ''}
          onClick={() => setFilter('video')}
        >
          Vidéo
        </button>
      </div>
    </section>
  );
}
