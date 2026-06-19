import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Save, AlertCircle } from 'lucide-react';
import { useSite } from '../../../context/SiteContext';
import { api } from '../../../services/api';
import { Button } from '../../../components/Button';
import { Toast } from 'primereact/toast';

export function GestionConfiguration() {
  const { t } = useTranslation();
  const { siteConfig, refetchSiteConfig } = useSite();
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(siteConfig?.logo || null);
  const [nomSite, setNomSite] = useState(siteConfig?.nom_site || 'Mon Eglise');
  const [enCours, setEnCours] = useState(false);
  const toast = useRef(null);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setEnCours(true);
    try {
      const formData = new FormData();
      formData.append('nom_site', nomSite);
      if (logo) {
        formData.append('logo', logo);
      }

      await api.patch('/configuration/update_current/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.current.show({ severity: 'success', summary: 'Succès', detail: 'Configuration mise à jour avec succès.', life: 3000 });
      await refetchSiteConfig();
    } catch (error) {
      console.error(error);
      toast.current.show({ severity: 'error', summary: 'Erreur', detail: 'Impossible de mettre à jour la configuration.', life: 3000 });
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

      <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: '#475569', fontSize: '0.9rem' }}>
          <AlertCircle size={18} style={{ marginTop: '0.1rem', flexShrink: 0 }} color="#0ea5e9" />
          <p style={{ margin: 0 }}>
            Les modifications apportées ici affecteront l'apparence globale du site pour tous les visiteurs, y compris la barre de navigation et les pages de connexion.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
        
        <div>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
            Nom du site
          </label>
          <input 
            type="text" 
            value={nomSite} 
            onChange={(e) => setNomSite(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem 1rem', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1',
              fontSize: '1rem'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
            Logo du site
          </label>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginTop: '0.5rem' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '12px', 
              border: '2px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: '#f1f5f9',
              padding: '0.5rem'
            }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aucun logo</span>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.75rem 1.25rem', 
                backgroundColor: '#f8fafc', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: 500,
                color: '#334155',
                transition: 'all 0.2s'
              }}
              className="hover-bg-slate-100"
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
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                Formats recommandés : PNG (fond transparent) ou JPG.<br/>
                Taille idéale : 200x200 pixels.
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
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
