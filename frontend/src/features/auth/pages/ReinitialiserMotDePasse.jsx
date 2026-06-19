import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { Button } from '../../../components/Button';
import { Password } from 'primereact/password';
import './Auth.css';

export function ReinitialiserMotDePasse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [soumission, setSoumission] = useState(false);

  const lienValide = Boolean(uid && token);

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');

    if (motDePasse !== confirmation) {
      setErreur(t('auth.password_mismatch'));
      return;
    }

    setSoumission(true);
    try {
      await api.post('/auth/reinitialiser-mot-de-passe/', {
        uid,
        token,
        nouveau_mot_de_passe: motDePasse,
      });
      navigate('/compte-fidele', {
        replace: true,
        state: { info: t('auth.password_reset_success') },
      });
    } catch (error) {
      const data = error.response?.data;
      const message = data?.nouveau_mot_de_passe?.[0]
        || data?.detail
        || t('auth.password_reset_error');
      setErreur(message);
    } finally {
      setSoumission(false);
    }
  }

  return (
    <div className="auth-layout-wrapper reinitialiser-layout-wrapper">
      <div className="auth-visual-side">
        <h2>{t('auth.new_password_title')}</h2>
        <p>{t('auth.new_password_desc')}</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span className="app-brand-mark" style={{ width: '36px', height: '36px', fontSize: '0.9rem', borderRadius: '8px', boxShadow: '0 3px 6px rgba(124, 92, 255, 0.1)' }}>PE</span>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>{t('auth.reset_title')}</h1>
              <p style={{ fontSize: '0.75rem', margin: 0, color: '#64748b', lineHeight: 1.3 }}>{t('auth.reset_subtitle')}</p>
            </div>
          </div>

          {!lienValide ? (
            <div style={{ textAlign: 'center' }}>
              <p className="auth-error" style={{ marginBottom: '1.5rem' }}>
                {t('auth.reset_link_invalid')}
              </p>
              <div className="auth-footer">
                <Link to="/mot-de-passe-oublie">{t('auth.request_new_link')}</Link>
              </div>
            </div>
          ) : (
            <>
              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <span>{t('auth.new_password')}</span>
                  <div className="auth-input-wrapper">
                    <LockKeyhole className="field-icon" size={16} />
                    <Password
                      id="motDePasse"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      toggleMask
                      feedback={false}
                      placeholder={t('auth.password_min_chars')}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </label>

                <label className="auth-field">
                  <span>{t('auth.confirm_password')}</span>
                  <div className="auth-input-wrapper">
                    <LockKeyhole className="field-icon" size={16} />
                    <Password
                      id="confirmation"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      toggleMask
                      feedback={false}
                      placeholder={t('auth.repeat_password')}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </label>

                {erreur ? <p className="auth-error">{erreur}</p> : null}

                <Button variant="yellow" type="submit" disabled={soumission} style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '0.5rem' }}>
                  {soumission ? t('auth.btn_set_password_loading') : t('auth.btn_set_password')}
                </Button>
              </form>

              <div className="auth-footer" style={{ marginTop: '1.25rem' }}>
                <p>
                  <Link to="/compte-fidele">{t('auth.back_to_login')}</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
