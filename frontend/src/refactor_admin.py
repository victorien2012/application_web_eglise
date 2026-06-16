import re

with open('d:/PROJET WEB EGLISE/frontend/src/pages/Administration.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace("import './Administration.css';", "import './Administration.css';\nimport './PastorDashboard.css';")

# Add ongletActif state
content = content.replace(
    "const ELEMENTS_PAR_PAGE = 5;",
    "const ELEMENTS_PAR_PAGE = 5;\n  const [ongletActif, setOngletActif] = useState('apercu');"
)

# Replace the beginning of return
header_replacement = """  return (
    <div className="dashboard-container admin-page" style={{ padding: 0 }}>
      {/* Barre Latérale */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>{t('admin.title')}</h2>
        </div>
        <nav className="sidebar-menu">
          <button type="button" className={`menu-item ${ongletActif === 'apercu' ? 'active' : ''}`} onClick={() => setOngletActif('apercu')}>
            <BarChart3 size={18} />
            <span>Tableau de bord</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'pasteurs' ? 'active' : ''}`} onClick={() => setOngletActif('pasteurs')}>
            <Users size={18} />
            <span>Demandes Pasteurs</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'signalements' ? 'active' : ''}`} onClick={() => setOngletActif('signalements')}>
            <ShieldCheck size={18} />
            <span>Modération</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'annonces' ? 'active' : ''}`} onClick={() => setOngletActif('annonces')}>
            <Megaphone size={18} />
            <span>Annonces</span>
          </button>
          <button type="button" className={`menu-item ${ongletActif === 'carrousel' ? 'active' : ''}`} onClick={() => setOngletActif('carrousel')}>
            <MonitorPlay size={18} />
            <span>Carrousel</span>
          </button>
        </nav>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-topbar">
          <div className="dashboard-title-area">
            <h1>{t('admin.subtitle')}</h1>
            <p>Gérez le contenu et les utilisateurs</p>
          </div>
        </div>
        {erreur ? <div className="admin-alert-error">{erreur}</div> : null}
        {messageSucces ? <div className="admin-alert-success">{messageSucces}</div> : null}
"""

content = re.sub(
    r'  return \(\s*<div className="admin-page">\s*\{\/\* En-tête \*\/.*?<\/header>\s*',
    header_replacement,
    content,
    flags=re.DOTALL
)

# Wrap KPIs in ongletActif === 'apercu'
content = content.replace("{/* KPIs */}\n      {stats ? (", "{/* KPIs */}\n      {ongletActif === 'apercu' && stats ? (")

# Wrap Pasteurs in ongletActif === 'pasteurs'
content = content.replace("{/* Demandes Pasteurs */}\n      <section className=\"admin-section\">", "{ongletActif === 'pasteurs' && (\n      <section className=\"admin-section\">")
content = content.replace("</section>\n\n      {/* Signalements */}", "</section>\n      )}\n\n      {/* Signalements */}")

# Wrap Signalements in ongletActif === 'signalements'
content = content.replace("{/* Signalements */}\n      <section className=\"admin-section\">", "{ongletActif === 'signalements' && (\n      <section className=\"admin-section\">")
content = content.replace("</section>\n\n      {/* Annonces */}", "</section>\n      )}\n\n      {/* Annonces */}")

# Wrap Annonces in ongletActif === 'annonces'
content = content.replace("{/* Annonces */}\n      <section className=\"admin-section\">", "{ongletActif === 'annonces' && (\n      <section className=\"admin-section\">")
content = content.replace("</section>\n\n      {/* Carrousel */}", "</section>\n      )}\n\n      {/* Carrousel */}")

# Wrap Carrousel in ongletActif === 'carrousel'
content = content.replace("{/* Carrousel */}\n      <section className=\"admin-section\">", "{ongletActif === 'carrousel' && (\n      <section className=\"admin-section\">")
# Close carrousel conditionally before modals
content = content.replace("</section>\n\n      {/* Generic Confirm Modal */}", "</section>\n      )}\n\n      {/* Generic Confirm Modal */}")

# Close the main tag
content = content.replace("</div>\n  );\n}", "</main>\n    </div>\n  );\n}")

with open('d:/PROJET WEB EGLISE/frontend/src/pages/Administration.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Administration.jsx refactored.")
