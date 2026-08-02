'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookPlus,
  Check,
  Eye,
  EyeOff,
  FolderPlus,
  Library,
  Loader2,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { LibraryBook, LibrarySummary, LibraryTopic } from '@/lib/types';

export default function LibraryPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [summary, setSummary] = useState<LibrarySummary | null>(null);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [topics, setTopics] = useState<LibraryTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showBookForm, setShowBookForm] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [s, b, t] = await Promise.all([
        api.get<LibrarySummary>('/library/summary'),
        api.get<{ data: LibraryBook[] }>('/library/books'),
        api.get<{ data: LibraryTopic[] }>('/library/topics'),
      ]);
      setSummary(s.data);
      setBooks(b.data.data);
      setTopics(t.data.data);
    } catch {
      setError("Lug'atingizni yuklashda xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
    else if (!authLoading) setIsLoading(false);
  }, [isAuthenticated, authLoading, load]);

  if (authLoading || isLoading) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-container py-24 text-center">
        <div className="text-5xl mb-4">📖</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">{"Mening lug'atim"}</h1>
        <p className="text-text-muted mb-6">
          {"O'z mavzu va kitoblaringizni yaratish uchun tizimga kiring."}
        </p>
        <Link href="/auth/login" className="btn-primary inline-block">Kirish</Link>
      </div>
    );
  }

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-3">
        <Library size={15} />
        <span>{"Mening lug'atim"}</span>
      </div>
      <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
        {"O'z lug'atingiz"}
      </h1>
      <p className="text-text-secondary mt-2 max-w-2xl font-medium">
        {"O'zingiz uchun mavzu va kitob yarating, so'zlarni qo'shing. Ochiq qilsangiz, boshqa foydalanuvchilar ham topib, saqlab olishlari mumkin."}
      </p>

      {/* ── Summary ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <StatTile label="Kitoblar" value={summary.bookCount} />
          <StatTile label="Mavzular" value={summary.topicCount} />
          <StatTile label="So'zlar" value={summary.wordCount} />
          <StatTile label="Ochiq" value={summary.publicTopics} accent />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30
                        text-danger text-sm mt-6">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Books ───────────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 mb-5">
          <h2 className="text-lg font-bold text-text-primary">Kitoblarim</h2>
          <button
            onClick={() => setShowBookForm((v) => !v)}
            className="btn-ghost flex items-center gap-2 text-sm py-2"
          >
            {showBookForm ? <X size={14} /> : <BookPlus size={14} />}
            {showBookForm ? 'Bekor qilish' : 'Kitob qo’shish'}
          </button>
        </div>

        {showBookForm && (
          <BookForm
            onCancel={() => setShowBookForm(false)}
            onCreated={() => { setShowBookForm(false); load(); }}
          />
        )}

        {books.length === 0 ? (
          <EmptyHint text="Hali kitob yaratmagansiz. Kitob — bu mavzularni guruhlash uchun papka." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <BookRow key={book.id} book={book} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      {/* ── Topics ──────────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 mb-5">
          <h2 className="text-lg font-bold text-text-primary">Mavzularim</h2>
          <button
            onClick={() => setShowTopicForm((v) => !v)}
            className="btn-ghost flex items-center gap-2 text-sm py-2"
          >
            {showTopicForm ? <X size={14} /> : <FolderPlus size={14} />}
            {showTopicForm ? 'Bekor qilish' : 'Mavzu qo’shish'}
          </button>
        </div>

        {showTopicForm && (
          <TopicForm
            books={books}
            onCancel={() => setShowTopicForm(false)}
            onCreated={() => { setShowTopicForm(false); load(); }}
          />
        )}

        {topics.length === 0 ? (
          <EmptyHint text="Hali mavzu yaratmagansiz. Mavzu ichiga so'zlaringizni qo'shasiz." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <TopicRow key={topic.id} topic={topic} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      {user && summary && summary.publicTopics > 0 && (
        <p className="text-sm text-text-muted mt-10 text-center">
          {"Ochiq mavzularingiz "}
          <Link
            href={`/dictionary/users/${user.username}`}
            className="text-primary hover:underline font-medium"
          >
            {"sizning profilingizda"}
          </Link>
          {" ko'rinadi."}
        </p>
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function StatTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card-glass p-4 text-center">
      <p className={cn('text-2xl font-extrabold', accent ? 'text-accent' : 'text-text-primary')}>
        {value}
      </p>
      <p className="text-xs text-text-muted mt-1 font-medium">{label}</p>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="card-glass p-8 text-center text-text-muted text-sm">{text}</div>
  );
}

function BookForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api.post('/library/books', { title: title.trim(), description: description.trim() || null, isPublic });
      onCreated();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-glass p-5 mb-5 space-y-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Kitob nomi"
        className="input-field"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Qisqacha tavsif (ixtiyoriy)"
        className="input-field"
      />
      <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />
      {err && <p className="text-danger text-sm">{err}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={!title.trim() || saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Yaratish'}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm">Bekor qilish</button>
      </div>
    </div>
  );
}

function TopicForm({
  books,
  onCancel,
  onCreated,
}: {
  books: LibraryBook[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [bookId, setBookId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api.post('/library/topics', {
        name: name.trim(),
        bookId: bookId || null,
        isPublic,
      });
      onCreated();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-glass p-5 mb-5 space-y-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Mavzu nomi (masalan: Mevalar)"
        className="input-field"
      />
      <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="input-field">
        <option value="">Kitobsiz (alohida mavzu)</option>
        {books.map((b) => (
          <option key={b.id} value={b.id}>{b.title}</option>
        ))}
      </select>
      <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />
      {err && <p className="text-danger text-sm">{err}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={!name.trim() || saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Yaratish'}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm">Bekor qilish</button>
      </div>
    </div>
  );
}

function VisibilityToggle({
  isPublic,
  onChange,
}: {
  isPublic: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!isPublic)}
      className={cn(
        'flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left',
        isPublic
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-border text-text-muted hover:text-text-secondary',
      )}
    >
      {isPublic ? <Eye size={15} /> : <EyeOff size={15} />}
      <span className="flex-1">
        {isPublic ? 'Ochiq — boshqalar topib, saqlay oladi' : 'Yopiq — faqat siz ko’rasiz'}
      </span>
      <span
        className={cn(
          'w-9 h-5 rounded-full relative transition-colors shrink-0',
          isPublic ? 'bg-success' : 'bg-surface-2 border border-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
            isPublic ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

function BookRow({ book, onChanged }: { book: LibraryBook; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleVisibility = async () => {
    setBusy(true);
    try {
      await api.patch(`/library/books/${book.id}`, { isPublic: !book.isPublic });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/library/books/${book.id}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-glass p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text-primary truncate">{book.title}</p>
          {book.description && (
            <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{book.description}</p>
          )}
          <p className="text-xs text-text-muted mt-2">{book._count.topics} ta mavzu</p>
        </div>
        <VisibilityBadge isPublic={book.isPublic} busy={busy} onToggle={toggleVisibility} />
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
        {confirmDelete ? (
          <>
            <button onClick={remove} disabled={busy} className="text-xs font-semibold text-danger hover:underline">
              O&rsquo;chirishni tasdiqlash
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-text-muted hover:text-text-primary">
              Bekor
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors"
          >
            <Trash2 size={13} /> O&rsquo;chirish
          </button>
        )}
      </div>
    </div>
  );
}

function TopicRow({ topic, onChanged }: { topic: LibraryTopic; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleVisibility = async () => {
    setBusy(true);
    try {
      await api.patch(`/library/topics/${topic.id}`, { isPublic: !topic.isPublic });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/library/topics/${topic.id}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-glass p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-primary shrink-0" />
            <p className="font-bold text-text-primary truncate">{topic.name}</p>
          </div>
          {topic.book && (
            <p className="text-xs text-text-muted mt-1 truncate">📕 {topic.book.title}</p>
          )}
          <p className="text-xs text-text-muted mt-2">{topic._count.wordTopics} ta so&rsquo;z</p>
        </div>
        <VisibilityBadge isPublic={topic.isPublic} busy={busy} onToggle={toggleVisibility} />
      </div>

      {/* An empty public topic is hidden from the profile until it has words,
          so say so rather than leaving the author wondering. */}
      {topic.isPublic && topic._count.wordTopics === 0 && (
        <p className="text-xs text-accent mt-2">
          {"So'z qo'shmaguningizcha profilingizda ko'rinmaydi"}
        </p>
      )}

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
        <Link
          href={`/library/topics/${topic.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Plus size={13} /> So&rsquo;zlar
        </Link>

        {confirmDelete ? (
          <>
            <button onClick={remove} disabled={busy} className="text-xs font-semibold text-danger hover:underline ml-auto">
              Tasdiqlash
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-text-muted hover:text-text-primary">
              Bekor
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors ml-auto"
          >
            <Trash2 size={13} /> O&rsquo;chirish
          </button>
        )}
      </div>
    </div>
  );
}

function VisibilityBadge({
  isPublic,
  busy,
  onToggle,
}: {
  isPublic: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      title={isPublic ? "Ochiq — yopishga bosing" : "Yopiq — ochishga bosing"}
      className={cn(
        'badge-chip shrink-0 border transition-colors',
        busy && 'opacity-50',
        isPublic
          ? 'bg-success/10 text-success border-success/30 hover:bg-success/20'
          : 'bg-surface-2 text-text-muted border-border hover:text-text-secondary',
      )}
    >
      {busy ? (
        <Loader2 size={11} className="animate-spin" />
      ) : isPublic ? (
        <Eye size={11} />
      ) : (
        <EyeOff size={11} />
      )}
      {isPublic ? 'Ochiq' : 'Yopiq'}
    </button>
  );
}
