'use client';

import Link from 'next/link';
import { BookOpen, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/lib/types';

// Deterministic gradient cycle based on index
const GRADIENTS = [
  'from-violet-600/20 to-purple-900/20',
  'from-sky-600/20 to-blue-900/20',
  'from-emerald-600/20 to-teal-900/20',
  'from-amber-600/20 to-orange-900/20',
  'from-rose-600/20 to-pink-900/20',
  'from-cyan-600/20 to-indigo-900/20',
];

const ACCENT_COLORS = [
  'text-violet-400',
  'text-sky-400',
  'text-emerald-400',
  'text-amber-400',
  'text-rose-400',
  'text-cyan-400',
];

interface BookCardProps {
  book: Book;
  index: number;
}

export function BookCard({ book, index }: BookCardProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const accent   = ACCENT_COLORS[index % ACCENT_COLORS.length];

  return (
    <Link
      href={`/dictionary/${book.id}`}
      className={cn(
        'group relative card-glass p-6 flex flex-col gap-4',
        'hover:border-primary/50 hover:shadow-glow-sm hover:-translate-y-1',
        'transition-all duration-200',
      )}
    >
      {/* Gradient overlay */}
      <div className={cn(
        'absolute inset-0 rounded-xl bg-gradient-to-br opacity-0',
        'group-hover:opacity-100 transition-opacity duration-300',
        gradient,
      )} />

      {/* Content */}
      <div className="relative">
        {/* Icon */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
          'bg-gradient-to-br from-surface-2 to-surface',
          'border border-border group-hover:border-primary/40 transition-colors',
        )}>
          <BookOpen size={22} className={cn(accent, 'transition-colors')} />
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg text-text-primary group-hover:text-primary
                       transition-colors leading-tight mb-2 line-clamp-2">
          {book.title}
        </h3>

        {/* Description */}
        {book.description && (
          <p className="text-sm text-text-muted line-clamp-2 mb-4">
            {book.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <BookOpen size={12} />
              {book._count.topics} {book._count.topics === 1 ? 'topic' : 'topics'}
            </span>
          </div>

          <span className="flex items-center gap-1 text-xs text-primary font-medium
                           opacity-0 group-hover:opacity-100 transition-opacity">
            Browse <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function BookCardSkeleton() {
  return (
    <div className="card-glass p-6 flex flex-col gap-4">
      <div className="w-12 h-12 rounded-xl skeleton" />
      <div className="space-y-2">
        <div className="h-5 w-3/4 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-4 w-2/3 skeleton rounded" />
      </div>
      <div className="h-3 w-1/3 skeleton rounded" />
    </div>
  );
}
