import React from 'react';
import { Film, Mic2, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components/ui/Badge';
import { Table } from '../../../components/ui/Table';

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
    { header: t('dashboard.col_image', 'Image') },
    { header: t('dashboard.col_date_predication', 'Date de prédication') },
    { header: t('dashboard.col_title', 'Titre') },
    { header: t('videos.th_pastor', 'Pasteur') }
  ];
  if (showStatus) {
    columns.push({ header: t('dashboard.col_status', 'Statut') });
  }
  columns.push(
    { header: t('dashboard.col_publication', 'Date de publication') },
    { header: t('dashboard.col_actions', 'Actions'), style: { textAlign: 'right' } }
  );
  if (showCheckbox) {
    columns.push({
      header: (
        <div className="checkbox-cell" style={{ display: 'flex', justifyContent: 'center' }}>
          <input
            type="checkbox"
            checked={predications.length > 0 && predications.every(p => selectionnes.includes(p.id))}
            onChange={onToggleAll}
          />
        </div>
      ),
      style: { width: '40px', textAlign: 'center' }
    });
  }

  return (
    <Table columns={columns}>
          {predications.length > 0 ? (
            predications.map((p) => {
              const isVideo = p.type_media === 'VIDEO' || !!p.url_video;

              let imageUrl = p.image_couverture;
              if (!imageUrl && p.url_video) {
                const match = p.url_video.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                if (match && match[1]) {
                  imageUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
                }
              }

              return (
                <tr key={p.id} className="datatable-row">
                  <td className="cell-image">
                    {imageUrl ? (
                      <div className="image-wrapper" onClick={() => onImageClick && onImageClick(p)} style={{ cursor: onImageClick && isVideo ? 'pointer' : 'default' }}>
                        <img src={imageUrl} alt={p.titre} onError={(e) => { e.target.src = 'https://via.placeholder.com/48x36?text=Vidéo'; }} />
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
                    )}
                  </td>
                  <td>
                    {p.date_predication ? new Date(p.date_predication).toLocaleDateString() : '-'}
                  </td>
                  <td className="cell-title" title={p.titre}>
                    {p.titre || t('videos.untitled', 'Sans titre')}
                  </td>
                  <td>
                    {p.nom_predicateur || p.pasteur?.nom_affichage || '-'}
                  </td>
                  {showStatus && (
                    <td>
                      <Badge variant={p.est_planifiee ? 'scheduled' : p.est_publie ? 'published' : 'draft'}>
                        {p.est_planifiee ? t('dashboard.status_scheduled', 'Planifié') : p.est_publie ? t('dashboard.status_published', 'Publié') : t('dashboard.status_draft', 'Brouillon')}
                      </Badge>
                    </td>
                  )}
                  <td>
                    {p.date_publication ? new Date(p.date_publication).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    <div className="cell-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '0.5rem' }}>
                      {renderActions && renderActions(p)}
                    </div>
                  </td>
                  {showCheckbox && (
                    <td style={{ textAlign: 'center' }}>
                      <div className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectionnes.includes(p.id)}
                          onChange={() => onToggleOne && onToggleOne(p.id)}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={showStatus && showCheckbox ? 8 : (showStatus || showCheckbox) ? 7 : 6} className="table-empty-row" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                {t('dashboard.no_records', 'Aucun enregistrement')}
              </td>
            </tr>
          )}
        </Table>
  );
}
