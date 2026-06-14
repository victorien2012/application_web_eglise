import { Headphones, Sparkles, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <aside className="home-hero-panel-premium">
      <div className="premium-stat-card">
        <div className="premium-stat-icon audio-icon">
          <Headphones size={28} strokeWidth={1.5} />
        </div>
        <div className="premium-stat-content">
          <strong>{valeurs.audio || 0}+</strong>
          <span>{t('hero_panel.audio')}</span>
        </div>
      </div>

      <div className="premium-stat-card">
        <div className="premium-stat-icon video-icon">
          <Video size={28} strokeWidth={1.5} />
        </div>
        <div className="premium-stat-content">
          <strong>{valeurs.video || 0}+</strong>
          <span>{t('hero_panel.video')}</span>
        </div>
      </div>

      <div className="premium-stat-card highlight">
        <div className="premium-stat-icon spark-icon">
          <Sparkles size={28} strokeWidth={1.5} />
        </div>
        <div className="premium-stat-content">
          <strong>{total}+</strong>
          <span>{t('hero_panel.total')}</span>
        </div>
      </div>
    </aside>
  );
}
