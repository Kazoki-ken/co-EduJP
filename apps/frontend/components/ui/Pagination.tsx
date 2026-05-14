'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page:       number;
  totalPages: number;
  total:      number;
  limit:      number;
  onChange:   (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  // Build visible page numbers with ellipsis
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3)            pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      {/* Result count */}
      <p className="text-sm text-text-muted order-2 sm:order-1">
        Showing{' '}
        <span className="text-text-secondary font-medium">{from}–{to}</span>
        {' '}of{' '}
        <span className="text-text-secondary font-medium">{total}</span>
        {' '}results
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <NavButton onClick={() => onChange(1)}       disabled={page === 1}           title="First page">
          <ChevronsLeft size={14} />
        </NavButton>
        <NavButton onClick={() => onChange(page - 1)} disabled={page === 1}          title="Previous page">
          <ChevronLeft size={14} />
        </NavButton>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-text-muted text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                p === page
                  ? 'bg-primary text-white shadow-glow-sm'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
              )}
            >
              {p}
            </button>
          ),
        )}

        <NavButton onClick={() => onChange(page + 1)} disabled={page === totalPages} title="Next page">
          <ChevronRight size={14} />
        </NavButton>
        <NavButton onClick={() => onChange(totalPages)} disabled={page === totalPages} title="Last page">
          <ChevronsRight size={14} />
        </NavButton>
      </div>
    </div>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
        disabled
          ? 'text-text-muted opacity-40 cursor-not-allowed'
          : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}
