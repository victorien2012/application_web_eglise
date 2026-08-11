import { Film, Eye, Download, Mic2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DashboardOverviewTab({ stats }) {
  const { t } = useTranslation();

  // Le serveur calcule cette serie sur 30 jours a chaque chargement
  // (statistiques_tableau_de_bord), mais rien ne l'affichait jusqu'ici.
  const serie = stats?.serie_analytique || [];
  const activite30Jours = serie.reduce(
    (acc, jour) => {
      const lectures = jour.lectures || 0;
      const telechargements = jour.telechargements || 0;
      return {
        lectures: acc.lectures + lectures,
        telechargements: acc.telechargements + telechargements,
        max: Math.max(acc.max, lectures + telechargements),
      };
    },
    { lectures: 0, telechargements: 0, max: 0 }
  );

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
          <div className="kpi-icon-wrapper teal-bg">
            <Download size={24} />
          </div>
          <div className="kpi-content">
            <p>{t('dashboard.downloads', 'Téléchargements')}</p>
            <strong>{stats?.total_telechargements || 0}</strong>
          </div>
        </div>
      </div>

      {activite30Jours.max > 0 && (
        <div className="dashboard-section" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.25rem', color: 'var(--btn-dark)', fontSize: '1.25rem' }}>
            Activité des 30 derniers jours
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--pd-text-muted)' }}>
            {activite30Jours.lectures.toLocaleString('fr-FR')} lectures et{' '}
            {activite30Jours.telechargements.toLocaleString('fr-FR')} téléchargements
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '90px' }}>
            {serie.map((jour) => {
              const valeur = (jour.lectures || 0) + (jour.telechargements || 0);
              const hauteur = activite30Jours.max ? Math.max(2, (valeur / activite30Jours.max) * 100) : 2;
              return (
                <div
                  key={jour.date}
                  title={`${jour.date} : ${jour.lectures || 0} lectures, ${jour.telechargements || 0} téléchargements`}
                  style={{
                    flex: 1,
                    height: `${hauteur}%`,
                    background: valeur ? 'var(--primary)' : 'var(--pd-border)',
                    borderRadius: '3px 3px 0 0',
                    minWidth: '4px',
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--pd-text-muted)', marginTop: '0.35rem' }}>
            <span>{serie[0]?.date}</span>
            <span>{serie[serie.length - 1]?.date}</span>
          </div>
        </div>
      )}

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
