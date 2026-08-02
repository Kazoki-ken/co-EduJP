'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Book,
  BookOpen,
  ChevronDown,
  CornerDownLeft,
  Layers,
  Search,
  Tag,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { BookCard, BookCardSkeleton } from '@/components/dictionary/BookCard';
import { TopicCard } from '@/components/dictionary/TopicCard';
import { WordResultRow, WordResultRowSkeleton } from '@/components/dictionary/WordResultRow';
import { Pagination } from '@/components/ui/Pagination';
import { useBooks } from '@/hooks/useBooks';
import { useWords } from '@/hooks/useWords';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Topic } from '@/lib/types';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Tab = 'words' | 'topics' | 'books' | 'users';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'words', label: "So'zlar", icon: Search },
  { id: 'topics', label: 'Mavzular', icon: Tag },
  { id: 'books', label: 'Kitoblar', icon: Book },
  { id: 'users', label: 'Foydalanuvchi', icon: User },
];

const PLACEHOLDER: Record<Tab, string> = {
  words: "So'z, hiragana yoki ma'nosini yozing...",
  topics: "Mavzu nomi yoki so'z qidiring...",
  books: "Kitob nomi yoki so'z qidiring...",
  users: "Foydalanuvchi qidiruvi (tez orada)...",
};

