'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useWords } from '@/hooks/useWords';
import { WordCard, WordCardSkeleton } from '@/components/dictionary/WordCard';
import { WordFilters, type WordFiltersValue } from '@/components/dictionary/WordFilters';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/context/AuthContext';
import type { Book, Topic } from '@/lib/types';

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function WordsPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  // ── Derive filter state from URL params ────────────────────────────────
  const [filters, setFilters] = useState<WordFiltersValue>({
    search:  searchParams.get('search')  ?? '',
    bookId:  searchParams.get('bookId')  ?? '',
    topicId: searchParams.get('topicId') ?? '',
  });
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));

  // ── Reference data for filter dropdowns ───────────────────────────────
  const [books,  setBooks]  = useState<Book[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    api.get<{ data: Book[] }>('/books', { params: { limit: 100 } })
      .then(({ data }) => setBooks(data.data))
      .catch(() => {});
    api.get<Topic[]>('/topics')
      .then(({ data }) => setTopics(data))
      .catch(() => {});
  }, []);

  // ── Sync state → URL without full navigation ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search)  params.set('search',  filters.search);
    if (filters.bookId)  params.set('bookId',  filters.bookId);
    if (filters.topicId) params.set('topicId', filters.topicId);
    if (page > 1)        params.set('page',    String(page));
    const qs = params.toString();
    router.replace(`/dictionary/words${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [filters, page, router]);

  // ── Word data ─────────────────────────────────────────────────────────
  const { words, meta, isLoading, error, toggleSave } = useWords({
    ...filters,
    page,
    limit: 20,
  });

  const handleFiltersChange = (next: WordFiltersValue) => {
    setFilters(next);
    setPage(1); // reset page on filter change
  };

  // ── Breadcrumb book name ──────────────────────────────────────────────
  const selectedBook = books.find((b) => b.id === filters.bookId);

  return (
    <div className="page-container py-10 animate-fade-in">

      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6 flex-wrap">
        <Link href="/dictionary" className="hover:text-primary transition-colors">
          {"Lug'at"}
        </Link>
        {selectedBook && (
          <>
            <ChevronRight size={14} />
            <Link
              href={`/dictionary/${selectedBook.id}`}
              className="hover:text-primary transition-colors"
            >
              {selectedBook.title}
            </Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-text-secondary">{"So'zlar"}</span>
      </nav>

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
          <BookOpen size={14} />
          <span>{"So'zlar ro'yxati"}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary">
              {selectedBook ? selectedBook.title : "Barcha so'zlar"}
            </h1>
            {meta && (
              <p className="text-text-muted mt-1 text-sm">
                {meta.total.toLocaleString()} {"ta so'z topildi"}
              </p>
            )}
          </div>

          {!isAuthenticated && (
            <p className="text-xs text-text-muted bg-surface-2 border border-border
                          rounded-lg px-3 py-2 max-w-xs">
              💡{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                {"Tizimga kiring"}
              </Link>{' '}
              {"so'zlarni shaxsiy ro'yxatingizga saqlash uchun."}
            </p>
          )}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="card-glass p-4 mb-6">
        <WordFilters
          value={filters}
          books={books}
          topics={topics}
          onChange={handleFiltersChange}
        />
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30
                        text-danger text-sm mb-6">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Word Grid ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <WordCardSkeleton key={i} />
          ))}
        </div>
      ) : words.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="space-y-3">
            {words.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                isAuthenticated={isAuthenticated}
                onToggleSave={toggleSave}
              />
            ))}
          </div>

          {meta && (
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Page export — Suspense boundary for useSearchParams ──────────────────────

export default function WordsPage() {
  return (
    <Suspense fallback={
      <div className="page-container py-10">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <WordCardSkeleton key={i} />
          ))}
        </div>
      </div>
    }>
      <WordsPageInner />
    </Suspense>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">{"So'zlar topilmadi"}</h3>
      <p className="text-text-muted max-w-xs">
        {"Qidiruv matnini o'zgartiring yoki filtrlarni tozalang."}
      </p>
    </div>
  );
}
