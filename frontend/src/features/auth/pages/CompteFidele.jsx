import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, LockKeyhole, UserRound, Phone, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { useSite } from '../../../context/SiteContext';
import { Button } from '../../../components/Button';
import { Password } from 'primereact/password';
import './Auth.css';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CompteFidele() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { connexion, inscription, deconnexion } = useAuth();
  const { siteConfig } = useSite();

  // mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');

  const [erreur, setErreur] = useState('');
  const [champsInvalides, setChampsInvalides] = useState(new Set());
  const [soumission, setSoumission] = useState(false);

  const depuis = location.state?.depuis;
  const info = location.state?.info;

  function extraireErreur(error) {
    const data = error.response?.data;
    if (!data) return "Action impossible. Veuillez réessayer.";
    if (typeof data === 'string') return data;
    const premier = Object.values(data)[0];
    let msg = "";
    if (Array.isArray(premier)) msg = String(premier[0]);
    else if (typeof premier === 'object' && premier !== null) msg = JSON.stringify(premier);
    else msg = String(premier);

    if (msg.includes("No active account found") || msg.includes("No active account")) {
      return "Identifiant ou mot de passe incorrect.";
    }
    return msg || "Action impossible. Veuillez réessayer.";
  }

  // Valide le formulaire d'inscription cote client : messages precis et
  // champs fautifs signales, plutot que de laisser l'API renvoyer une
  // erreur generique apres un aller-retour reseau.
  function validerInscription() {
    const invalides = new Set();
    if (!username.trim()) invalides.add('username');
    if (!email.trim() || !REGEX_EMAIL.test(email.trim())) invalides.add('email');
    if (password.length < 8) invalides.add('password');
    setChampsInvalides(invalides);

    if (invalides.size === 0) return null;
    if (invalides.has('email') && email.trim()) return t('auth.error_invalid_email');
    if (invalides.has('password') && password) return t('auth.error_password_too_short');
    return t('auth.error_required_fields');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');

    if (mode === 'register') {
      const messageValidation = validerInscription();
      if (messageValidation) {
        setErreur(messageValidation);
        return;
      }
    }

    setSoumission(true);
    try {
      if (mode === 'login') {
        const session = await connexion({ username, password });
        if (session.pasteur) {
          deconnexion();
          setErreur("Ce compte est un compte ministère. Veuillez vous connecter via l'espace Pasteur.");
          return;
        }
        if (session.estAdmin) {
          // Admin user, redirect to admin dashboard
          navigate('/administration', { replace: true });
        } else {
          navigate(depuis || '/', { replace: true });
        }
      } else {
        await inscription({ username, email, password, contact, est_pasteur: false });
        navigate(depuis || '/', { replace: true });
      }
    } catch (error) {
      if (mode === 'login' && !error.response?.data) {
        setErreur("Connexion impossible avec ces identifiants.");
      } else {
        setErreur(extraireErreur(error));
      }
    } finally {
      setSoumission(false);
    }
  }

  function changerMode(prochainMode) {
    setMode(prochainMode);
    setErreur('');
    setChampsInvalides(new Set());
  }

  return (
    <div className={`auth-layout-wrapper ${mode === 'login' ? 'connexion-layout-wrapper' : 'inscription-layout-wrapper'}`}>
      <div className="auth-visual-side">
        <div className="auth-visual-content">
          {mode === 'login' ? (
            <>
              <h2>{t('auth.login_welcome_back')}</h2>
              <p>{t('auth.login_welcome_desc')}</p>
            </>
          ) : (
            <>
              <h2>{t('auth.register_welcome')}</h2>
              <p>{t('auth.register_welcome_desc')}</p>
              <ul className="auth-visual-benefits">
                <li><CheckCircle2 size={20} />{t('auth.benefits_faithful_1')}</li>
                <li><CheckCircle2 size={20} />{t('auth.benefits_faithful_2')}</li>
                <li><CheckCircle2 size={20} />{t('auth.benefits_faithful_3')}</li>
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-header">
            <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <img src={siteConfig?.logo || "/user_eagle.png"} alt="Logo Plateforme Église" className="app-brand-logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '1rem', letterSpacing: '-0.025em' }}>{mode === 'login' ? t('auth.login_title') : t('auth.register_title')}</h1>
              <p style={{ color: 'var(--text-muted)' }}>{t('auth.faithful_account', 'Compte Fidèle')}</p>
            </div>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => changerMode('login')}
            >
              {t('auth.btn_login')}
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => changerMode('register')}
            >
              {t('auth.btn_register')}
            </button>
          </div>

          {info && mode === 'login' ? (
            <p className="auth-success">{info}</p>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'login' ? (
              <>
                <div className="auth-field-floating">
                  <div className="auth-input-wrapper">
                    <UserRound className="field-icon" size={18} />
                    <input
                      id="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder=" "
                      autoComplete="username"
                      required
                    />
                    <label htmlFor="username">{t('auth.username')}</label>
                  </div>
                </div>

                <div className="auth-field-floating">
                  <div className="auth-input-wrapper">
                    <LockKeyhole className="field-icon" size={18} />
                    <Password
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      toggleMask
                      feedback={false}
                      placeholder=" "
                      autoComplete="current-password"
                      required
                    />
                    <label htmlFor="password">{t('auth.password')}</label>
                  </div>
                </div>

                {erreur ? <p className="auth-error">{erreur}</p> : null}

                <Button variant="primary" icon={LogIn} type="submit" disabled={soumission} className="auth-submit-btn">
                  {soumission ? t('auth.btn_login_loading') : t('auth.btn_login')}
                </Button>
              </>
            ) : (
              // Un seul ecran plutot qu'un assistant en 2 etapes : 4 champs
              // seulement, un assistant multi-etapes n'ajoutait que des clics.
              <>
                <div className="auth-field-floating">
                  <div className={`auth-input-wrapper ${champsInvalides.has('username') ? 'a-erreur' : ''}`}>
                    <UserRound className="field-icon" size={18} />
                    <input
                      id="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder=" "
                      autoComplete="username"
                      required
                    />
                    <label htmlFor="username">{t('auth.username')}</label>
                  </div>
                </div>

                <div className="auth-field-floating">
                  <div className={`auth-input-wrapper ${champsInvalides.has('email') ? 'a-erreur' : ''}`}>
                    <AtSign className="field-icon" size={18} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder=" "
                      autoComplete="email"
                      required
                    />
                    <label htmlFor="email">{t('auth.email')}</label>
                  </div>
                </div>

                <div className="auth-field-floating">
                  <div className={`auth-input-wrapper ${champsInvalides.has('password') ? 'a-erreur' : ''}`}>
                    <LockKeyhole className="field-icon" size={18} />
                    <Password
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      toggleMask
                      placeholder=" "
                      autoComplete="new-password"
                      required
                      promptLabel={t('auth.password_feedback_prompt')}
                      weakLabel={t('auth.password_feedback_weak')}
                      mediumLabel={t('auth.password_feedback_medium')}
                      strongLabel={t('auth.password_feedback_strong')}
                    />
                    <label htmlFor="password">{t('auth.password')}</label>
                  </div>
                </div>

                <div className="auth-field-floating">
                  <div className="auth-input-wrapper">
                    <Phone className="field-icon" size={18} />
                    <input
                      id="contact"
                      type="tel"
                      value={contact}
                      onChange={(event) => setContact(event.target.value)}
                      placeholder=" "
                    />
                    <label htmlFor="contact">{t('auth.contact')}</label>
                  </div>
                </div>

                {erreur ? <p className="auth-error">{erreur}</p> : null}

                <Button variant="primary" icon={UserPlus} type="submit" disabled={soumission} className="auth-submit-btn">
                  {soumission ? t('auth.btn_register_loading') : t('auth.btn_register')}
                </Button>
              </>
            )}
          </form>

          <div className="auth-footer">
            {mode === 'login' && (
              <>
                <p><Link to="/mot-de-passe-oublie">{t('auth.forgot_password')}</Link></p>
                <div className="auth-footer-divider" />
              </>
            )}
            <p className="auth-footer-secondary" style={mode === 'register' ? { marginTop: '1rem' } : {}}>
              {t('auth.are_you_pastor')} <Link to="/compte-pasteur" state={depuis ? { depuis } : undefined}>{t('auth.create_pastor_account')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompteFidele;