export default function DictionaryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('words');
  const { books, meta, isLoading, error, page, setPage } = useBooks(15);
  const { isAuthenticated } = useAuth();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  /** One shared search box drives all four tabs — see PLACEHOLDER above. */
  const [searchQuery, setSearchQuery] = useState('');

  /** Total word count, shown as a hint under the search box. */
  const [wordCount, setWordCount] = useState<number | null>(null);

  /** Set when the user asks to see the full topics/books list without searching. */
  const [browseAll, setBrowseAll] = useState(false);

  /**
   * Word search only runs on explicit submit (Enter / the arrow button), not on
   * every keystroke — hitting the real /api/words endpoint on each keypress
   * would be wasteful and laggy. `wordsQuery` is the committed term; typing
   * into the box updates `searchQuery` but not this, until submitted.
   */
  const [wordsQuery, setWordsQuery] = useState('');
  const [wordsPage, setWordsPage] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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

  // One cheap request just for the "N ta so'z" hint in the hero.
  useEffect(() => {
    api.get<{ meta: { total: number } }>('/words', { params: { limit: 1 } })
      .then(({ data }) => setWordCount(data.meta.total))
      .catch(() => {});
  }, []);

  // Reset topic page when search query or active tab changes
  useEffect(() => {
    setTopicPage(1);
  }, [searchQuery, activeTab]);

  const query = searchQuery.trim();
  const isSearching = query.length > 0;

  /**
   * The hero owns the whole first screen until there is actually something to
   * show — merely selecting a tab is not enough. "So'zlar" only shrinks it
   * once a search has been submitted (wordsQuery set); "Foydalanuvchi" has no
   * real behaviour yet, so it never shrinks it at all; Mavzular/Kitoblar
   * shrink it once you search or ask to browse everything.
   */
  const showResults =
    (activeTab === 'words' && wordsQuery !== '') ||
    ((activeTab === 'topics' || activeTab === 'books') && (isSearching || browseAll));

  const filteredTopics = useMemo(
    () =>
      topics
        .filter((t) => t.bookId === null)
        .filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [topics, query],
  );

  const filteredBooks = useMemo(
    () =>
      books.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          (b.description || '').toLowerCase().includes(query.toLowerCase()),
      ),
    [books, query],
  );

  const totalTopics = filteredTopics.length;
  const totalTopicPages = Math.ceil(totalTopics / topicsPerPage);
  const displayedTopics = filteredTopics.slice(
    (topicPage - 1) * topicsPerPage,
    topicPage * topicsPerPage,
  );

  const topicCount = topics.filter((t) => t.bookId === null).length;
  const resultCount = activeTab === 'topics' ? totalTopics : filteredBooks.length;

  // ── Word search — only fetches once a term has actually been submitted ──
  const {
    words: wordResults,
    meta: wordsMeta,
    isLoading: wordsLoading,
    error: wordsError,
    toggleSave: toggleSaveWord,
  } = useWords(
    { search: wordsQuery, page: wordsPage, limit: 20 },
    { enabled: activeTab === 'words' && wordsQuery !== '' },
  );

  /**
   * Runs the word search itself, in place on this page, against the same
   * /api/words endpoint the dedicated /dictionary/words page uses — used by
   * Enter, the arrow button and the inline quick action. Does nothing on an
   * empty box (the arrow button is only shown while there is a query anyway).
   */
  const submitWordSearch = () => {
    if (!query) return;
    setActiveTab('words');
    setWordsQuery(query);
    setWordsPage(1);
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const revealAll = () => {
    setBrowseAll(true);
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const clearAll = () => {
    setSearchQuery('');
    setBrowseAll(false);
    setWordsQuery('');
    setWordsPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * The search box is shared across all four tabs on purpose (one search,
   * many views), so switching tabs does not clear what's typed — only what
   * each tab *does* with it differs (live filter vs. explicit word search).
   */
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    inputRef.current?.focus();
  };

  return (
    <div className="page-container pb-16 animate-fade-in">
      {/* ── Hero: fills the first screen until there is something to show ── */}
      {/*
        Deliberately plain CSS rather than framer-motion `layout`: the layout
        animation measures the element before and after and compensates with a
        transform, which fought the font-size change and left the heading stuck
        at scale(1, 0.86).
      */}
      {/*
        min-height is an inline style, not a conditional utility class: swapping
        `min-h-[68vh]` for `min-h-0` depends on which rule Tailwind emits last,
        which is not guaranteed and left the hero stuck at full height.

        It is also deliberately not transitioned — animating min-height between
        a `vh` value and zero stalls at the start value, so the hero never
        actually shrank. The results block fades in instead, which reads better
        anyway.
      */}
      <section
        style={{ minHeight: showResults ? undefined : '68vh' }}
        className="flex flex-col items-center justify-center text-center pt-10 pb-8"
      >
        {/* Eyebrow */}
        <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-3">
          <BookOpen size={15} />
          <span>{"Lug'at"}</span>
        </div>

        {/* Heading + description */}
        <h1
          className={cn(
            'font-extrabold text-text-primary tracking-tight',
            showResults ? 'text-3xl' : 'text-4xl sm:text-5xl',
          )}
        >
          Kutubxona &amp; Mavzular
        </h1>
        <p className="text-text-secondary mt-3 max-w-xl font-medium">
          {"Lug'atdagi so'zlarni kitoblar yoki alohida mavzular kesimida o'rganing."}
        </p>

        {/* ── Tab row: one pill, four equal segments ───────────────────
            So'zlar and Foydalanuvchi share the exact same button markup as
            Mavzular/Kitoblar (including the shared layoutId glow), so all
            four look and behave identically — no separate outline styling. */}
        <div className="flex flex-wrap items-center justify-center gap-1 bg-surface-2/60 p-1.5 rounded-xl border border-border/40 w-fit relative mt-8">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={cn(
                'relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors duration-200',
                activeTab === id ? 'text-white' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {activeTab === id && (
                <motion.span
                  layoutId="activeTabGlow"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-primary rounded-lg shadow-glow-sm"
                />
              )}
              <Icon size={14} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>

        {/* ── The single search box ──────────────────────────────────── */}
        <div className="w-full max-w-2xl mt-6">
          <div
            className={cn(
              'group flex items-center gap-3 w-full rounded-2xl border transition-all duration-200',
              'bg-surface/80 backdrop-blur-md px-5 py-4',
              'border-border/70 hover:border-primary/40',
              'focus-within:border-primary focus-within:shadow-glow-sm',
            )}
          >
            <Search size={20} className="shrink-0 text-text-muted group-focus-within:text-primary transition-colors" />

            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              placeholder={PLACEHOLDER[activeTab]}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitWordSearch()}
              className="flex-1 min-w-0 bg-transparent text-base text-text-primary
                         placeholder:text-text-muted outline-none text-left"
            />

            {isSearching ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Tozalash"
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={submitWordSearch}
                  aria-label="So'zlar ichidan qidirish"
                  className="p-2 rounded-lg bg-primary text-white hover:bg-primary-hover
                             transition-colors active:scale-95"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <kbd className="hidden sm:flex items-center gap-1 shrink-0 text-[11px] font-medium
                              text-text-muted border border-border/60 rounded-md px-1.5 py-1">
                <CornerDownLeft size={11} /> Enter
              </kbd>
            )}
          </div>

          {/* ── Quick actions (ChatGPT-style rows) ───────────────────── */}
          <div className="mt-5 flex flex-col items-stretch gap-1">
            {isSearching && activeTab !== 'words' && (
              <button
                onClick={submitWordSearch}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left
                           text-text-secondary hover:text-text-primary hover:bg-surface-2/60
                           transition-colors"
              >
                <Search size={17} className="shrink-0 text-primary" />
                <span className="truncate">
                  <span className="font-semibold text-text-primary">{`“${query}”`}</span>
                  {" — so'zlar ichidan qidirish"}
                </span>
              </button>
            )}

            <Link
              href="/dictionary/words"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-left
                         text-text-secondary hover:text-text-primary hover:bg-surface-2/60
                         transition-colors"
            >
              <Layers size={17} className="shrink-0 text-accent" />
              <span>
                {"Kengaytirilgan qidiruv (filtrlar bilan)"}
                {wordCount !== null && (
                  <span className="text-text-muted"> · {wordCount.toLocaleString()} ta so'z</span>
                )}
              </span>
            </Link>

            {(activeTab === 'topics' || activeTab === 'books') && !showResults && (
              <button
                onClick={revealAll}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left
                           text-text-secondary hover:text-text-primary hover:bg-surface-2/60
                           transition-colors"
              >
                <ChevronDown size={17} className="shrink-0 text-text-muted" />
                <span>
                  {activeTab === 'topics' ? "Barcha mavzular" : "Barcha kitoblar"}
                  <span className="text-text-muted">
                    {' · '}
                    {activeTab === 'topics'
                      ? `${topicCount || '—'} ta`
                      : `${meta?.total ?? '—'} ta`}
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Error Displays ───────────────────────────────────────────── */}
      {(error || topicsError || wordsError) && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30
                        text-danger text-sm mb-6">
          <AlertCircle size={16} className="shrink-0" />
          {error || topicsError || wordsError}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {/*
        A plain conditional render with a CSS fade, not AnimatePresence: the
        exit animation did not always complete, leaving an invisible results
        block mounted and padding the page with dead scroll space.
      */}
      <div ref={resultsRef} className="scroll-mt-24">
        {showResults && (
          <div key={activeTab} className="animate-fade-in">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 mb-6">
              <p className="text-sm text-text-muted font-medium">
                {activeTab === 'words' ? (
                  <>
                    <span className="text-text-primary font-semibold">
                      {wordsMeta?.total ?? 0}
                    </span>
                    {" ta so'z topildi"}
                  </>
                ) : isSearching ? (
                  <>
                    <span className="text-text-primary font-semibold">{resultCount}</span>
                    {activeTab === 'topics' ? ' ta mavzu' : ' ta kitob'} topildi
                  </>
                ) : (
                  <>
                    {activeTab === 'topics' ? 'Barcha mavzular' : 'Barcha kitoblar'}
                    <span className="text-text-primary font-semibold"> · {resultCount}</span>
                  </>
                )}
              </p>

              <button
                onClick={clearAll}
                className="text-sm text-text-muted hover:text-primary transition-colors font-medium shrink-0"
              >
                Tozalash
              </button>
            </div>

            {/* This branch only renders once wordsQuery is set (see showResults
                above), so there is no separate "type to search" prompt case
                here — the big hero with its placeholder already covers that. */}
            {activeTab === 'words' ? (
              wordsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <WordResultRowSkeleton key={i} />
                  ))}
                </div>
              ) : wordResults.length === 0 ? (
                <EmptyState
                  icon="🔍"
                  message="So'zlar topilmadi"
                  description="Boshqa kalit so'z bilan qayta urinib ko'ring."
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wordResults.map((word) => (
                      <WordResultRow
                        key={word.id}
                        word={word}
                        isAuthenticated={isAuthenticated}
                        onToggleSave={toggleSaveWord}
                      />
                    ))}
                  </div>

                  {wordsMeta && wordsMeta.totalPages > 1 && (
                    <Pagination
                      page={wordsPage}
                      totalPages={wordsMeta.totalPages}
                      total={wordsMeta.total}
                      limit={wordsMeta.limit}
                      onChange={(p) => {
                        setWordsPage(p);
                        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    />
                  )}
                </>
              )
              // 'users' never reaches this renderer — showResults is always
              // false for that tab until its real behaviour is defined.
            ) : activeTab === 'books' ? (
              isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <BookCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredBooks.length === 0 ? (
                <EmptyState message="Kitoblar topilmadi" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredBooks.map((book, i) => (
                      <BookCard key={book.id} book={book} index={i} isAuthenticated={isAuthenticated} />
                    ))}
                  </div>

                  {meta && !isSearching && (
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
            ) : topicsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-[74px] skeleton rounded-xl" />
                ))}
              </div>
            ) : filteredTopics.length === 0 ? (
              <EmptyState message="Mavzular topilmadi" />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon = '📚',
  message,
  description,
}: {
  icon?: string;
  message: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">{message}</h3>
      <p className="text-text-muted max-w-xs">
        {description ?? "Mavzular yoki so'zlar ro'yxati hozircha bo'sh yoki kalit so'zga mos kelmadi."}
      </p>
    </div>
  );
}
