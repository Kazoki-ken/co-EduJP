'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { BookOpen, Bookmark, BookmarkCheck, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { Book } from '@/lib/types';

/**
 * One palette per card, cycled by index so a shelf of books reads as a shelf
 * — different spines, same shape. Each entry carries every class the card
 * needs, so a colour is changed in exactly one place.
 */
interface Palette {
  /** Vertical bar down the left edge — the book's spine. */
  spine: string;
  /** Icon tile. */
  tile: string;
  /** Accent text and the watermark tint. */
  text: string;
  /** Title colour on hover — spelled out because Tailwind needs whole classes. */
  titleHover: string;
  /** Wash that fades in on hover. */
  wash: string;
  /** Coloured glow on hover — sits on the card itself, so `hover:` not `group-hover:`. */
  glow: string;
  /** Border once hovered — same reason. */
  border: string;
}

const PALETTES: Palette[] = [
  {
    spine: 'from-violet-400 to-purple-700',
    tile: 'from-violet-500 to-purple-700',
    text: 'text-violet-600 dark:text-violet-400',
    titleHover: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    wash: 'from-violet-500/[0.09] to-transparent',
    glow: 'hover:shadow-[0_0_26px_rgba(139,92,246,0.22)]',
    border: 'hover:border-violet-500/40',
  },
  {
    spine: 'from-sky-400 to-blue-700',
    tile: 'from-sky-500 to-blue-700',
    text: 'text-sky-600 dark:text-sky-400',
    titleHover: 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
    wash: 'from-sky-500/[0.09] to-transparent',
    glow: 'hover:shadow-[0_0_26px_rgba(14,165,233,0.22)]',
    border: 'hover:border-sky-500/40',
  },
  {
    spine: 'from-emerald-400 to-teal-700',
    tile: 'from-emerald-500 to-teal-700',
    text: 'text-emerald-600 dark:text-emerald-400',
    titleHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    wash: 'from-emerald-500/[0.09] to-transparent',
    glow: 'hover:shadow-[0_0_26px_rgba(16,185,129,0.22)]',
    border: 'hover:border-emerald-500/40',
  },
  {
    spine: 'from-amber-400 to-orange-700',
    tile: 'from-amber-400 to-orange-600',
    text: 'text-amber-600 dark:text-amber-400',
    titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    wash: 'from-amber-500/[0.09] to-transparent',
    glow: 'hover:shadow-[0_0_26px_rgba(245,158,11,0.22)]',
    border: 'hover:border-amber-500/40',
  },
  {
    spine: 'from-rose-400 to-pink-700',
    tile: 'from-rose-500 to-pink-700',
    text: 'text-rose-600 dark:text-rose-400',
    titleHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    wash: 'from-rose-500/[0.09] to-transparent',
    glow: 'hover:shadow-[0_0_26px_rgba(244,63,94,0.22)]',
    border: 'hover:border-rose-500/40',
  },
  {
    spine: 'from-cyan-400 to-indigo-700',
    tile: 'from-cyan-500 to-indigo-700',
    text: 'text-cyan-600 dark:text-cyan-400',
    titleHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
    wash: 'from-cyan-500/[0.09] to-transparent',
    glow: 'hover:shadow-[0_0_26px_rgba(6,182,212,0.22)]',
    border: 'hover:border-cyan-500/40',
  },
];

interface BookCardProps {
  book: Book;
  index: number;
  isAuthenticated?: boolean;
}

export function BookCard({ book, index, isAuthenticated }: BookCardProps) {
  const palette = PALETTES[index % PALETTES.length];

  const [isSaved, setIsSaved] = useState(!!(book as any).isSaved);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();  // prevent Link navigation
    e.stopPropagation();
    if (isSaving || !isAuthenticated) return;
    setIsSaving(true);
    setIsSaved(prev => !prev); // optimistic
    try {
      const { data } = await api.post<{ saved: boolean }>(`/books/${book.id}/save`);
      setIsSaved(data.saved);
    } catch {
      setIsSaved(prev => !prev); // revert
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, isAuthenticated, book.id]);

  return (
    <Link
      href={`/dictionary/${book.id}`}
      className={cn(
        'group relative card-glass overflow-hidden p-6 pl-7 flex flex-col gap-4',
        'hover:-translate-y-1 transition-all duration-200',
        palette.border,
        palette.glow,
      )}
    >
      {/* The book's spine, down the left edge. */}
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b', palette.spine)}
      />

      {/* 本 ("book") watermark — fills the empty corner and gives each card a
          Japanese anchor without competing with the title. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-3 -top-5 select-none text-[5.5rem] font-black leading-none',
          'opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.13]',
          palette.text,
        )}
      >
        本
      </span>

      {/* Colour wash on hover */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0',
          'group-hover:opacity-100 transition-opacity duration-300',
          palette.wash,
        )}
      />

      {/* Content */}
      <div className="relative">
        {/* Top row: icon + save button */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center text-white',
            'bg-gradient-to-br ring-1 ring-inset ring-white/20',
            'transition-transform duration-200 group-hover:scale-105',
            palette.tile,
          )}>
            <BookOpen size={22} />
          </div>

          {/* Save button */}
          {isAuthenticated && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              title={isSaved ? "Kitobni saqlanganlardan o'chirish" : "Kitobni saqlash"}
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-all z-10',
                'opacity-0 group-hover:opacity-100',
                isSaved && 'opacity-100',
                isSaving && 'opacity-50 cursor-wait',
                isSaved
                  ? 'bg-accent/15 text-accent hover:bg-danger/15 hover:text-danger'
                  : 'hover:bg-surface-2 text-text-muted hover:text-accent',
              )}
            >
              {isSaving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck size={16} className="fill-accent" />
              ) : (
                <Bookmark size={16} />
              )}
            </button>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn(
            'font-bold text-lg text-text-primary transition-colors leading-tight mb-2 line-clamp-2',
            palette.titleHover,
          )}
        >
          {book.title}
        </h3>

        {/* Description */}
        {book.description && (
          <p className="text-sm text-text-muted line-clamp-2 mb-4">
            {book.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/70',
              'px-2.5 py-1 text-xs font-semibold text-text-secondary',
            )}
          >
            <BookOpen size={12} className={palette.text} />
            {book._count.topics} ta mavzu
          </span>

          <span
            className={cn(
              'flex items-center gap-1 text-xs font-bold transition-all duration-200',
              'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0',
              palette.text,
            )}
          >
            {"Ko'rish"}
            <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
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
