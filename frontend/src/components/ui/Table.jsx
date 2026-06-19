import React from 'react';
import './Table.css';

export function Table({ columns, data, keyExtractor, rowStyle, children, className = '' }) {
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
          {data ? data.map((row, i) => (
            <tr 
              key={keyExtractor ? keyExtractor(row) : i} 
              className="datatable-row"
              style={rowStyle ? rowStyle(row) : undefined}
            >
              {columns.map((col, j) => (
                <td key={j} style={col.cellStyle} className={col.className || ''}>
                  {col.render ? col.render(row) : row[col.field]}
                </td>
              ))}
            </tr>
          )) : children}
        </tbody>
      </table>
    </div>
  );
}
