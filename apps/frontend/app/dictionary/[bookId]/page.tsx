'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useTopics } from '@/hooks/useTopics';
import { TopicCard, TopicCardSkeleton } from '@/components/dictionary/TopicCard';
import { useAuth } from '@/context/AuthContext';
import type { Book } from '@/lib/types';

interface Props {
  params: { bookId: string };
}

export default function BookTopicsPage({ params }: Props) {
  const { bookId } = params;
  const { topics, isLoading, error } = useTopics(bookId);
  const { isAuthenticated } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [bookLoading, setBookLoading] = useState(true);

  // Fetch book details for the header
  useEffect(() => {
    api.get<Book>(`/books/${bookId}`)
      .then(({ data }) => setBook(data))
      .catch(() => {})
      .finally(() => setBookLoading(false));
  }, [bookId]);

  return (
    <div className="page-container py-10 animate-fade-in">

      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/dictionary" className="hover:text-primary transition-colors">
          Dictionary
        </Link>
        <ChevronRight size={14} />
        {bookLoading ? (
          <div className="h-4 w-24 skeleton rounded" />
        ) : (
          <span className="text-text-secondary">{book?.title ?? 'Book'}</span>
        )}
      </nav>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <BookOpen size={14} />
            <span>Topics</span>
          </div>
          {bookLoading ? (
            <div className="h-8 w-48 skeleton rounded mb-2" />
          ) : (
            <h1 className="text-3xl font-extrabold text-text-primary">
              {book?.title ?? 'Book Topics'}
            </h1>
          )}
          {book?.description && (
            <p className="text-text-muted mt-1 max-w-xl">{book.description}</p>
          )}
        </div>

        <Link
          href={`/dictionary/words?bookId=${bookId}`}
          className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto"
        >
          <Search size={14} /> All words in this book
        </Link>
      </div>

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30
                        text-danger text-sm mb-6">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Topic List ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TopicCardSkeleton key={i} />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <EmptyState bookId={bookId} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-muted mb-4">
            {topics.length} {topics.length === 1 ? 'topic' : 'topics'} in this book
          </p>
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} bookId={bookId} isAuthenticated={isAuthenticated} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ bookId }: { bookId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📂</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">No topics yet</h3>
      <p className="text-text-muted mb-6 max-w-xs">
        This book has no topics. You can still browse all its words.
      </p>
      <Link
        href={`/dictionary/words?bookId=${bookId}`}
        className="btn-ghost flex items-center gap-2 text-sm"
      >
        <Search size={14} /> Browse all words
      </Link>
    </div>
  );
}
