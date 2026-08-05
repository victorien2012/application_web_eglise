import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RouteProtegee } from './RouteProtegee';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const SESSION_ANONYME = {
  estConnecte: false,
  estPasteur: false,
  estAdmin: false,
  loading: false,
};

/**
 * Rend la route protegee dans un routeur en memoire et expose des reperes
 * sur les destinations possibles, afin de verifier ou l'utilisateur atterrit.
 */
function afficher({ depuis = '/espace-pasteur', ...proprietes } = {}) {
  return render(
    <MemoryRouter initialEntries={[depuis]}>
      <Routes>
        <Route
          path={depuis}
          element={(
            <RouteProtegee {...proprietes}>
              <p>contenu protege</p>
            </RouteProtegee>
          )}
        />
        <Route path="/compte-pasteur" element={<p>connexion pasteur</p>} />
        <Route path="/compte-fidele" element={<p>connexion fidele</p>} />
        <Route path="/" element={<p>accueil</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RouteProtegee', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('attend la fin du chargement de session avant de rediriger', () => {
    useAuth.mockReturnValue({ ...SESSION_ANONYME, loading: true });
    afficher({ pasteurUniquement: true });

    expect(screen.getByText(/chargement de votre session/i)).toBeInTheDocument();
    expect(screen.queryByText('connexion pasteur')).not.toBeInTheDocument();
  });

  it('envoie un visiteur vers la connexion pasteur pour un espace pasteur', () => {
    useAuth.mockReturnValue(SESSION_ANONYME);
    afficher({ pasteurUniquement: true });

    expect(screen.getByText('connexion pasteur')).toBeInTheDocument();
  });

  it('envoie un visiteur vers la connexion fidele pour une route ordinaire', () => {
    useAuth.mockReturnValue(SESSION_ANONYME);
    afficher({ depuis: '/profil' });

    expect(screen.getByText('connexion fidele')).toBeInTheDocument();
  });

  it('renvoie a l accueil un utilisateur connecte qui n est pas pasteur', () => {
    useAuth.mockReturnValue({ ...SESSION_ANONYME, estConnecte: true });
    afficher({ pasteurUniquement: true });

    expect(screen.getByText('accueil')).toBeInTheDocument();
    expect(screen.queryByText('contenu protege')).not.toBeInTheDocument();
  });

  it('renvoie a l accueil un utilisateur connecte qui n est pas admin', () => {
    useAuth.mockReturnValue({ ...SESSION_ANONYME, estConnecte: true });
    afficher({ adminUniquement: true, depuis: '/administration' });

    expect(screen.getByText('accueil')).toBeInTheDocument();
  });

  it('laisse passer un pasteur vers son espace', () => {
    useAuth.mockReturnValue({ ...SESSION_ANONYME, estConnecte: true, estPasteur: true });
    afficher({ pasteurUniquement: true });

    expect(screen.getByText('contenu protege')).toBeInTheDocument();
  });

  it('laisse passer un administrateur vers l administration', () => {
    useAuth.mockReturnValue({ ...SESSION_ANONYME, estConnecte: true, estAdmin: true });
    afficher({ adminUniquement: true, depuis: '/administration' });

    expect(screen.getByText('contenu protege')).toBeInTheDocument();
  });
});
