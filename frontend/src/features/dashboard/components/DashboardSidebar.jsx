import { User, Film, Paperclip, PlusCircle, MessageSquare, PencilLine, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DashboardSidebar({ isSidebarOpen, setIsSidebarOpen, ongletActif, setOngletActif, enEdition }) {
  const { t } = useTranslation();

  return (
    <aside className={`dashboard-sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <h2>{t('dashboard.sidebar_title', 'Espace Pasteur')}</h2>
      </div>

      <nav className="sidebar-menu">
        <button
          type="button"
          className={`menu-item ${ongletActif === 'profil' ? 'active' : ''}`}
          onClick={() => { setOngletActif('profil'); setIsSidebarOpen(false); }}
        >
          <User size={18} />
          <span>{t('dashboard.sidebar_profile', 'Mon Profil')}</span>
        </button>

        <button
          type="button"
          className={`menu-item ${ongletActif === 'catalogue' ? 'active' : ''}`}
          onClick={() => { setOngletActif('catalogue'); setIsSidebarOpen(false); }}
        >
          <Film size={18} />
          <span>{t('dashboard.sidebar_videos', 'Catalogue')}</span>
        </button>

        <button
          type="button"
          className={`menu-item ${ongletActif === 'documents' ? 'active' : ''}`}
          onClick={() => { setOngletActif('documents'); setIsSidebarOpen(false); }}
        >
          <Paperclip size={18} />
          <span>{t('dashboard.sidebar_documents', 'Documents')}</span>
        </button>

        <button
          type="button"
          className={`menu-item ${ongletActif === 'publier' ? 'active' : ''}`}
          onClick={() => { setOngletActif('publier'); setIsSidebarOpen(false); }}
        >
          <PlusCircle size={18} />
          <span>{t('dashboard.sidebar_publish', 'Publier')}</span>
        </button>

        <button
          type="button"
          className={`menu-item ${ongletActif === 'commentaires' ? 'active' : ''}`}
          onClick={() => { setOngletActif('commentaires'); setIsSidebarOpen(false); }}
        >
          <MessageSquare size={18} />
          <span>{t('dashboard.sidebar_comments', 'Commentaires')}</span>
        </button>

        {enEdition && (
          <button
            type="button"
            className={`menu-item ${ongletActif === 'editer' ? 'active' : ''}`}
            onClick={() => { setOngletActif('editer'); setIsSidebarOpen(false); }}
          >
            <PencilLine size={18} />
            <span>{t('dashboard.sidebar_edit', 'Éditer')}</span>
          </button>
        )}

        <button
          type="button"
          className={`menu-item ${ongletActif === 'apercu' ? 'active' : ''}`}
          onClick={() => { setOngletActif('apercu'); setIsSidebarOpen(false); }}
        >
          <TrendingUp size={18} />
          <span>{t('dashboard.sidebar_overview', 'Aperçu')}</span>
        </button>
      </nav>
    </aside>
  );
}
