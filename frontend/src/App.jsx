import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { Compass, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { AudioPlayer } from "./components/AudioPlayer";
import { RouteProtegee } from "./components/RouteProtegee";
import { Decouvrir } from "./pages/Decouvrir";
import { Home } from "./pages/Home";
import { Connexion } from "./pages/Connexion";
import { Inscription } from "./pages/Inscription";
import { PastorDashboard } from "./pages/PastorDashboard";
import { PasteurDetail } from "./pages/PasteurDetail";
import { Pasteurs } from "./pages/Pasteurs";
import { Profil } from "./pages/Profil";
import { SermonDetail } from "./pages/SermonDetail";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const { deconnexion, estConnecte, pasteur } = useAuth();

  return (
    <>
      <AudioPlayer />

      <nav className="app-nav-shell">
        <div className="app-nav">
          <Link to="/" className="app-brand">
            <span className="app-brand-mark">PE</span>
            <span className="app-brand-copy">
              <strong>Plateforme Eglise</strong>
              <small>Version web</small>
            </span>
          </Link>

          <div className="app-nav-links">
            <NavLink to="/" end className="nav-link">Accueil</NavLink>
            <NavLink to="/decouvrir" className="nav-link">
              <Compass size={16} />
              Decouvrir
            </NavLink>
            <NavLink to="/pasteurs" className="nav-link">Pasteurs</NavLink>
            {estConnecte ? <NavLink to="/profil" className="nav-link">Profil</NavLink> : null}
            {estConnecte ? (
              <NavLink to="/espace-pasteur" className="nav-link">
                <LayoutDashboard size={16} />
                Mon espace
              </NavLink>
            ) : null}
          </div>

          <div className="app-nav-actions">
          {estConnecte ? (
            <div className="session-chip">
              <span className="session-label">
                <UserRound size={14} />
                {pasteur?.nom_affichage || 'Session active'}
              </span>
              <button
                className="btn app-ghost-button"
                onClick={() => {
                  deconnexion();
                  navigate('/');
                }}
                type="button"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <NavLink to="/inscription" className="btn app-ghost-button">
                Inscription
              </NavLink>
              <NavLink to="/connexion" className="btn btn-primary">
                Connexion
              </NavLink>
            </>
          )}
          </div>
        </div>
      </nav>

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/decouvrir" element={<Decouvrir />} />
          <Route path="/pasteurs" element={<Pasteurs />} />
          <Route path="/pasteurs/:id" element={<PasteurDetail />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Inscription />} />
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
          <Route path="/sermon/:id" element={<SermonDetail />} />
        </Routes>
      </main>
    </>
  );
}
