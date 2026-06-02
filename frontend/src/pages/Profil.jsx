import { useAuth } from '../context/AuthContext';

export function Profil() {
  const { pasteur, estConnecte } = useAuth();

  if (!estConnecte) {
    return (
      <section className="glass-card" style={{ padding: '1.25rem', maxWidth: 720 }}>
        <h1 style={{ marginTop: 0 }}>Profil</h1>
        <p style={{ color: '#bbb' }}>
          Connectez-vous pour afficher les informations de votre compte.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card" style={{ padding: '1.25rem', maxWidth: 720 }}>
      <h1 style={{ marginTop: 0 }}>Profil</h1>
      {pasteur ? (
        <>
          <p><strong>Nom:</strong> {pasteur.nom_affichage}</p>
          <p><strong>Eglise:</strong> {pasteur.nom_eglise || 'Non renseignee'}</p>
          <p style={{ color: '#bbb', lineHeight: 1.6 }}>
            {pasteur.biographie || 'Aucune biographie pour le moment.'}
          </p>
        </>
      ) : (
        <p style={{ color: '#bbb' }}>
          Votre session est active, mais aucun profil pasteur n'est associe a ce compte.
        </p>
      )}
    </section>
  );
}
