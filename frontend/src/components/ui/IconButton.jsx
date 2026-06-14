export function IconButton({ icon: Icon, onClick, title, colorVariant = 'default', className = '' }) {
  let styles = {};
  
  switch (colorVariant) {
    case 'primary':
      styles = { color: '#005eb8', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' };
      break;
    case 'danger':
      styles = { color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fef2f2' };
      break;
    case 'default':
    default:
      styles = { color: '#0f172a', borderColor: '#e2e8f0', backgroundColor: '#f8fafc' };
      break;
  }

  return (
    <button 
      type="button" 
      className={`btn-manage-icon ${className}`} 
      onClick={onClick}
      title={title}
      style={styles}
    >
      <Icon size={16} />
    </button>
  );
}
