import { useState, useRef, useEffect } from 'react';
import { Toast } from 'primereact/toast';
import { FileUpload } from 'primereact/fileupload';
import { User, Church, Phone, Save, Loader2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import '../../auth/pages/Auth.css'; // Pour réutiliser le composant auth-file-upload

const LIMITE_BIO = 500;

export function ModifierProfilPasteur() {
  const { pasteur, actualiserProfilPasteur } = useAuth();
  const { t } = useTranslation();

  const [nomAffichage, setNomAffichage] = useState(pasteur?.nom_affichage || '');
  const [nomEglise, setNomEglise] = useState(pasteur?.nom_eglise || '');
  const [contact, setContact] = useState(pasteur?.contact || '');
  const [biographie, setBiographie] = useState(pasteur?.biographie || '');
  const [avatar, setAvatar] = useState(null);
  const [logoEglise, setLogoEglise] = useState(null);
  // Aperçus locaux : sans eux, choisir le mauvais fichier ne se remarquait
  // qu'après l'enregistrement — seul le nom du fichier était visible avant.
  const [avatarApercu, setAvatarApercu] = useState(null);
  const [logoApercu, setLogoApercu] = useState(null);
  const avatarUrlRef = useRef(null);
  const logoUrlRef = useRef(null);

  const [erreur, setErreur] = useState('');
  const toast = useRef(null);
  const [soumission, setSoumission] = useState(false);

  useEffect(() => () => {
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
  }, []);

  function choisirAvatar(fichier) {
    setAvatar(fichier);
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    avatarUrlRef.current = fichier ? URL.createObjectURL(fichier) : null;
    setAvatarApercu(avatarUrlRef.current);
  }

  function choisirLogo(fichier) {
    setLogoEglise(fichier);
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    logoUrlRef.current = fichier ? URL.createObjectURL(fichier) : null;
    setLogoApercu(logoUrlRef.current);
  }

  function extraireErreur(error) {
    const data = error.response?.data;
    if (!data) return t('dashboard.profile_update_error');
    if (typeof data === 'string') return data;
    const premier = Object.values(data)[0];
    if (Array.isArray(premier)) return premier[0];
    return premier || t('dashboard.profile_update_error');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    setSoumission(true);

    try {
      const formData = new FormData();
      formData.append('nom_affichage', nomAffichage);
      formData.append('nom_eglise', nomEglise);
      formData.append('contact', contact);
      formData.append('biographie', biographie);
      if (avatar) formData.append('avatar', avatar);
      if (logoEglise) formData.append('logo_eglise', logoEglise);

      const response = await api.patch('/pasteurs/mon_profil/', formData);

      // Mettre à jour la session globale sans recharger
      actualiserProfilPasteur(response.data);

      toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.profile_update_success'), life: 5000 });
      // Réinitialiser les fichiers : l'aperçu local n'a plus lieu d'être,
      // pasteur.avatar (rafraîchi ci-dessus) reflète désormais la même image.
      choisirAvatar(null);
      choisirLogo(null);
    } catch (err) {
      setErreur(extraireErreur(err));
    } finally {
      setSoumission(false);
    }
  }

  const restantBio = LIMITE_BIO - biographie.length;

  return (
    <div className="dashboard-tab-content" style={{ padding: '0' }}>
      <Toast ref={toast} />

      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* En-tête d'identité : bande institutionnelle fixe (mêmes tons que
              la barre de navigation) plutôt qu'un dégradé arbitraire, pour
              rester cohérent avec le reste du site. */}
          <div style={{ position: 'relative', background: 'var(--bg-card)' }}>
            <div style={{ height: '104px', background: 'var(--navbar-bg)', borderBottom: '3px solid var(--accent)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.12, backgroundImage: 'radial-gradient(circle at 24px 24px, white 2px, transparent 0)', backgroundSize: '48px 48px' }} />
            </div>

            <div style={{ padding: '0 2rem 1.25rem', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '1.25rem', flexWrap: 'wrap' }}>
              {/* Photo : forme circulaire, pour la distinguer d'un coup d'œil
                  du logo d'église (rectangulaire) plus bas dans le formulaire. */}
              <div style={{
                marginTop: '-44px',
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                padding: '4px',
                background: 'var(--bg-card)',
                boxShadow: '0 6px 18px -6px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                zIndex: 10,
                flexShrink: 0
              }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarApercu || pasteur?.avatar ? (
                    <img src={avatarApercu || pasteur.avatar} alt={pasteur?.nom_affichage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={38} color="var(--text-muted)" />
                  )}
                </div>
              </div>

              <div style={{ paddingBottom: '0.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {pasteur?.nom_affichage || t('profile.default_user')}
                </h2>
                <div style={{ marginTop: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600, backgroundColor: 'rgba(var(--primary-rgb), 0.1)', padding: '0.25rem 0.8rem', borderRadius: '99px', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                  <Church size={13} />
                  {pasteur?.nom_eglise || 'Aucune église spécifiée'}
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div style={{ padding: '1.75rem 2rem 2rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            {erreur && (
              <div role="alert" style={{ padding: '0.85rem 1rem', background: 'rgba(var(--danger-rgb), 0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                {erreur}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

              {/* ---- Section : identité personnelle ---- */}
              <section>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  <User size={14} /> {t('dashboard.profile_section_you', 'Vos informations')}
                </h3>

                <div className="dashboard-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div className="dashboard-grid-2" style={{ gap: '1.1rem' }}>
                    <label className="dashboard-field" style={{ margin: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><User size={14} /> {t('dashboard.profile_name_label')}</span>
                      <input
                        id="nomAffichage"
                        value={nomAffichage}
                        onChange={(e) => setNomAffichage(e.target.value)}
                        placeholder={t('dashboard.profile_name_placeholder')}
                        required
                      />
                    </label>

                    <label className="dashboard-field" style={{ margin: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Phone size={14} /> {t('dashboard.profile_contact_label')}</span>
                      <input
                        id="contact"
                        type="tel"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder={t('dashboard.profile_contact_placeholder')}
                      />
                    </label>
                  </div>

                  <div className="dashboard-field" style={{ margin: 0 }}>
                    <span>{t('dashboard.profile_avatar_label')}</span>
                    <FileUpload
                      mode="basic"
                      name="avatar"
                      accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                      maxFileSize={5000000}
                      onSelect={(e) => choisirAvatar(e.files[0])}
                      onClear={() => choisirAvatar(null)}
                      chooseLabel={avatar ? avatar.name : t('dashboard.profile_change_avatar')}
                      style={{ width: '100%', maxWidth: '340px' }}
                      className="p-button-outlined p-button-sm"
                    />
                    {/* Pas d'aperçu séparé ici : la photo en tête de page se
                        met déjà à jour en direct dès qu'un fichier est choisi. */}
                  </div>

                  <label className="dashboard-field" style={{ margin: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FileText size={14} /> {t('dashboard.profile_bio_label', 'Biographie')}</span>
                      <small style={{ color: restantBio < 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
                        {biographie.length} / {LIMITE_BIO}
                      </small>
                    </span>
                    <textarea
                      id="biographie"
                      value={biographie}
                      onChange={(e) => setBiographie(e.target.value.slice(0, LIMITE_BIO))}
                      placeholder={t('dashboard.profile_bio_placeholder', 'Présentez-vous en quelques phrases : votre parcours, votre ministère, votre message...')}
                      rows={4}
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <small className="champ-aide" style={{ color: 'var(--text-muted)' }}>
                      {t('dashboard.profile_bio_help', 'Visible sur votre fiche publique et la liste des pasteurs.')}
                    </small>
                  </label>
                </div>
              </section>

              {/* ---- Section : église ---- */}
              <section style={{ paddingTop: '1.75rem', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  <Church size={14} /> {t('dashboard.profile_section_church', 'Votre église')}
                </h3>

                <div className="dashboard-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <label className="dashboard-field" style={{ margin: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Church size={14} /> {t('dashboard.profile_church_label')}</span>
                    <input
                      id="nomEglise"
                      value={nomEglise}
                      onChange={(e) => setNomEglise(e.target.value)}
                      placeholder={t('dashboard.profile_church_placeholder')}
                    />
                  </label>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="dashboard-field" style={{ margin: 0, flex: '1 1 240px' }}>
                      <span>{t('dashboard.profile_logo_label')}</span>
                      <FileUpload
                        mode="basic"
                        name="logoEglise"
                        accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                        maxFileSize={5000000}
                        onSelect={(e) => choisirLogo(e.files[0])}
                        onClear={() => choisirLogo(null)}
                        chooseLabel={logoEglise ? logoEglise.name : t('dashboard.profile_change_logo')}
                        style={{ width: '100%' }}
                        className="p-button-outlined p-button-sm"
                      />
                    </div>
                    {logoApercu && (
                      <img
                        src={logoApercu}
                        alt="Aperçu du nouveau logo"
                        style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }}
                      />
                    )}
                  </div>
                </div>
              </section>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                <button className="btn btn-dark" type="submit" disabled={soumission} style={{ minWidth: '160px', padding: '0.7rem 1.25rem', fontSize: '0.92rem', justifyContent: 'center' }}>
                  {soumission ? (
                    <>
                      <Loader2 className="spinner" size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                      {t('dashboard.saving')}
                    </>
                  ) : (
                    <>
                      <Save size={16} style={{ marginRight: '8px' }} />
                      {t('dashboard.save_changes')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
