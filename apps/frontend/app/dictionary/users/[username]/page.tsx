'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookmarkCheck,
  BookOpen,
  Check,
  Flame,
  Loader2,
  Tag,
  Users,
} from 'lucide-react';
import api from '@/lib/api';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { cn, leagueIcon } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { Book, CommunityProfile, Topic } from '@/lib/types';

export default function CommunityProfilePage() {
  const params = useParams();
  const username = String(params.username ?? '');
  const { isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<CommunityProfile>(
        `/community/users/${encodeURIComponent(username)}`,
      );
      setProfile(data);
    } catch {
      setError('Foydalanuvchi topilmadi.');
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-container py-24 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-text-primary mb-2">{error}</h1>
        <Link href="/dictionary" className="btn-ghost inline-block mt-4">{"Lug'atga qaytish"}</Link>
      </div>
    );
  }

  const { user, books, topics } = profile;

  return (
    <div className="page-container py-10 animate-fade-in">
      <Link
        href="/dictionary"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} /> {"Foydalanuvchilar"}
      </Link>

      {/* ── Profile header ──────────────────────────────────────────── */}
      <div className="card-glass p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40
                        flex items-center justify-center font-extrabold text-primary text-2xl uppercase shrink-0">
          {user.username[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-2xl font-extrabold text-text-primary truncate">{user.username}</h1>
            {user.isPremium && <PremiumBadge size="sm" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Flame size={13} className={user.streak > 0 ? 'text-orange-400' : ''} />
              {user.streak} kunlik seriya
            </span>
            <span>{leagueIcon(user.league as never)} {user.xp.toLocaleString()} XP</span>
            <span>
              {new Date(user.createdAt).toLocaleDateString('uz-UZ', {
                year: 'numeric',
                month: 'long',
              })}
              {"dan beri"}
            </span>
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <MiniStat value={user.publicTopics} label="Mavzu" />
          <MiniStat value={user.publicBooks} label="Kitob" />
          <MiniStat value={user.totalWords} label="So'z" />
        </div>
      </div>

      {!isAuthenticated && (topics.length > 0 || books.length > 0) && (
        <p className="text-sm text-text-muted mt-5 text-center">
          {"Saqlash uchun "}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">tizimga kiring</Link>
          {"."}
        </p>
      )}

      {/* ── Shared topics ───────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 mb-5">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Tag size={17} className="text-primary" />
            Ochiq mavzular
          </h2>
          <span className="text-sm text-text-muted">{topics.length} ta</span>
        </div>

        {topics.length === 0 ? (
          <div className="card-glass p-8 text-center text-text-muted text-sm">
            {"Bu foydalanuvchi hali mavzu ulashmagan."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <SharedTopicCard
                key={topic.id}
                topic={topic}
                isAuthenticated={isAuthenticated}
                onSaved={load}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Shared books ────────────────────────────────────────────── */}
      {books.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 mb-5">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <BookOpen size={17} className="text-accent" />
              Ochiq kitoblar
            </h2>
            <span className="text-sm text-text-muted">{books.length} ta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <SharedBookCard
                key={book.id}
                book={book}
                isAuthenticated={isAuthenticated}
                onSaved={load}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-extrabold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted font-medium">{label}</p>
    </div>
  );
}

function SharedTopicCard({
  topic,
  isAuthenticated,
  onSaved,
}: {
  topic: Topic;
  isAuthenticated: boolean;
  onSaved: () => void;
}) {
  const [saved, setSaved] = useState(!!topic.isSaved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = async () => {
    if (busy || !isAuthenticated) return;
    setBusy(true);
    try {
      // Saving a topic copies its words into the viewer's saved list, which is
      // what the games draw from — so a saved topic is immediately playable.
      const { data } = await api.post<{ saved: boolean; message?: string }>(
        `/topics/${topic.id}/save`,
      );
      setSaved(data.saved);
      setMessage(data.saved ? "Saqlandi — o'yinlarda ishlatishingiz mumkin" : "O'chirildi");
      setTimeout(() => setMessage(null), 2500);
      onSaved();
    } catch {
      setMessage('Xatolik yuz berdi');
      setTimeout(() => setMessage(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-glass p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text-primary truncate">{topic.name}</p>
          {topic.book && (
            <p className="text-xs text-text-muted mt-1 truncate">📕 {topic.book.title}</p>
          )}
          <p className="text-xs text-text-muted mt-2">{topic._count.wordTopics} ta so&rsquo;z</p>
        </div>
      </div>

      {isAuthenticated && (
        <button
          onClick={toggle}
          disabled={busy}
          className={cn(
            'w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
            saved
              ? 'bg-success/15 text-success border border-success/30 hover:bg-danger/10 hover:text-danger hover:border-danger/30'
              : 'bg-primary text-white hover:bg-primary-hover',
            busy && 'opacity-60 cursor-wait',
          )}
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <><BookmarkCheck size={14} /> Saqlangan</>
          ) : (
            <><Check size={14} /> Saqlash</>
          )}
        </button>
      )}

      {message && (
        <p className="text-xs text-text-muted mt-2 text-center animate-fade-in">{message}</p>
      )}
    </div>
  );
}

function SharedBookCard({
  book,
  isAuthenticated,
  onSaved,
}: {
  book: Book;
  isAuthenticated: boolean;
  onSaved: () => void;
}) {
  const [saved, setSaved] = useState(!!book.isSaved);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy || !isAuthenticated) return;
    setBusy(true);
    try {
      const { data } = await api.post<{ saved: boolean }>(`/books/${book.id}/save`);
      setSaved(data.saved);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-glass p-4">
      <p className="font-bold text-text-primary truncate">{book.title}</p>
      {book.description && (
        <p className="text-sm text-text-muted mt-1 line-clamp-2">{book.description}</p>
      )}
      <p className="text-xs text-text-muted mt-2">{book._count.topics} ta mavzu</p>

      {isAuthenticated && (
        <button
          onClick={toggle}
          disabled={busy}
          className={cn(
            'w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
            saved
              ? 'bg-success/15 text-success border border-success/30 hover:bg-danger/10 hover:text-danger hover:border-danger/30'
              : 'bg-surface-2 text-text-secondary border border-border hover:border-primary/40 hover:text-text-primary',
            busy && 'opacity-60 cursor-wait',
          )}
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <><BookmarkCheck size={14} /> Saqlangan</>
          ) : (
            <>Saqlash</>
          )}
        </button>
      )}
    </div>
  );
}
