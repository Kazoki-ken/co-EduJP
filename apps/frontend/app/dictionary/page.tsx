'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, Search, Book, Tag } from 'lucide-react';
import Link from 'next/link';
import { BookCard, BookCardSkeleton } from '@/components/dictionary/BookCard';
import { TopicCard } from '@/components/dictionary/TopicCard';
import { Pagination } from '@/components/ui/Pagination';
import { useBooks } from '@/hooks/useBooks';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Topic } from '@/lib/types';
import { motion } from 'framer-motion';

export default function DictionaryPage() {
  const [activeTab, setActiveTab] = useState<'books' | 'topics'>('topics');
  const { books, meta, isLoading, error, page, setPage } = useBooks(15);
  const { isAuthenticated } = useAuth();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination for topics
  const [topicPage, setTopicPage] = useState(1);
  const topicsPerPage = 15;

  useEffect(() => {
    if (activeTab === 'topics' && topics.length === 0) {
      setTopicsLoading(true);
      setTopicsError(null);
      api.get<Topic[]>('/topics')
        .then(({ data }) => setTopics(data))
        .catch(() => {
          setTopicsError("Mavzularni yuklashda xatolik yuz berdi.");
        })
        .finally(() => setTopicsLoading(false));
    }
  }, [activeTab, topics.length]);

  // Reset topic page when search query or active tab changes
  useEffect(() => {
    setTopicPage(1);
  }, [searchQuery, activeTab]);

  const filteredTopics = topics
    .filter(t => t.bookId === null)
    .filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalTopics = filteredTopics.length;
  const totalTopicPages = Math.ceil(totalTopics / topicsPerPage);
  const displayedTopics = filteredTopics.slice(
    (topicPage - 1) * topicsPerPage,
    topicPage * topicsPerPage
  );

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <BookOpen size={14} />
            <span>{"Lug'at"}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary">Kutubxona & Mavzular</h1>
          <p className="text-text-muted mt-1 font-medium">
            {"Lug'atdagi so'zlarni kitoblar yoki alohida mavzular kesimida o'rganing."}
          </p>
        </div>

        <Link
          href="/dictionary/words"
          className="btn-ghost flex items-center gap-2 text-sm self-start sm:self-auto"
        >
          <Search size={14} /> {"Barcha so'zlarni qidirish"}
        </Link>
      </div>

      {/* ── Tabs & Search ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4 mb-6">
        {/* Animated Tabs */}
        <div className="flex bg-surface-2/60 p-1.5 rounded-xl border border-border/40 w-fit shrink-0 relative">
          <button
            onClick={() => { setActiveTab('topics'); setSearchQuery(''); }}
            className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'topics' ? 'text-white' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {activeTab === 'topics' && (
              <motion.span
                layoutId="activeTabGlow"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 bg-primary rounded-lg shadow-glow-sm"
              />
            )}
            <Tag size={14} className="relative z-10" />
            <span className="relative z-10">Mavzular</span>
          </button>

          <button
            onClick={() => { setActiveTab('books'); setSearchQuery(''); }}
            className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'books' ? 'text-white' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {activeTab === 'books' && (
              <motion.span
                layoutId="activeTabGlow"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 bg-primary rounded-lg shadow-glow-sm"
              />
            )}
            <Book size={14} className="relative z-10" />
            <span className="relative z-10">Kitoblar</span>
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full md:max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder={activeTab === 'books' ? "Kitoblarni qidirish..." : "Mavzularni qidirish..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-2/40 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl transition-all outline-none text-text-primary placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* ── Error Displays ───────────────────────────────────────────── */}
      {(error || topicsError) && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30
                        text-danger text-sm mb-6">
          <AlertCircle size={16} className="shrink-0" />
          {error || topicsError}
        </div>
      )}

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      {activeTab === 'books' ? (
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <EmptyState message="Kitoblar mavjud emas" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up">
              {books
                .filter(b => 
                  b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (b.description || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((book, i) => (
                  <BookCard key={book.id} book={book} index={i} isAuthenticated={isAuthenticated} />
                ))}
            </div>

            {meta && !searchQuery && (
              <Pagination
                page={page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={meta.limit}
                onChange={setPage}
              />
            )}
          </>
        )
      ) : (
        topicsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-[74px] skeleton rounded-xl" />
            ))}
          </div>
        ) : filteredTopics.length === 0 ? (
          <EmptyState message="Mavzular topilmadi" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up">
              {displayedTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  bookId={topic.bookId || ''}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>

            {totalTopicPages > 1 && (
              <Pagination
                page={topicPage}
                totalPages={totalTopicPages}
                total={totalTopics}
                limit={topicsPerPage}
                onChange={setTopicPage}
              />
            )}
          </>
        )
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="text-5xl mb-4">📚</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">{message}</h3>
      <p className="text-text-muted max-w-xs">
        {"Mavzular yoki so'zlar ro'yxati hozircha bo'sh yoki kalit so'zga mos kelmadi."}
      </p>
    </div>
  );
}
