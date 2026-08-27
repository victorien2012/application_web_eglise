import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, LockKeyhole, UserRound, Phone, LogIn, Church, Send, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { useSite } from '../../../context/SiteContext';
import { Button } from '../../../components/Button';
import { Password } from 'primereact/password';
import { FileUpload } from 'primereact/fileupload';
import { Stepper } from 'primereact/stepper';
import { StepperPanel } from 'primereact/stepperpanel';
import './Auth.css';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComptePasteur() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { connexion, inscription, deconnexion } = useAuth();
  const { siteConfig } = useSite();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [step, setStep] = useState(1);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomAffichage, setNomAffichage] = useState('');
  const [nomEglise, setNomEglise] = useState('');
  const [contact, setContact] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [logoEglise, setLogoEglise] = useState(null);

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

  // Etape 1 : identifiants. Verifie et signale les champs fautifs avant de
  // laisser passer a l'etape suivante.
  function validerEtape1() {
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

  // Etape 2 : seul le nom d'affichage est obligatoire (eglise, contact et
  // medias restent optionnels).
  function validerEtape2() {
    if (!nomAffichage.trim()) {
      setChampsInvalides(new Set(['nomAffichage']));
      return t('auth.error_display_name_required');
    }
    setChampsInvalides(new Set());
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');

    if (mode === 'register') {
      const messageValidation = validerEtape2();
      if (messageValidation) {
        setErreur(messageValidation);
        return;
      }
    }

    setSoumission(true);
    try {
      if (mode === 'login') {
        const session = await connexion({ username, password });
        if (!session.pasteur) {
          deconnexion();
          setErreur("Ce compte n'est pas un compte ministère. Veuillez vous connecter via l'espace Fidèle.");
          return;
        }
        navigate(depuis || '/espace-pasteur', { replace: true });
      } else {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('est_pasteur', 'true');
        formData.append('nom_affichage', nomAffichage);
        if (nomEglise) formData.append('nom_eglise', nomEglise);
        if (contact) formData.append('contact', contact);
        if (avatar) formData.append('avatar', avatar);
        if (logoEglise) formData.append('logo_eglise', logoEglise);

        await inscription(formData);
        // Acces immediat des l'inscription (plus d'approbation admin
        // prealable) : on rejoint directement l'espace pasteur, comme pour
        // une connexion classique, plutot qu'un ecran « en attente de
        // validation » devenu faux.
        navigate(depuis || '/espace-pasteur', { replace: true });
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
    setStep(1);
    setErreur('');
    setChampsInvalides(new Set());
  }

  return (
    <div className={`auth-layout-wrapper ${mode === 'login' ? 'connexion-layout-wrapper' : 'inscription-pasteur-layout-wrapper'}`}>
      <div className="auth-visual-side">
        <div className="auth-visual-content">
          {mode === 'login' ? (
            <>
              <h2>{t('auth.login_welcome_back')}</h2>
              <p>{t('auth.login_welcome_desc')}</p>
            </>
          ) : (
            <>
              <h2>{t('auth.pastor_welcome')}</h2>
              <p>{t('auth.pastor_welcome_desc')}</p>
              <ul className="auth-visual-benefits">
                <li><CheckCircle2 size={20} />{t('auth.benefits_pastor_1')}</li>
                <li><CheckCircle2 size={20} />{t('auth.benefits_pastor_2')}</li>
                <li><CheckCircle2 size={20} />{t('auth.benefits_pastor_3')}</li>
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="auth-form-side">
        <div className={`auth-form-container ${mode === 'register' ? 'auth-form-container-wide' : ''}`}>
          <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src={siteConfig?.logo || "/user_eagle.png"} alt="Logo Plateforme Église" className="app-brand-logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '1rem', letterSpacing: '-0.025em' }}>
              {mode === 'login' ? t('auth.login_title') : t('auth.pastor_title')}
            </h1>
            <p>{t('auth.pastor_subtitle', 'Compte Ministère')}</p>
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

          <form className={`auth-form ${mode === 'register' ? 'auth-form-grid' : ''}`} onSubmit={handleSubmit}>
            {/* ETAPE 1 (ou mode login) : Identifiants */}
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

                <Button 
                  variant="primary" 
                  icon={LogIn} 
                  type="submit" 
                  disabled={soumission} 
                  className="auth-submit-btn"
                >
                  {soumission ? t('auth.btn_login_loading') : t('auth.btn_login')}
                </Button>
              </>
            ) : (
              // 2 etapes plutot que 3 : photo et logo, tous deux optionnels,
              // rejoignent l'etape Profil au lieu de justifier un ecran a
              // eux seuls.
              <Stepper activeStep={step - 1} onChangeStep={(e) => { setErreur(''); setStep(e.index + 1); }} linear>
                <StepperPanel header="Identifiants">
                  <div className="auth-form auth-form-grid" style={{ padding: '1rem 0' }}>
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

                    <div className="auth-field-floating auth-field-full">
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

                    {erreur ? <p className="auth-error auth-field-full">{erreur}</p> : null}

                    <div className="workflow-actions auth-field-full">
                      <Button
                        variant="primary"
                        type="button"
                        onClick={() => {
                          const messageValidation = validerEtape1();
                          if (messageValidation) {
                            setErreur(messageValidation);
                            return;
                          }
                          setErreur('');
                          setStep(2);
                        }}
                        className="auth-submit-btn"
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                </StepperPanel>

                <StepperPanel header="Profil & Église">
                  <div className="auth-form auth-form-grid" style={{ padding: '1rem 0' }}>
                    <div className="auth-field-floating">
                      <div className={`auth-input-wrapper ${champsInvalides.has('nomAffichage') ? 'a-erreur' : ''}`}>
                        <UserRound className="field-icon" size={18} />
                        <input
                          id="nomAffichage"
                          value={nomAffichage}
                          onChange={(event) => setNomAffichage(event.target.value)}
                          placeholder=" "
                          required
                        />
                        <label htmlFor="nomAffichage">{t('auth.display_name')}</label>
                      </div>
                    </div>

                    <div className="auth-field-floating">
                      <div className="auth-input-wrapper">
                        <Church className="field-icon" size={18} />
                        <input
                          id="nomEglise"
                          value={nomEglise}
                          onChange={(event) => setNomEglise(event.target.value)}
                          placeholder=" "
                        />
                        <label htmlFor="nomEglise">{t('auth.church_name')}</label>
                      </div>
                    </div>

                    <div className="auth-field-floating auth-field-full">
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

                    <div className="auth-field auth-field-full">
                      <span className="auth-file-label-text">{t('auth.photo_optional')}</span>
                      <FileUpload
                        mode="basic"
                        name="avatar"
                        accept="image/*"
                        maxFileSize={5000000}
                        onSelect={(e) => setAvatar(e.files[0])}
                        chooseLabel={avatar ? avatar.name : t('auth.select_image')}
                        style={{ width: '100%' }}
                        className="p-button-outlined"
                      />
                    </div>

                    <div className="auth-field auth-field-full">
                      <span className="auth-file-label-text">{t('auth.logo_optional')}</span>
                      <FileUpload
                        mode="basic"
                        name="logoEglise"
                        accept="image/*"
                        maxFileSize={5000000}
                        onSelect={(e) => setLogoEglise(e.files[0])}
                        chooseLabel={logoEglise ? logoEglise.name : t('auth.select_image')}
                        style={{ width: '100%' }}
                        className="p-button-outlined"
                      />
                    </div>

                    {erreur ? <p className="auth-error auth-field-full">{erreur}</p> : null}

                    <div className="workflow-actions auth-field-full">
                      <Button variant="outline-dark" type="button" onClick={() => { setErreur(''); setChampsInvalides(new Set()); setStep(1); }} className="auth-submit-btn">
                        Précédent
                      </Button>
                      <Button
                        variant="primary"
                        icon={Send}
                        type="submit"
                        disabled={soumission}
                        className="auth-submit-btn"
                      >
                        {soumission ? t('auth.btn_register_loading') : t('auth.btn_create_pastor')}
                      </Button>
                    </div>
                  </div>
                </StepperPanel>
              </Stepper>
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
              <Link to="/compte-fidele" state={depuis ? { depuis } : undefined}>{t('auth.faithful_account', 'Vous êtes fidèle ? Accédez à votre compte')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComptePasteur;
