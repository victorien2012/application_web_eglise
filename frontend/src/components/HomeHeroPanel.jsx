import { Headphones, Sparkles, Video } from 'lucide-react';
import './HomeHeroPanel.css';

const FONCTIONNALITES = [
  {
    icone: Headphones,
    texte: 'Ecoute simple et lecture video',
  },
  {
    icone: Sparkles,
    texte: 'Navigation par pasteur et par type de media',
  },
];

const STATUTS = [
  {
    cle: 'audio',
    icone: Headphones,
    libelle: 'Format audio',
  },
  {
    cle: 'video',
    icone: Video,
    libelle: 'Format video',
  },
];

export function HomeHeroPanel({ total, audio, video }) {
  const valeurs = { audio, video };

  return (
    <aside className="home-hero-panel">
      <div className="home-hero-panel-badge">
        <Sparkles size={15} />
        <span>
          {total} predication{total > 1 ? 's' : ''} publique{total > 1 ? 's' : ''}
        </span>
      </div>

      <div className="home-hero-panel-divider" />

      <div className="home-hero-panel-stats">
        {STATUTS.map((statut) => {
          const Icone = statut.icone;
          return (
            <div key={statut.cle} className="home-hero-panel-stat-card">
              <div className="home-hero-panel-stat-icon">
                <Icone size={16} />
              </div>
              <strong>{valeurs[statut.cle]}</strong>
              <span>{statut.libelle}</span>
            </div>
          );
        })}
      </div>

      <div className="home-hero-panel-divider" />

      <div className="home-hero-panel-features">
        {FONCTIONNALITES.map((fonctionnalite) => {
          const Icone = fonctionnalite.icone;
          return (
            <div key={fonctionnalite.texte} className="home-hero-panel-feature">
              <Icone size={16} />
              <span>{fonctionnalite.texte}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
