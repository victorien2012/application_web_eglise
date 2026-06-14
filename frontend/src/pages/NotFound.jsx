import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/Button';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="not-found-page reveal-on-scroll is-visible" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '6rem 2rem', 
      textAlign: 'center',
      minHeight: '70vh',
      flex: 1
    }}>
      <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h1 style={{ 
          fontSize: '8rem', 
          fontWeight: '900', 
          background: 'var(--yellow-gradient, linear-gradient(135deg, #f59e0b 0%, #d97706 100%))', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          lineHeight: 1,
          letterSpacing: '-0.05em'
        }}>
          404
        </h1>
      </div>
      
      <div className="fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '700', 
          color: 'var(--text-primary)',
          marginBottom: '1rem'
        }}>
          {t('not_found.title', 'Page introuvable')}
        </h2>
      </div>

      <div className="fade-in-up" style={{ animationDelay: '0.3s' }}>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.1rem', 
          maxWidth: '500px',
          marginBottom: '2.5rem',
          lineHeight: 1.6
        }}>
          {t('not_found.description', "Désolé, la page que vous recherchez n'existe pas, a été supprimée ou est temporairement indisponible.")}
        </p>
      </div>

      <div className="fade-in-up" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.4s' }}>
        <Button onClick={() => window.history.back()} variant="outline-dark" icon={ArrowLeft} iconPosition="left">
          {t('not_found.back_btn', "Page précédente")}
        </Button>
        <Button to="/" variant="yellow" icon={Home} iconPosition="left">
          {t('not_found.home_btn', "Retour à l'accueil")}
        </Button>
      </div>
    </div>
  );
}
