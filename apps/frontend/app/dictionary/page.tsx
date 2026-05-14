'use client';

import { AlertCircle, BookOpen, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookCard, BookCardSkeleton } from '@/components/dictionary/BookCard';
import { Pagination } from '@/components/ui/Pagination';
import { useBooks } from '@/hooks/useBooks';

export default function DictionaryPage() {
  const { books, meta, isLoading, error, page, setPage } = useBooks(18);

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <BookOpen size={14} />
            <span>Dictionary</span>
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary">Book Library</h1>
          <p className="text-text-muted mt-1">
            Choose a book to explore its topics and vocabulary words.
          </p>
        </div>

        <Link
          href="/dictionary/words"
          className="btn-ghost flex items-center gap-2 text-sm self-start sm:self-auto"
        >
          <Search size={14} /> Search all words
        </Link>
      </div>

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30
                        text-danger text-sm mb-6">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {books.map((book, i) => (
              <BookCard key={book.id} book={book} index={i} />
            ))}
          </div>

          {meta && (
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📚</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">No books yet</h3>
      <p className="text-text-muted max-w-xs">
        An admin can upload books and vocabulary words via the admin panel.
      </p>
    </div>
  );
}
