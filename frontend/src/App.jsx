import { useState, useEffect } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Compass, LayoutDashboard, LogOut, ShieldCheck, UserRound, Menu, X, ChevronDown, User, LogIn, UserPlus, Church } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { AudioPlayer } from "./components/AudioPlayer";
import { BanniereEmail } from "./components/BanniereEmail";
import { BanniereCookies } from "./components/BanniereCookies";
import { PiedDePage } from "./components/PiedDePage";
import { RouteProtegee } from "./components/RouteProtegee";
import { MentionsLegales, Confidentialite, Cookies, Conditions } from "./pages/Legales";
import { Videos } from "./pages/Videos";
import { Home } from "./pages/Home";
import { CompteFidele } from "./pages/CompteFidele";
import { ComptePasteur } from "./pages/ComptePasteur";
import { MotDePasseOublie } from "./pages/MotDePasseOublie";
import { ReinitialiserMotDePasse } from "./pages/ReinitialiserMotDePasse";
import { VerifierEmail } from "./pages/VerifierEmail";
import { Administration } from "./pages/Administration";
import { PastorDashboard } from "./pages/PastorDashboard";
import { PasteurDetail } from "./pages/PasteurDetail";
import { Pasteurs } from "./pages/Pasteurs";
import { Profil } from "./pages/Profil";
import { SermonDetail } from "./pages/SermonDetail";
import { NotFound } from "./pages/NotFound";
import { LanguageSelector } from "./components/LanguageSelector";
import { ThemeToggle } from "./components/ThemeToggle";
import { Button } from "./components/Button";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { deconnexion, estConnecte, estAdmin, pasteur, session } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Fermer le menu mobile lors d'un changement de route
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  }, [location.pathname]);

  const masquerBanniereEtFooter =
    location.pathname === "/compte-fidele" ||
    location.pathname === "/compte-pasteur" ||
    location.pathname === "/mot-de-passe-oublie" ||
    location.pathname === "/reinitialiser-mot-de-passe";

  return (
    <>
      <a href="#contenu-principal" className="lien-evitement">Aller au contenu principal</a>
      <AudioPlayer />
      {!masquerBanniereEtFooter && <BanniereEmail />}

      <nav className="app-nav-shell" aria-label="Navigation principale">
        <div className="app-nav">
          <Link to="/" className="app-brand">
            <div className="app-brand-logo-wrapper">
              <img src="/user_eagle.png" alt="Logo Aigle" className="app-brand-logo" />
            </div>
            <div className="app-brand-divider" />
            <span className="app-brand-copy">
              <strong>Plateforme Église</strong>
              <small>Version Web</small>
            </span>
          </Link>

          {/* Menu Mobile Toggle */}
          <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Wrapper des liens et actions (Desktop + Mobile) */}
          <div className={`app-nav-wrapper ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="app-nav-links">
              <NavLink to="/" end className="nav-link">{t('nav.home')}</NavLink>
              <NavLink to="/videos" className="nav-link">
                <Compass size={16} />
                {t('nav.videos')}
              </NavLink>
              <NavLink to="/pasteurs" className="nav-link">{t('nav.pastors')}</NavLink>
              {estAdmin ? (
                <NavLink to="/administration" className="nav-link">
                  <ShieldCheck size={16} />
                  {t('nav.admin')}
                </NavLink>
              ) : null}
            </div>

            <div className="app-nav-actions" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ThemeToggle />
              <LanguageSelector />
              <button
                className="account-btn-premium"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              >
                {estConnecte ? (
                  <>
                    {pasteur?.avatar ? (
                      <img
                        src={pasteur.avatar}
                        alt="avatar"
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255, 255, 255, 0.6)' }}
                      />
                    ) : (
                      <UserRound size={18} />
                    )}
                    <span style={{ fontWeight: 500 }}>{pasteur?.nom_affichage || session?.username || 'Mon Compte'}</span>
                    <ChevronDown size={16} />
                  </>
                ) : (
                  <>
                    <User size={18} />
                    <span style={{ fontWeight: 500 }}>{t('nav.account')}</span>
                    <ChevronDown size={16} />
                  </>
                )}
              </button>

              {isAccountMenuOpen && (
                <div className="account-dropdown-menu">
                  {estConnecte ? (
                    <>
                      {!pasteur && (
                        <Link to="/profil" className="dropdown-item">
                          <UserRound size={16} /> {t('nav.my_profile')}
                        </Link>
                      )}
                      {pasteur && (
                        <Link to="/espace-pasteur" className="dropdown-item">
                          <LayoutDashboard size={16} /> {t('nav.my_space')}
                        </Link>
                      )}
                      <div className="dropdown-divider"></div>
                      <button
                        onClick={() => { deconnexion(); navigate('/'); }}
                        className="dropdown-item logout">
                        <LogOut size={16} /> {t('nav.logout')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/compte-fidele" className="dropdown-item connexion">
                        <UserRound size={14} /> {t('nav.faithful', 'Compte Fidèle')}
                      </Link>
                      <Link to="/compte-pasteur" className="dropdown-item connexion">
                        <Church size={14} /> {t('nav.pastors', 'Compte Pasteur')}
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main id="contenu-principal" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/pasteurs" element={<Pasteurs />} />
          <Route path="/pasteurs/:id" element={<PasteurDetail />} />
          <Route path="/compte-fidele" element={<CompteFidele />} />
          <Route path="/compte-pasteur" element={<ComptePasteur />} />
          <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
          <Route path="/verifier-email" element={<VerifierEmail />} />
          <Route path="/profil" element={<Profil />} />
          <Route
            path="/espace-pasteur"
            element={(
              <RouteProtegee pasteurUniquement={true}>
                <PastorDashboard />
              </RouteProtegee>
            )}
          />
          <Route path="/dashboard" element={<RouteProtegee pasteurUniquement={true}><PastorDashboard /></RouteProtegee>} />
          <Route
            path="/administration"
            element={(
              <RouteProtegee adminUniquement={true}>
                <Administration />
              </RouteProtegee>
            )}
          />
          <Route path="/sermon/:id" element={<SermonDetail />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/conditions" element={<Conditions />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!masquerBanniereEtFooter && <PiedDePage />}
      <BanniereCookies />
    </>
  );
}
