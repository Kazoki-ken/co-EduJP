'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Flame, Zap, BookOpen, Trophy, TrendingUp,
  Bookmark, BookmarkCheck, Library, Volume2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { cn, leagueColor, leagueIcon } from '@/lib/utils';
import type { EarnedBadge, Word, Book, PaginatedResponse } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBadgeEntry {
  earnedAt: string;
  badge: EarnedBadge;
}

interface ProgressData {
  totalSaved: number;
  dueTodayCount: number;
  levelBreakdown: { level: number; count: number }[];
}

type SavedTab = 'words' | 'books';

const SRS_LEVELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Boshlovchi',  color: 'text-red-400',    bg: 'bg-red-500'     },
  2: { label: 'Tanish',      color: 'text-orange-400', bg: 'bg-orange-500'  },
  3: { label: 'Mashq qilingan', color: 'text-yellow-400', bg: 'bg-yellow-500'  },
  4: { label: 'Ilg\'or',      color: 'text-emerald-400',bg: 'bg-emerald-500' },
  5: { label: 'O\'zlashtirilgan', color: 'text-violet-400', bg: 'bg-violet-500'  },
};

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [badges,   setBadges]   = useState<UserBadgeEntry[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading,  setLoading]  = useState(true);

  // Saved content
  const [savedTab, setSavedTab] = useState<SavedTab>('words');
  const [savedWords, setSavedWords] = useState<Word[]>([]);
  const [savedWordsTotal, setSavedWordsTotal] = useState(0);
  const [savedBooks, setSavedBooks] = useState<(Book & { savedAt: string })[]>([]);
  const [savedBooksTotal, setSavedBooksTotal] = useState(0);
  const [savedWordsLoading, setSavedWordsLoading] = useState(false);
  const [savedBooksLoading, setSavedBooksLoading] = useState(false);
  const [expandedWordIds, setExpandedWordIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<UserBadgeEntry[]>('/users/me/badges'),
      api.get<ProgressData>('/users/me/progress'),
    ]).then(([b, p]) => {
      setBadges(b.data);
      setProgress(p.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  // Fetch saved words
  const fetchSavedWords = useCallback(async () => {
    setSavedWordsLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<Word>>('/users/me/saved-words', {
        params: { limit: 10 },
      });
      setSavedWords(data.data);
      setSavedWordsTotal(data.meta.total);
    } catch {}
    setSavedWordsLoading(false);
  }, []);

  // Fetch saved books
  const fetchSavedBooks = useCallback(async () => {
    setSavedBooksLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<Book & { savedAt: string }>>('/users/me/saved-books', {
        params: { limit: 10 },
      });
      setSavedBooks(data.data);
      setSavedBooksTotal(data.meta.total);
    } catch {}
    setSavedBooksLoading(false);
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (!user) return;
    if (savedTab === 'words' && savedWords.length === 0) fetchSavedWords();
    if (savedTab === 'books' && savedBooks.length === 0) fetchSavedBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTab, user]);

  if (authLoading || loading) {
    return (
      <div className="page-container py-10">
        <div className="space-y-4">
          <div className="h-10 w-48 skeleton rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
          </div>
          <div className="h-48 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container py-24 text-center">
        <p className="text-text-muted">{"Iltimos, profilingizni ko'rish uchun tizimga kiring."}</p>
      </div>
    );
  }

  const totalWords = progress?.levelBreakdown.reduce((s, l) => s + l.count, 0) ?? 0;
  const masteredCount = progress?.levelBreakdown.find((l) => l.level === 5)?.count ?? 0;

  return (
    <div className="page-container py-10 animate-fade-in space-y-8">
      {/* ── Profile Header ─────────────────────────────────────────── */}
      <div
        className="card-glass p-7 flex flex-col sm:flex-row items-center sm:items-start gap-6 animate-fade-in"
      >
        {/* Avatar */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 border-2 border-primary/50
                          flex items-center justify-center text-3xl font-black text-primary
                          shadow-glow animate-pulse-glow">
            {user.username[0]?.toUpperCase()}
          </div>
          <span className="absolute -bottom-2 -right-2 text-2xl">
            {leagueIcon(user.profile?.league ?? 'BRONZE')}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold text-text-primary">{user.username}</h1>
          <p className="text-text-muted text-sm">{user.email}</p>
          <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
            <span className={cn('badge-chip border', leagueColor(user.profile?.league ?? 'BRONZE'))}>
              {leagueIcon(user.profile?.league ?? 'BRONZE')}{' '}
              {{
                BRONZE: 'Bronza ligasi',
                SILVER: 'Kumush ligasi',
                GOLD: 'Oltin ligasi',
                PLATINUM: 'Platina ligasi',
                DIAMOND: 'Olmos ligasi',
              }[user.profile?.league ?? 'BRONZE'] ?? (user.profile?.league ?? 'BRONZE')}
            </span>
            <span className="badge-chip bg-surface-2 text-text-muted border border-border">
              {new Date(user.createdAt).getFullYear()}{" yildan beri a'zo"}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {[
            { icon: <Flame size={16} className="text-orange-400" />, val: user.profile?.streak ?? 0,   label: 'Kunlik zanjir'  },
            { icon: <Zap   size={16} className="text-primary"     />, val: user.profile?.xp ?? 0,      label: 'Umumiy XP'    },
            { icon: <span className="text-base">🪙</span>,             val: user.profile?.coins ?? 0,   label: 'Tangalar'       },
            { icon: <Trophy size={16} className="text-accent"     />, val: badges.length,               label: 'Nishonlar'      },
          ].map(({ icon, val, label }) => (
            <div key={label} className="bg-surface-2 border border-border rounded-xl p-3 text-center">
              <div className="flex justify-center mb-1">{icon}</div>
              <p className="font-extrabold text-lg text-text-primary">{val.toLocaleString()}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Saved Words / Saved Books Tabs ──────────────────────────── */}
      <section>
        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={() => setSavedTab('words')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              savedTab === 'words'
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-surface-2 text-text-muted border border-border hover:border-primary/30 hover:text-text-secondary',
            )}
          >
            <Bookmark size={15} />
            {"Saqlangan so'zlar"}
            {savedWordsTotal > 0 && (
              <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-bold">
                {savedWordsTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => setSavedTab('books')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              savedTab === 'books'
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-surface-2 text-text-muted border border-border hover:border-accent/30 hover:text-text-secondary',
            )}
          >
            <Library size={15} />
            {"Saqlangan kitoblar"}
            {savedBooksTotal > 0 && (
              <span className="bg-accent/20 text-accent text-xs px-2 py-0.5 rounded-full font-bold">
                {savedBooksTotal}
              </span>
            )}
          </button>
        </div>

        {/* Saved Words */}
        {savedTab === 'words' && (
          <div className="card-glass p-5 space-y-3">
            {savedWordsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-6 w-20 skeleton rounded" />
                    <div className="h-4 w-32 skeleton rounded" />
                  </div>
                ))}
              </div>
            ) : savedWords.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-3">📝</p>
                <p className="text-text-muted">
                  {"Hozircha saqlangan so'zlar yo'q. Lug'atni ko'rib chiqing va so'zlarni saqlash uchun xatcho'p belgisini bosing!"}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/50 max-h-[340px] overflow-y-auto
                                scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1">
                  {savedWords.map((w) => {
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
                  })}
                </div>
                {savedWordsTotal > 10 && (
                  <p className="text-xs text-text-muted text-center mt-2">
                    {"Barcha "}{savedWordsTotal}{" ta saqlangan so'zni ko'rish uchun quyidagi tugmani bosing"}
                  </p>
                )}
                <div className="mt-4 pt-2 border-t border-border/50">
                  <Link
                    href="/profile/saved?type=words"
                    className="flex items-center justify-center w-full py-3 bg-primary/10 border border-primary/25 hover:bg-primary/15
                               text-primary-hover font-bold text-sm rounded-xl transition-all active:scale-95 text-center"
                  >
                    Barcha saqlangan so'zlar
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* Saved Books */}
        {savedTab === 'books' && (
          <div className="card-glass p-5">
            {savedBooksLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 skeleton rounded-xl" />
                ))}
              </div>
            ) : savedBooks.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-3">📚</p>
                <p className="text-text-muted">
                  {"Hozircha saqlangan kitoblar yo'q. Lug'atga o'ting va sevimli kitoblaringizni xatcho'plarga qo'shing!"}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/50 max-h-[340px] overflow-y-auto
                                scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1">
                  {savedBooks.map((b) => (
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
                        <span>{b._count.topics} {"ta mavzu"}</span>
                        <BookmarkCheck size={14} className="text-accent fill-accent" />
                      </div>
                    </a>
                  ))}
                </div>
                {savedBooksTotal > 10 && (
                  <p className="text-xs text-text-muted text-center mt-2">
                    {"Barcha "}{savedBooksTotal}{" ta saqlangan kitobni ko'rish uchun quyidagi tugmani bosing"}
                  </p>
                )}
                <div className="mt-4 pt-2 border-t border-border/50">
                  <Link
                    href="/profile/saved?type=books"
                    className="flex items-center justify-center w-full py-3 bg-accent/10 border border-accent/25 hover:bg-accent/15
                               text-accent-hover font-bold text-sm rounded-xl transition-all active:scale-95 text-center"
                  >
                    Barcha saqlangan kitoblar
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── SRS Progress ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" /> {"SRS taraqqiyoti"}
        </h2>
        <div className="card-glass p-6 space-y-4">
          {/* Overview */}
          <div className="flex flex-wrap gap-4 text-sm mb-2">
            <span className="text-text-muted">
              {"Jami kuzatilmoqda: "} <span className="text-text-primary font-semibold">{totalWords}</span>
            </span>
            <span className="text-text-muted">
              {"O'zlashtirilgan: "} <span className="text-violet-400 font-semibold">{masteredCount}</span>
            </span>
            <span className="text-text-muted">
              {"Bugun takrorlanadi: "} <span className="text-accent font-semibold">{progress?.dueTodayCount ?? 0}</span>
            </span>
          </div>

          {/* Level bars */}
          {totalWords > 0 && [1, 2, 3, 4, 5].map((lvl) => {
            const entry = progress?.levelBreakdown.find((l) => l.level === lvl);
            const count = entry?.count ?? 0;
            const pct   = totalWords > 0 ? (count / totalWords) * 100 : 0;
            const meta  = SRS_LEVELS[lvl]!;

            return (
              <div key={lvl} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={cn('font-medium', meta.color)}>
                    Lv {lvl} — {meta.label}
                  </span>
                  <span className="text-text-muted">{count} {"ta so'z"}</span>
                </div>
                <div className="h-2.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%`, transition: `width 0.8s ease-out ${lvl * 0.08}s` }}
                    className={cn('h-full rounded-full', meta.bg)}
                  />
                </div>
              </div>
            );
          })}

          {totalWords === 0 && (
            <p className="text-center text-text-muted py-6">
              {"Hozircha taraqqiyot yo'q. SRS darajalarini kuzatishni boshlash uchun o'yin o'ynang!"}
            </p>
          )}
        </div>
      </section>

      {/* ── Badge Showcase ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-accent" /> {"Nishonlar ko'rgazmasi"}
          <span className="text-sm font-normal text-text-muted ml-1">({badges.length} {"ta qo'lga kiritilgan"})</span>
        </h2>

        {badges.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <p className="text-4xl mb-3">🏅</p>
            <p className="text-text-muted">{"Hozircha nishonlar yo'q. Ularni ochish uchun o'yin o'ynashda davom eting!"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map(({ badge, earnedAt }, i) => (
              <div
                key={badge.id}
                className="card-glass p-5 flex flex-col items-center text-center gap-3
                           hover:border-accent/50 hover:shadow-glow-accent transition-all animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="text-4xl">{badge.icon ?? '🏅'}</span>
                <div>
                  <p className="font-bold text-sm text-text-primary">{badge.name}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{badge.description}</p>
                </div>
                <p className="text-xs text-text-muted/60 border-t border-border/50 pt-2 w-full">
                  {new Date(earnedAt).toLocaleDateString('uz-UZ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
