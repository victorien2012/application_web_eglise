import React from 'react';
import { Film, Mic2, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components/ui/Badge';
import { DataTable } from '../../../components/ui/DataTable';
import { miniaturePredication } from '../../../utils/youtube';

// Logique partagée avec SermonCard et la page d'accueil : une couverture
// enregistrée mais introuvable bascule sur la miniature YouTube.
function extraireImage(p) {
  return miniaturePredication(p).source;
}

// Recherche et pagination restent gérées par les pages appelantes (Videos,
// PastorDashboard) — certaines les partagent avec une vue grille qui n'existe
// pas ici. DataTable n'est donc utilisé que comme moteur de rendu du tableau
// (variant="site" pour garder la charte bleu marine/ambre du reste du site).
export function SermonTable({
  predications,
  showStatus = false,
  showCheckbox = false,
  selectionnes = [],
  onToggleAll,
  onToggleOne,
  renderActions,
  onImageClick
}) {
  const { t } = useTranslation();

  const columns = [
    {
      key: 'image',
      header: t('dashboard.col_image', 'Image'),
      className: 'cell-image',
      render: (p) => {
        const isVideo = p.type_media === 'VIDEO' || !!p.url_video;
        const imageUrl = extraireImage(p);
        return imageUrl ? (
          <div className="image-wrapper" onClick={() => onImageClick && onImageClick(p)} style={{ cursor: onImageClick && isVideo ? 'pointer' : 'default' }}>
            {/* Bascule vers la miniature YouTube quand la couverture
                enregistree est introuvable. Le repli precedent pointait vers
                via.placeholder.com, un service tiers : une image cassee y
                etait remplacee par une autre image cassee des que ce service
                devenait indisponible. */}
            <img
              src={imageUrl}
              alt={p.titre}
              onError={(e) => {
                const repli = miniaturePredication(p).repli;
                if (repli && e.currentTarget.src !== repli) {
                  e.currentTarget.src = repli;
                } else {
                  e.currentTarget.style.display = 'none';
                }
              }}
            />
            {isVideo && <div className="play-overlay-mini"><Play size={14} fill="white" color="white" /></div>}
          </div>
        ) : (
          <div className="media-indicator image-wrapper" onClick={() => onImageClick && onImageClick(p)} style={{ cursor: onImageClick && isVideo ? 'pointer' : 'default', width: '48px', height: '36px' }}>
            {isVideo ? (
              <>
                <Film size={18} />
                <div className="play-overlay-mini"><Play size={14} fill="white" color="white" /></div>
              </>
            ) : <Mic2 size={18} />}
          </div>
        );
      },
    },
    {
      key: 'date_predication',
      header: t('dashboard.col_date_predication', 'Date de prédication'),
      sortValue: (p) => p.date_predication || '',
      render: (p) => (p.date_predication ? new Date(p.date_predication).toLocaleDateString() : '-'),
    },
    {
      key: 'titre',
      header: t('dashboard.col_title', 'Titre'),
      className: 'cell-title',
      sortValue: (p) => p.titre || '',
      render: (p) => <span title={p.titre}>{p.titre || t('videos.untitled', 'Sans titre')}</span>,
    },
    {
      key: 'pasteur',
      header: t('videos.th_pastor', 'Pasteur'),
      sortValue: (p) => p.nom_predicateur || p.pasteur?.nom_affichage || '',
      render: (p) => p.nom_predicateur || p.pasteur?.nom_affichage || '-',
    },
  ];

  if (showStatus) {
    columns.push({
      key: 'statut',
      header: t('dashboard.col_status', 'Statut'),
      render: (p) => (
        <Badge variant={p.est_planifiee ? 'scheduled' : p.est_publie ? 'published' : 'draft'}>
          {p.est_planifiee ? t('dashboard.status_scheduled', 'Planifié') : p.est_publie ? t('dashboard.status_published', 'Publié') : t('dashboard.status_draft', 'Brouillon')}
        </Badge>
      ),
    });
  }

  columns.push(
    {
      key: 'date_publication',
      header: t('dashboard.col_publication', 'Date de publication'),
      sortValue: (p) => p.date_publication || '',
      render: (p) => (p.date_publication ? new Date(p.date_publication).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      header: t('dashboard.col_actions', 'Actions'),
      style: { textAlign: 'right' },
      cellStyle: { textAlign: 'right', verticalAlign: 'middle' },
      render: (p) => (
        <div className="cell-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '0.5rem' }}>
          {renderActions && renderActions(p)}
        </div>
      ),
    }
  );

  if (showCheckbox) {
    columns.push({
      key: 'checkbox',
      header: (
        <div className="checkbox-cell" style={{ display: 'flex', justifyContent: 'center' }}>
          <input
            type="checkbox"
            checked={predications.length > 0 && predications.every(p => selectionnes.includes(p.id))}
            onChange={onToggleAll}
          />
        </div>
      ),
      style: { width: '40px', textAlign: 'center' },
      cellStyle: { textAlign: 'center' },
      render: (p) => (
        <div className="checkbox-cell">
          <input
            type="checkbox"
            checked={selectionnes.includes(p.id)}
            onChange={() => onToggleOne && onToggleOne(p.id)}
          />
        </div>
      ),
    });
  }

  return (
    <DataTable
      variant="site"
      searchable={false}
      pagination={false}
      exportable={false}
      data={predications}
      keyExtractor={(p) => p.id}
      columns={columns}
      emptyMessage={t('dashboard.no_records', 'Aucun enregistrement')}
    />
  );
}
