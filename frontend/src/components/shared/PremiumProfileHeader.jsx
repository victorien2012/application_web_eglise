import { User, Church } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PremiumProfileHeader({ pasteur, style }) {
  const { t } = useTranslation();

  return (
    <div style={{ position: 'relative', marginBottom: '3rem', maxWidth: '800px', margin: '0 auto 3rem auto', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)', border: '1px solid #f1f5f9', background: '#ffffff', ...style }}>
      {/* Bannière de fond vibrante */}
      <div style={{ height: '70px', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%)' }} />
      </div>
      
      {/* Corps de l'en-tête */}
      <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        
        {/* Cadre photo Premium arrondi */}
        <div style={{ 
          marginTop: '-40px', 
          width: '80px', 
          height: '80px', 
          borderRadius: '16px', 
          padding: '3px',
          background: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(10px)',
          boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          zIndex: 10,
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '22px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pasteur?.avatar ? (
              <img src={pasteur.avatar} alt={pasteur?.nom_affichage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={60} color="#94a3b8" />
            )}
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
            {pasteur?.nom_affichage || t('profile.default_user')}
          </h2>
          <div style={{ marginTop: '0.75rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontSize: '1rem', fontWeight: 600, backgroundColor: '#eff6ff', padding: '0.5rem 1.25rem', borderRadius: '99px', border: '1px solid #dbeafe', boxShadow: '0 2px 10px rgba(30, 58, 138, 0.05)' }}>
              <Church size={18} />
              {pasteur?.nom_eglise || 'Aucune église spécifiée'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
