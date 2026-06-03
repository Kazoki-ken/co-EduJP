'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, ChevronRight, Search, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useTopics } from '@/hooks/useTopics';
import { TopicCard, TopicCardSkeleton } from '@/components/dictionary/TopicCard';
import { useAuth } from '@/context/AuthContext';
import type { Book } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  params: { bookId: string };
}

export default function BookTopicsPage({ params }: Props) {
  const { bookId } = params;
  const { topics, isLoading, error } = useTopics(bookId);
  const { isAuthenticated } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1000); // 1 second duration
  };

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
          {"Lug'at"}
        </Link>
        <ChevronRight size={14} />
        {bookLoading ? (
          <div className="h-4 w-24 skeleton rounded" />
        ) : (
          <span className="text-text-secondary">{book?.title ?? 'Kitob'}</span>
        )}
      </nav>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <BookOpen size={14} />
            <span>Mavzular</span>
          </div>
          {bookLoading ? (
            <div className="h-8 w-48 skeleton rounded mb-2" />
          ) : (
            <h1 className="text-3xl font-extrabold text-text-primary">
              {book?.title ?? 'Kitob mavzulari'}
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
          <Search size={14} /> {"Kitobdagi barcha so'zlar"}
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
            {"Ushbu kitobda "}{topics.length}{" ta mavzu bor"}
          </p>
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} bookId={bookId} isAuthenticated={isAuthenticated} onShowToast={showToast} />
          ))}
        </div>
      )}

      {/* Floating Top-Centered Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{ left: '50%' }}
            className="fixed top-5 z-50 px-5 py-3 rounded-full bg-accent/95 border border-accent/30 text-white font-bold text-sm shadow-glow flex items-center gap-2 backdrop-blur-md"
          >
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ bookId }: { bookId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📂</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">Mavzular mavjud emas</h3>
      <p className="text-text-muted mb-6 max-w-xs">
        {"Ushbu kitobda mavzular yo'q. Baribir undagi barcha so'zlarni ko'rishingiz mumkin."}
      </p>
      <Link
        href={`/dictionary/words?bookId=${bookId}`}
        className="btn-ghost flex items-center gap-2 text-sm"
      >
        <Search size={14} /> {"Barcha so'zlarni ko'rish"}
      </Link>
    </div>
  );
}
