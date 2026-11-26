'use client';

import { Icon } from './Icon';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
  label?: string;
}

const pageItems = (page: number, totalPages: number): Array<number | 'gap'> => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const items: Array<number | 'gap'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push('gap');
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < totalPages - 1) items.push('gap');
  items.push(totalPages);
  return items;
};

export function Pagination({ page, totalPages, onChange, disabled, label = 'Пагінація' }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label={label}>
      <button
        type="button"
        className="pagination__arrow"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Попередня сторінка"
      >
        <Icon name="i-chevron-left" size={18} />
      </button>
      <ul className="pagination__list">
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} className="pagination__gap" aria-hidden="true">…</li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`pagination__page ${item === page ? 'is-current' : ''}`}
                onClick={() => onChange(item)}
                disabled={disabled}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Сторінка ${item}`}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        className="pagination__arrow"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Наступна сторінка"
      >
        <Icon name="i-chevron-right" size={18} />
      </button>
    </nav>
  );
}
