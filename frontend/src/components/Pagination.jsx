// src/components/Pagination.jsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

export default function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;

  // Génère les numéros à afficher avec ellipses
  function getPages() {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  const pages = getPages();

  return (
    <nav className="pagination-nav" aria-label="Pagination">
      <button
        className="pagination-btn pagination-prev"
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        aria-label="Page précédente"
      >
        <ChevronLeft size={16} />
        Préc.
      </button>

      <div className="pagination-pages">
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`pagination-btn pagination-page ${p === current ? 'active' : ''}`}
              onClick={() => onChange(p)}
              aria-current={p === current ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        className="pagination-btn pagination-next"
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Page suivante"
      >
        Suiv.
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
