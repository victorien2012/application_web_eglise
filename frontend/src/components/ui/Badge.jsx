export function Badge({ children, variant = 'default', className = '' }) {
  // variants from PastorDashboard.css: scheduled, published, draft
  return (
    <span className={`status-badge ${variant} ${className}`}>
      {children}
    </span>
  );
}
