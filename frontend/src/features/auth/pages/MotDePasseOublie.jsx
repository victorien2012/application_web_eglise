import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AtSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { Button } from '../../../components/Button';
import './Auth.css';

export function MotDePasseOublie() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [soumission, setSoumission] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');
    setMessage('');
    setSoumission(true);

    try {
      const response = await api.post('/auth/mot-de-passe-oublie/', { email });
      setMessage(
        response.data?.detail
        || t('auth.forgot_password_success')
      );
    } catch (error) {
      setErreur(error.response?.data?.email?.[0] || t('auth.forgot_password_error'));
    } finally {
      setSoumission(false);
    }
  }

  return (
    <div className="auth-layout-wrapper mot-de-passe-oublie-layout-wrapper">
      <div className="auth-visual-side">
        <h2>{t('auth.forgot_password_title')}</h2>
        <p>{t('auth.forgot_password_desc')}</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span className="app-brand-mark" style={{ width: '36px', height: '36px', fontSize: '0.9rem', borderRadius: '8px', boxShadow: '0 3px 6px rgba(124, 92, 255, 0.1)' }}>PE</span>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>{t('auth.password_recovery')}</h1>
              <p style={{ fontSize: '0.75rem', margin: 0, color: '#64748b', lineHeight: 1.3 }}>{t('auth.password_recovery_subtitle')}</p>
            </div>
          </div>

          {message ? (
            <div className="auth-success" style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {message}
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>{t('auth.email')}</span>
                <div className="auth-input-wrapper">
                  <AtSign size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t('auth.email_placeholder')}
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              {erreur ? <p className="auth-error">{erreur}</p> : null}

              <Button variant="yellow" type="submit" disabled={soumission} style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '0.5rem' }}>
                {soumission ? t('auth.btn_send_link_loading') : t('auth.btn_send_link')}
              </Button>
            </form>
          )}

          <div className="auth-footer" style={{ marginTop: '1.25rem' }}>
            <p>
              <Link to="/compte-fidele">{t('auth.back_to_login')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
