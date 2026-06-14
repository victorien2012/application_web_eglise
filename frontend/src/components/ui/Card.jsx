export function Card({ children, className = '', title, subtitle, actions }) {
  return (
    <div className={`form-card ${className}`} style={{ maxWidth: '800px', margin: '0 auto', ...(!className ? {} : undefined) }}>
      {(title || subtitle || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div>
            {title && <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{title}</h3>}
            {subtitle && <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
