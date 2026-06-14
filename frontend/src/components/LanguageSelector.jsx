import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', color: '#e0e0ff' }}>
      <Globe size={16} />
      <select 
        value={i18n.language} 
        onChange={handleLanguageChange}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          fontWeight: '600',
          cursor: 'pointer',
          outline: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          paddingRight: '0.25rem'
        }}
      >
        <option value="fr" style={{ color: '#0f172a' }}>FR</option>
        <option value="en" style={{ color: '#0f172a' }}>EN</option>
      </select>
    </div>
  );
}
