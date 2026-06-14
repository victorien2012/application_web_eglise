import { useState, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { FileUpload } from 'primereact/fileupload';
import { User, Church, Phone, Image, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from './Button';
import { PremiumProfileHeader } from './PremiumProfileHeader';
import { Card } from './ui/Card';
import '../pages/Auth.css'; // Pour réutiliser le composant auth-file-upload

export function ModifierProfilPasteur() {
  const { pasteur, actualiserProfilPasteur } = useAuth();
  const { t } = useTranslation();

  const [nomAffichage, setNomAffichage] = useState(pasteur?.nom_affichage || '');
  const [nomEglise, setNomEglise] = useState(pasteur?.nom_eglise || '');
  const [contact, setContact] = useState(pasteur?.contact || '');
  const [avatar, setAvatar] = useState(null);
  const [logoEglise, setLogoEglise] = useState(null);

  const [erreur, setErreur] = useState('');
  const toast = useRef(null);
  const [soumission, setSoumission] = useState(false);

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
      if (avatar) formData.append('avatar', avatar);
      if (logoEglise) formData.append('logo_eglise', logoEglise);

      const response = await api.patch('/pasteurs/mon_profil/', formData);

      // Mettre à jour la session globale sans recharger
      actualiserProfilPasteur(response.data);

      toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.profile_update_success'), life: 5000 });
      // Réinitialiser les fichiers
      setAvatar(null);
      setLogoEglise(null);
    } catch (err) {
      setErreur(extraireErreur(err));
    } finally {
      setSoumission(false);
    }
  }

  return (
    <div className="dashboard-tab-content" style={{ padding: '0' }}>
      <Toast ref={toast} />

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Section d'en-tête très compacte */}
          <div style={{ position: 'relative', background: '#ffffff' }}>
            <div style={{ height: '60px', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>
            
            <div style={{ padding: '0 1.5rem 0.75rem 1.5rem', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Photo */}
              <div style={{ 
                marginTop: '-25px', 
                width: '60px', 
                height: '60px', 
                borderRadius: '12px', 
                padding: '2px',
                background: 'rgba(255, 255, 255, 0.9)', 
                backdropFilter: 'blur(10px)',
                boxShadow: '0 5px 15px -5px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                zIndex: 10
              }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pasteur?.avatar ? (
                    <img src={pasteur.avatar} alt={pasteur?.nom_affichage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={30} color="#94a3b8" />
                  )}
                </div>
              </div>
              
              {/* Informations du pasteur */}
              <div style={{ paddingBottom: '0.15rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {pasteur?.nom_affichage || t('profile.default_user')}
                </h2>
                <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontSize: '0.8rem', fontWeight: 600, backgroundColor: '#eff6ff', padding: '0.2rem 0.75rem', borderRadius: '99px', border: '1px solid #dbeafe', width: 'max-content' }}>
                  <Church size={12} />
                  {pasteur?.nom_eglise || 'Aucune église spécifiée'}
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f8fafc', background: '#fcfcfc' }}>
            {erreur && (
              <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {erreur}
              </div>
            )}

            <form className="dashboard-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="dashboard-grid-2" style={{ gap: '1rem' }}>
                <label className="dashboard-field" style={{ margin: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}><User size={14} /> {t('dashboard.profile_name_label')}</span>
                  <input
                    id="nomAffichage"
                    value={nomAffichage}
                    onChange={(e) => setNomAffichage(e.target.value)}
                    placeholder={t('dashboard.profile_name_placeholder')}
                    required
                    style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                  />
                </label>

                <label className="dashboard-field" style={{ margin: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}><Church size={14} /> {t('dashboard.profile_church_label')}</span>
                  <input
                    id="nomEglise"
                    value={nomEglise}
                    onChange={(e) => setNomEglise(e.target.value)}
                    placeholder={t('dashboard.profile_church_placeholder')}
                    style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                  />
                </label>
              </div>

              <label className="dashboard-field" style={{ margin: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}><Phone size={14} /> {t('dashboard.profile_contact_label')}</span>
                <input
                  id="contact"
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t('dashboard.profile_contact_placeholder')}
                  style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                />
              </label>

              <div className="dashboard-grid-2" style={{ gap: '1rem' }}>
                <div className="dashboard-field" style={{ margin: 0 }}>
                  <span style={{ fontSize: '0.85rem' }}>{t('dashboard.profile_avatar_label')}</span>
                  <FileUpload
                    mode="basic"
                    name="avatar"
                    accept="image/*"
                    maxFileSize={5000000}
                    onSelect={(e) => setAvatar(e.files[0])}
                    chooseLabel={avatar ? avatar.name : t('dashboard.profile_change_avatar')}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    className="p-button-outlined p-button-sm"
                  />
                </div>

                <div className="dashboard-field" style={{ margin: 0, marginLeft: 'auto', paddingLeft: '4rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>{t('dashboard.profile_logo_label')}</span>
                  <FileUpload
                    mode="basic"
                    name="logoEglise"
                    accept="image/*"
                    maxFileSize={5000000}
                    onSelect={(e) => setLogoEglise(e.files[0])}
                    chooseLabel={logoEglise ? logoEglise.name : t('dashboard.profile_change_logo')}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    className="p-button-outlined p-button-sm"
                  />
                </div>
              </div>

              <div className="dashboard-inline" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                <button className="btn btn-dark" type="submit" disabled={soumission} style={{ minWidth: '120px', padding: '0.5rem', fontSize: '0.9rem', justifyContent: 'center' }}>
                  {soumission ? (
                    <>
                      <Loader2 className="spinner" size={14} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} />
                      {t('dashboard.saving')}
                    </>
                  ) : (
                    <>
                      <Save size={14} style={{ marginRight: '6px' }} />
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
