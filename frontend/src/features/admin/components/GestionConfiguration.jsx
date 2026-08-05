import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Save, AlertCircle } from 'lucide-react';
import { useSite } from '../../../context/SiteContext';
import { api } from '../../../services/api';
import { Button } from '../../../components/Button';
import { Toast } from 'primereact/toast';

const EXTENSIONS_LOGO = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
const TAILLE_MAX_LOGO_MO = 2;

export function GestionConfiguration() {
  const { t } = useTranslation();
  const { siteConfig, refetchSiteConfig } = useSite();
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(siteConfig?.logo || null);
  const [nomSite, setNomSite] = useState(siteConfig?.nom_site || '');
  const [erreurFichier, setErreurFichier] = useState('');
  const [enCours, setEnCours] = useState(false);
  const toast = useRef(null);
  const apercuLocal = useRef(null);

  // La configuration du site est chargée de façon asynchrone : si ce panneau est
  // monté avant la fin du chargement, les champs restaient sur leurs valeurs par
  // défaut et un enregistrement écrasait le vrai nom du site par « Mon Eglise ».
  useEffect(() => {
    if (!siteConfig) return;
    setNomSite((actuel) => (actuel ? actuel : siteConfig.nom_site || ''));
    setLogoPreview((actuel) => (actuel ? actuel : siteConfig.logo || null));
  }, [siteConfig]);

  // Libère l'URL de prévisualisation créée pour le fichier choisi.
  useEffect(() => () => {
    if (apercuLocal.current) URL.revokeObjectURL(apercuLocal.current);
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!EXTENSIONS_LOGO.includes(extension)) {
      setErreurFichier(`Format non supporté. Formats acceptés : ${EXTENSIONS_LOGO.join(', ')}.`);
      e.target.value = '';
      return;
    }
    if (file.size > TAILLE_MAX_LOGO_MO * 1024 * 1024) {
      setErreurFichier(
        `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). Maximum : ${TAILLE_MAX_LOGO_MO} Mo.`
      );
      e.target.value = '';
      return;
    }

    setErreurFichier('');
    setLogo(file);
    if (apercuLocal.current) URL.revokeObjectURL(apercuLocal.current);
    apercuLocal.current = URL.createObjectURL(file);
    setLogoPreview(apercuLocal.current);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nomSite.trim()) {
      setErreurFichier('');
      toast.current?.show({ severity: 'warn', summary: 'Champ requis', detail: 'Le nom du site ne peut pas être vide.', life: 3000 });
      return;
    }
    setEnCours(true);
    try {
      const formData = new FormData();
      formData.append('nom_site', nomSite.trim());
      if (logo) {
        formData.append('logo', logo);
      }

      await api.patch('/configuration/update_current/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.current?.show({ severity: 'success', summary: 'Succès', detail: 'Configuration mise à jour avec succès.', life: 3000 });
      setLogo(null);
      await refetchSiteConfig();
    } catch (error) {
      const detail = error.response?.data?.logo?.[0]
        || error.response?.data?.nom_site?.[0]
        || 'Impossible de mettre à jour la configuration.';
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail, life: 4000 });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="dashboard-section card fade-in" style={{ padding: '2rem' }}>
      <Toast ref={toast} />
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        Paramètres globaux du site
      </h2>

      <div style={{ backgroundColor: 'var(--bg-alt)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <AlertCircle size={18} style={{ marginTop: '0.1rem', flexShrink: 0 }} color="var(--primary)" />
          <p style={{ margin: 0 }}>
            Les modifications apportées ici affecteront l'apparence globale du site pour tous les visiteurs, y compris la barre de navigation et les pages de connexion.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
        
        <div>
          <label htmlFor="config-nom-site" style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Nom du site
          </label>
          <input
            id="config-nom-site"
            type="text"
            required
            value={nomSite}
            onChange={(e) => setNomSite(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '1rem'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Logo du site
          </label>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginTop: '0.5rem' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '12px', 
              border: '2px dashed var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-alt)',
              padding: '0.5rem'
            }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun logo</span>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.75rem 1.25rem', 
                backgroundColor: 'var(--bg-alt)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: 500,
                color: 'var(--text-main)',
                transition: 'all 0.2s'
              }}
              
              >
                <Upload size={18} />
                Choisir une image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
              </label>
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Formats acceptés : PNG (fond transparent), JPG, WEBP, GIF ou SVG.<br/>
                Taille idéale : 200x200 pixels — {TAILLE_MAX_LOGO_MO} Mo maximum.
              </p>
              {erreurFichier && (
                <p role="alert" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
                  {erreurFichier}
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            type="submit" 
            disabled={enCours}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
          >
            {enCours ? (
              <span>Enregistrement...</span>
            ) : (
              <>
                <Save size={18} />
                Enregistrer les paramètres
              </>
            )}
          </Button>
        </div>

      </form>
    </div>
  );
}
