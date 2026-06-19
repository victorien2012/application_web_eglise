import { Menu, Bell, AlertCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DashboardTopbar({
  pasteur,
  setIsSidebarOpen,
  unreadCount,
  afficherNotifications,
  setAfficherNotifications,
  notifications,
  marquerToutesLues,
  marquerNotificationLue
}) {
  const { t } = useTranslation();

  return (
    <div className="dashboard-topbar">
      <div className="dashboard-title-area" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={28} />
        </button>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--pd-text-muted)' }}>
          {t('dashboard.welcome_back', { name: pasteur?.nom_affichage || t('profile.default_pastor') })}
        </p>
      </div>
      <div className="topbar-actions" style={{ position: 'relative' }}>
        <button
          className="btn btn-outline"
          style={{ padding: '0.4rem', borderRadius: '50%', position: 'relative' }}
          onClick={() => setAfficherNotifications(!afficherNotifications)}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>

        {afficherNotifications && (
          <div className="notifications-dropdown glass-card">
            <div className="notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{t('dashboard.notifications')}</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={marquerToutesLues}
                  style={{ background: 'none', border: 'none', color: '#004a94', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  {t('dashboard.mark_all_read')}
                </button>
              )}
            </div>
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="notifications-empty">{t('dashboard.no_notifications')}</div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className={`notification-item ${!notif.lu ? 'unread' : ''}`} onClick={() => !notif.lu && marquerNotificationLue(notif.id)}>
                    <div className="notification-icon">
                      <User size={16} />
                    </div>
                    <div className="notification-content-text">
                      <p>{notif.message}</p>
                      <small>{new Date(notif.cree_le).toLocaleDateString()}</small>
                    </div>
                    {!notif.lu && <div className="notification-dot" />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }}>
          <AlertCircle size={18} />
        </button>
      </div>
    </div>
  );
}
