'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Volume2, ChevronDown, ChevronUp,
  Bookmark, BookmarkCheck, Library, BookOpen,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { Word, Book, PaginatedResponse } from '@/lib/types';

const PAGE_SIZE = 40;

function SavedItemsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const type = (searchParams.get('type') as 'words' | 'books') ?? 'words';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  const [items, setItems] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedWordIds, setExpandedWordIds] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = type === 'words' ? '/users/me/saved-words' : '/users/me/saved-books';
      const { data } = await api.get<PaginatedResponse<any>>(endpoint, {
        params: { page, limit: PAGE_SIZE },
      });
      setItems(data.data);
      setTotalPages(data.meta.totalPages);
      setTotalItems(data.meta.total);
    } catch (err) {
      console.error('Failed to fetch saved items', err);
    } finally {
      setLoading(false);
    }
  }, [type, page]);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [fetchItems, user]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(newPage));
      router.push(`/profile/saved?${params.toString()}`);
    }
  };

  const toggleWordExpansion = (wordId: string) => {
    setExpandedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const handleSpeak = (e: React.MouseEvent, japaneseWord: string) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(japaneseWord);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push('...');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (page < totalPages - 2) {
        pages.push('...');
      }
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (authLoading) {
    return (
      <div className="page-container py-10">
        <div className="space-y-4">
          <div className="h-6 w-32 skeleton rounded" />
          <div className="h-10 w-64 skeleton rounded" />
          <div className="h-96 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container py-24 text-center">
        <p className="text-text-muted">{"Iltimos, profilingizni ko'rish uchun tizimga kiring."}</p>
        <Link href="/auth/login" className="btn-primary mt-4 inline-block">
          Kirish
        </Link>
      </div>
    );
  }

  const title = type === 'words' ? "Saqlangan so'zlar" : "Saqlangan kitoblar";
  const colorTheme = type === 'words' ? 'primary' : 'accent';

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Back to Profile Link */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm font-semibold mb-6"
      >
        <ChevronLeft size={16} />
        <span>Profilga qaytish</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">{title}</h1>
          <p className="text-text-secondary text-sm mt-1">
            Jami: <span className={cn("font-bold", type === 'words' ? "text-primary-hover" : "text-accent-hover")}>{totalItems} ta</span>
          </p>
        </div>

        {/* Tab switch inside page */}
        <div className="flex gap-2">
          <Link
            href="/profile/saved?type=words&page=1"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              type === 'words'
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-surface-2 text-text-muted border-border hover:border-primary/30 hover:text-text-secondary"
            )}
          >
            <Bookmark size={12} />
            So'zlar
          </Link>
          <Link
            href="/profile/saved?type=books&page=1"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              type === 'books'
                ? "bg-accent/15 text-accent border-accent/30"
                : "bg-surface-2 text-text-muted border-border hover:border-accent/30 hover:text-text-secondary"
            )}
          >
            <Library size={12} />
            Kitoblar
          </Link>
        </div>
      </div>

      {/* Main Content Card */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card-glass p-12 text-center flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl",
            type === 'words' ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
          )}>
            {type === 'words' ? "📝" : "📚"}
          </div>
          <p className="text-text-secondary max-w-sm">
            {type === 'words'
              ? "Hozircha saqlangan so'zlar yo'q. Lug'atni ko'rib chiqing va so'zlarni saqlash uchun xatcho'p belgisini bosing!"
              : "Hozircha saqlangan kitoblar yo'q. Lug'atga o'ting va sevimli kitoblaringizni xatcho'plarga qo'shing!"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card-glass p-5 divide-y divide-border/50">
            {type === 'words' ? (
              items.map((w: Word) => {
                const isExpanded = expandedWordIds.has(w.id);
                const canExpand = !!(w.exampleSentence || w.exampleTranslation);
                return (
                  <div
                    key={w.id}
                    onClick={() => canExpand && toggleWordExpansion(w.id)}
                    className={cn(
                      "py-3 flex flex-col gap-2 transition-colors cursor-pointer select-none",
                      canExpand && "hover:bg-surface-2/30 px-2 -mx-2 rounded-lg"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* TTS Button */}
                        <button
                          onClick={(e) => handleSpeak(e, w.japaneseWord)}
                          className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20
                                     flex items-center justify-center shrink-0 text-primary transition-colors"
                          title="Talaffuzni eshitish"
                        >
                          <Volume2 size={15} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-text-primary">{w.japaneseWord}</span>
                            {w.hiragana && w.hiragana !== w.japaneseWord && (
                              <span className="text-sm text-primary/80">({w.hiragana})</span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary truncate">{w.meaning}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <BookmarkCheck size={14} className="text-accent fill-accent" />
                        {canExpand && (
                          <span className="text-text-muted">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Collapsible example sentence */}
                    {isExpanded && canExpand && (
                      <div className="ml-11 p-3 bg-surface-2/50 border-l-2 border-primary rounded-r-lg animate-slide-in">
                        {w.exampleSentence && (
                          <p className="text-sm font-medium text-text-primary leading-relaxed">
                            {w.exampleSentence}
                          </p>
                        )}
                        {w.exampleTranslation && (
                          <p className="text-xs text-text-secondary mt-1 font-medium italic">
                            {w.exampleTranslation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              items.map((b: Book & { savedAt: string }) => (
                <a
                  key={b.id}
                  href={`/dictionary/${b.id}`}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-surface-2/50
                             rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20
                                    flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">{b.title}</p>
                      {b.description && (
                        <p className="text-xs text-text-muted truncate">{b.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted shrink-0">
                    <span>{b._count?.topics ?? 0} {"ta mavzu"}</span>
                    <BookmarkCheck size={14} className="text-accent fill-accent" />
                  </div>
                </a>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              {/* Prev Button */}
              <button
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center
                           text-text-primary hover:border-primary/50 transition-colors disabled:opacity-40 disabled:hover:border-border"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Numbers */}
              {getPageNumbers().map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`dots-${idx}`} className="w-10 h-10 flex items-center justify-center text-text-muted select-none">
                      ...
                    </span>
                  );
                }
                const isSelected = p === page;
                return (
                  <button
                    key={`page-${p}`}
                    onClick={() => handlePageChange(p as number)}
                    className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-semibold transition-all duration-200",
                      isSelected
                        ? colorTheme === 'primary'
                          ? "bg-primary border-primary text-white shadow-glow-sm"
                          : "bg-accent border-accent text-white shadow-glow-accent"
                        : "bg-surface-2 border-border text-text-secondary hover:border-primary/50 hover:text-text-primary"
                    )}
                  >
                    {p}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center
                           text-text-primary hover:border-primary/50 transition-colors disabled:opacity-40 disabled:hover:border-border"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SavedItemsPage() {
  return (
    <Suspense fallback={
      <div className="page-container py-10 space-y-4">
        <div className="h-6 w-32 skeleton rounded" />
        <div className="h-10 w-64 skeleton rounded" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <SavedItemsInner />
    </Suspense>
  );
}
