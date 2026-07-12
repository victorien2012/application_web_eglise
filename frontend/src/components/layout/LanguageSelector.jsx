import { useTranslation } from 'react-i18next';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const getFlagUrl = (lang) => {
    if (lang?.startsWith('fr')) return 'https://flagcdn.com/w20/fr.png';
    if (lang?.startsWith('en')) return 'https://flagcdn.com/w20/gb.png';
    return null;
  };

  const flagUrl = getFlagUrl(i18n.language);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 74, 148, 0.05)', padding: '4px 12px', borderRadius: '20px', color: 'var(--text-main)', border: '1px solid rgba(0, 74, 148, 0.1)' }}>
      {flagUrl ? (
        <img src={flagUrl} alt={i18n.language} style={{ width: '20px', height: '15px', objectFit: 'cover', borderRadius: '2px' }} />
      ) : (
        <span style={{ fontSize: '18px', lineHeight: 1 }}>🌐</span>
      )}
      <select 
        value={i18n.language} 
        onChange={handleLanguageChange}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-main)',
          fontWeight: '700',
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

