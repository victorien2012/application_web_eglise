export function Table({ columns, children, className = '' }) {
  return (
    <div className={`datatable-responsive ${className}`}>
      <table className="premium-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index} style={col.style}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}
