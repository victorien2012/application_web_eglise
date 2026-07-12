import { Film, Eye, Download, Mic2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DashboardOverviewTab({ stats }) {
  const { t } = useTranslation();

  return (
    <div className="dashboard-tab-content">
      <div className="dashboard-title-area" style={{ marginBottom: '1.5rem' }}>
        <h1>{t('dashboard.overview_title', "Vue d'ensemble")}</h1>
        <p>{t('dashboard.overview_subtitle', "Voici un résumé de vos statistiques et performances récentes.")}</p>
      </div>

      <div className="dashboard-kpis">
        <div className="dashboard-kpi">
          <div className="kpi-icon-wrapper primary-bg">
            <Film size={24} />
          </div>
          <div className="kpi-content">
            <p>{t('dashboard.online_messages', 'Messages en ligne')}</p>
            <strong>{stats?.total_predications || 0}</strong>
          </div>
        </div>
        <div className="dashboard-kpi">
          <div className="kpi-icon-wrapper pink-bg">
            <Eye size={24} />
          </div>
          <div className="kpi-content">
            <p>{t('dashboard.listeners_reads', 'Auditeurs & Lectures')}</p>
            <strong>{stats?.total_vues || 0}</strong>
          </div>
        </div>
        <div className="dashboard-kpi">
          <div className="kpi-icon-wrapper blue-bg">
            <Download size={24} />
          </div>
          <div className="kpi-content">
            <p>{t('dashboard.downloads', 'Téléchargements')}</p>
            <strong>{stats?.total_telechargements || 0}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: '1.5rem' }}>
        <div className="table-actions-top" style={{ marginBottom: '1.5rem' }}>
          <div className="left-actions">
            <h2 style={{ margin: 0, color: 'var(--btn-dark)', fontSize: '1.25rem' }}>
              {t('dashboard.top_performances', 'Top performances')}
            </h2>
          </div>
        </div>

        {stats?.meilleures_predications?.length ? (
          <div className="premium-list">
            {stats.meilleures_predications.map((predication, index) => (
              <div key={predication.id} className="premium-list-item">
                <div className="item-meta-left">
                  <div className="rank-badge">#{index + 1}</div>
                  <div className="media-indicator">
                    {predication.type_media === 'VIDEO' ? <Film size={18} /> : <Mic2 size={18} />}
                  </div>
                  <div>
                    <span className="item-title">{predication.titre}</span>
                    <span className="item-subtitle">
                      {predication.type_media === 'VIDEO' ? t('dashboard.video', 'Vidéo') : t('dashboard.audio', 'Audio')}
                    </span>
                  </div>
                </div>
                <div className="item-meta-right">
                  <div className="stat-pill">
                    <Eye size={14} />
                    <span>{predication.nombre_vues}</span>
                  </div>
                  <div className="stat-pill">
                    <Download size={14} />
                    <span>{predication.nombre_telechargements}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--pd-text-muted)' }}>
            <p>{t('dashboard.no_stats', "Pas encore de statistiques disponibles.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
