import { useState, useEffect, lazy, Suspense } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Home as HomeIcon, Compass, FileText, Users, LayoutDashboard, LogOut, ShieldCheck, UserRound, Menu, X, ChevronDown, User, LogIn, UserPlus, Church } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { useSite } from "./context/SiteContext";

// Layout components
import { AudioPlayer } from "./components/layout/AudioPlayer";
import { BanniereCookies } from "./components/layout/BanniereCookies";
import { LanguageSelector } from "./components/layout/LanguageSelector";
import { ThemeToggle } from "./components/layout/ThemeToggle";
import { PiedDePage } from "./components/layout/PiedDePage";

// Shared components
import { RouteProtegee } from "./components/shared/RouteProtegee";
import { Button } from "./components/Button";

// Feature: Auth
import { CompteFidele } from "./features/auth/pages/CompteFidele";
import { ComptePasteur } from "./features/auth/pages/ComptePasteur";
import { MotDePasseOublie } from "./features/auth/pages/MotDePasseOublie";
import { ReinitialiserMotDePasse } from "./features/auth/pages/ReinitialiserMotDePasse";
import { VerifierEmail } from "./features/auth/pages/VerifierEmail";

// Feature: Home
import { Home } from "./features/home/pages/Home";

// Feature: Sermons (Lazy)
const Videos = lazy(() => import('./features/sermons/pages/Videos').then(m => ({ default: m.Videos })));
const SermonDetail = lazy(() => import('./features/sermons/pages/SermonDetail').then(m => ({ default: m.SermonDetail })));

// Feature: Documents (Lazy)
const Documents = lazy(() => import('./features/documents/pages/Documents').then(m => ({ default: m.Documents })));

// Feature: Pasteurs (Lazy)
const Pasteurs = lazy(() => import('./features/pasteurs/pages/Pasteurs').then(m => ({ default: m.Pasteurs })));
const PasteurDetail = lazy(() => import('./features/pasteurs/pages/PasteurDetail').then(m => ({ default: m.PasteurDetail })));

// Feature: Dashboard (Espace Pasteur) (Lazy)
const PastorDashboard = lazy(() => import('./features/dashboard/pages/PastorDashboard').then(m => ({ default: m.PastorDashboard })));

// Feature: Admin (Lazy)
const Administration = lazy(() => import('./features/admin/pages/Administration').then(m => ({ default: m.Administration })));

// Feature: Profil (Lazy)
const Profil = lazy(() => import('./features/profil/pages/Profil').then(m => ({ default: m.Profil })));

// Feature: Legal
import { MentionsLegales, Confidentialite, Cookies, Conditions } from "./features/legal/pages/Legales";
import { NotFound } from "./features/legal/pages/NotFound";

import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { deconnexion, estConnecte, estAdmin, pasteur, session } = useAuth();
  const { siteConfig } = useSite();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Fermer le menu mobile et dropdown lors d'un changement de route
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  }, [location.pathname]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.app-nav-actions')) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Ne masque plus que le pied de page : la banniere de verification d'email
  // a disparu avec l'inscription sans confirmation d'adresse.
  const masquerBanniereEtFooter =
    location.pathname === "/compte-fidele" ||
    location.pathname === "/compte-pasteur" ||
    location.pathname === "/mot-de-passe-oublie" ||
    location.pathname === "/reinitialiser-mot-de-passe";

  return (
    <>
      <a href="#contenu-principal" className="lien-evitement">Aller au contenu principal</a>
      <AudioPlayer />
      {/* Banniere de verification d'email retiree : l'inscription ne passe
          plus par une confirmation d'adresse, elle inviterait donc a une
          action devenue sans objet. Le composant et les routes serveur sont
          conserves, prets a resservir si la verification revenait. */}

      <nav className="app-nav-shell" aria-label="Navigation principale">
        <div className="app-nav">
          <Link to="/" className="app-brand">
            <div className="app-brand-logo-wrapper">
              <img src={siteConfig?.logo || "/user_eagle.png"} alt="Logo du site" className="app-brand-logo" />
            </div>
            <div className="app-brand-divider" />
            <span className="app-brand-copy">
              <strong>Plateforme Église</strong>
              <small>Parole &amp; Lumière</small>
            </span>
          </Link>

          {/* Menu Mobile Toggle */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t('nav.close_menu', 'Fermer le menu') : t('nav.open_menu', 'Ouvrir le menu')}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Wrapper des liens et actions (Desktop + Mobile) */}
          <div className={`app-nav-wrapper ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="app-nav-links">
              <NavLink to="/" end className="nav-link">
                <HomeIcon size={16} />
                {t('nav.home')}
              </NavLink>
              <NavLink to="/videos" className="nav-link">
                <Compass size={16} />
                {t('nav.videos')}
              </NavLink>
              <NavLink to="/documents" className="nav-link">
                <FileText size={16} />
                {t('nav.documents', 'Documents')}
              </NavLink>
              <NavLink to="/pasteurs" className="nav-link">
                <Users size={16} />
                {t('nav.pastors')}
              </NavLink>
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
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement en cours...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/documents" element={<Documents />} />
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
            <Route path="/dashboard" element={<Navigate to="/espace-pasteur" replace />} />
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
        </Suspense>
      </main>

      {!masquerBanniereEtFooter && <PiedDePage />}

      <BanniereCookies />
    </>
  );
}
