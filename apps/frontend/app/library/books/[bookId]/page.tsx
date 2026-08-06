'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Unlink,
  X,
} from 'lucide-react';
import api, { errorMessage, isQuotaError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { UpgradeNotice } from '@/components/premium/UpgradeNotice';
import { VisibilityBadge, VisibilityToggle } from '@/components/library/Visibility';
import type { LibraryBook, LibraryTopic } from '@/lib/types';

/**
 * One of the learner's own books.
 *
 * A book is only a folder for topics, so this page is about the relationship:
 * which topics are inside, adding new or existing ones, and taking them back
 * out. The words themselves live one level down, on the topic page.
 */
export default function LibraryBookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = String(params.bookId ?? '');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [book, setBook] = useState<LibraryBook | null>(null);
  const [allTopics, setAllTopics] = useState<LibraryTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // There is no single-book endpoint; the list is small and already scoped
      // to this user, so finding it there is both cheaper and one fewer route.
      const [b, t] = await Promise.all([
        api.get<{ data: LibraryBook[] }>('/library/books'),
        api.get<{ data: LibraryTopic[] }>('/library/topics'),
      ]);
      const found = b.data.data.find((x) => x.id === bookId) ?? null;
      if (!found) {
        setError('Kitob topilmadi yoki sizga tegishli emas.');
        return;
      }
      setBook(found);
      setAllTopics(t.data.data);
    } catch {
      setError('Kitob topilmadi yoki sizga tegishli emas.');
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (isAuthenticated) load();
    else if (!authLoading) setIsLoading(false);
  }, [isAuthenticated, authLoading, load]);

  const inBook = useMemo(
    () => allTopics.filter((t) => t.bookId === bookId),
    [allTopics, bookId],
  );
  const outsideBook = useMemo(
    () => allTopics.filter((t) => t.bookId !== bookId),
    [allTopics, bookId],
  );
  const wordCount = useMemo(
    () => inBook.reduce((sum, t) => sum + t._count.wordTopics, 0),
    [inBook],
  );

  if (authLoading || isLoading) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || error || !book) {
    return (
      <div className="page-container py-24 text-center">
        <BookOpen size={44} className="mx-auto mb-4 text-text-muted" />
        <h1 className="text-xl font-bold text-text-primary mb-2">
          {error ?? 'Tizimga kiring'}
        </h1>
        <Link href="/library" className="btn-ghost inline-block mt-4">
          {"Mening lug'atim"}
        </Link>
      </div>
    );
  }

  const removeBook = async () => {
    await api.delete(`/library/books/${bookId}`);
    router.push('/library');
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <Link
        href="/library"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} /> {"Mening lug'atim"}
      </Link>

      {/* ── Book header ─────────────────────────────────────────────── */}
      {editing ? (
        <BookEditForm
          book={book}
          onCancel={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
          onDelete={removeBook}
        />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
              <BookOpen size={15} />
              <span>Kitob</span>
            </div>
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight break-words">
              {book.title}
            </h1>
            {book.description && (
              <p className="text-text-secondary mt-2 max-w-2xl">{book.description}</p>
            )}
            <p className="text-text-muted mt-2 text-sm">
              {inBook.length} ta mavzu · {wordCount} ta so&rsquo;z
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <VisibilityBadge
              isPublic={book.isPublic}
              busy={false}
              onToggle={async () => {
                await api.patch(`/library/books/${bookId}`, { isPublic: !book.isPublic });
                load();
              }}
            />
            <button
              onClick={() => setEditing(true)}
              title="Tahrirlash"
              className="w-9 h-9 rounded-lg flex items-center justify-center
                         hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Topics inside this book ─────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 mb-5">
          <h2 className="text-lg font-bold text-text-primary">Kitob ichidagi mavzular</h2>
          <button
            onClick={() => setAdding((v) => !v)}
            className="btn-ghost flex items-center gap-2 text-sm py-2"
          >
            {adding ? <X size={14} /> : <FolderPlus size={14} />}
            {adding ? 'Yopish' : 'Mavzu qo’shish'}
          </button>
        </div>

        {adding && (
          <AddTopicPanel
            bookId={bookId}
            candidates={outsideBook}
            onDone={load}
            onClose={() => setAdding(false)}
          />
        )}

        {inBook.length === 0 ? (
          <div className="card-glass p-8 text-center text-sm text-text-muted">
            {"Bu kitobda hali mavzu yo'q. Yuqoridagi «Mavzu qo'shish» tugmasi orqali yangi mavzu yarating yoki mavjudini shu kitobga ko'chiring."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inBook.map((topic) => (
              <BookTopicCard key={topic.id} topic={topic} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      {book.isPublic && inBook.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/30
                        text-accent text-sm mt-6">
          <AlertCircle size={16} className="shrink-0" />
          {"Kitob ochiq, lekin bo'sh. Mavzu qo'shmaguningizcha uni ochgan odam hech nima ko'rmaydi."}
        </div>
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function BookEditForm({
  book, onCancel, onSaved, onDelete,
}: {
  book: LibraryBook;
  onCancel: () => void;
  onSaved: () => void;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(book.title);
  const [description, setDescription] = useState(book.description ?? '');
  const [isPublic, setIsPublic] = useState(book.isPublic);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`/library/books/${book.id}`, {
        title: title.trim(),
        description: description.trim() || null,
        isPublic,
      });
      onSaved();
    } catch (e: unknown) {
      setErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-glass p-5 space-y-3">
      <h2 className="font-bold text-text-primary">Kitobni tahrirlash</h2>
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

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={submit} disabled={!title.trim() || saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Saqlash'}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm">Bekor qilish</button>

        {/* Deleting a book leaves its topics alone — they just stop having a
            parent — so this is safe to offer without a scary warning. */}
        <span className="ml-auto flex items-center gap-2">
          {confirmDelete ? (
            <>
              <button onClick={onDelete} className="text-xs font-semibold text-danger hover:underline">
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
              <Trash2 size={13} /> Kitobni o&rsquo;chirish
            </button>
          )}
        </span>
      </div>
      <p className="text-xs text-text-muted">
        {"Kitobni o'chirsangiz mavzularingiz o'chmaydi — ular shunchaki kitobsiz qoladi."}
      </p>
    </div>
  );
}

/** Create a topic straight into this book, or move an existing one in. */
function AddTopicPanel({
  bookId, candidates, onDone, onClose,
}: {
  bookId: string;
  candidates: LibraryTopic[];
  onDone: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'new' | 'existing'>(candidates.length > 0 ? 'existing' : 'new');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);

  const createTopic = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api.post('/library/topics', { name: name.trim(), bookId, isPublic: false });
      setName('');
      onDone();
    } catch (e: unknown) {
      setQuota(isQuotaError(e));
      setErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const moveIn = async (topicId: string) => {
    setMovingId(topicId);
    setErr(null);
    try {
      await api.patch(`/library/topics/${topicId}`, { bookId });
      onDone();
    } catch (e: unknown) {
      setQuota(isQuotaError(e));
      setErr(errorMessage(e));
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="card-glass p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <TabButton active={tab === 'existing'} onClick={() => setTab('existing')}>
          Mavjud mavzudan ({candidates.length})
        </TabButton>
        <TabButton active={tab === 'new'} onClick={() => setTab('new')}>
          Yangi yaratish
        </TabButton>
        <button onClick={onClose} className="ml-auto text-text-muted hover:text-text-primary">
          <X size={16} />
        </button>
      </div>

      {err && (quota
        ? <div className="mb-3"><UpgradeNotice message={err} /></div>
        : <p className="text-danger text-sm mb-3">{err}</p>)}

      {tab === 'new' ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTopic()}
            placeholder="Mavzu nomi (masalan: Mevalar)"
            className="input-field flex-1"
          />
          <button
            onClick={createTopic}
            disabled={!name.trim() || saving}
            className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2 justify-center"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Yaratish
          </button>
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-text-muted py-2">
          {"Ko'chirish uchun boshqa mavzuyingiz yo'q. «Yangi yaratish» bo'limidan foydalaning."}
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {candidates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-border/60 bg-surface/40"
            >
              <Tag size={14} className="text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary truncate">{t.name}</p>
                <p className="text-[11px] text-text-muted">
                  {t._count.wordTopics} ta so&rsquo;z
                  {/* Say where it is coming from — this is a move, not a copy. */}
                  {t.book ? ` · hozir «${t.book.title}» kitobida` : ' · kitobsiz'}
                </p>
              </div>
              <button
                onClick={() => moveIn(t.id)}
                disabled={movingId === t.id}
                className="btn-ghost text-xs py-1.5 px-3 shrink-0 flex items-center gap-1.5"
              >
                {movingId === t.id
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Plus size={12} />}
                {"Qo'shish"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors',
        active
          ? 'bg-primary/15 text-primary border-primary/30'
          : 'border-border text-text-muted hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

function BookTopicCard({ topic, onChanged }: { topic: LibraryTopic; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const detach = async () => {
    setBusy(true);
    try {
      // null unparents the topic; it stays in "Mavzularim" on the library page.
      await api.patch(`/library/topics/${topic.id}`, { bookId: null });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-glass p-4 flex flex-col">
      <Link href={`/library/topics/${topic.id}`} className="group flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-primary shrink-0" />
            <p className="font-bold text-text-primary truncate group-hover:text-primary transition-colors">
              {topic.name}
            </p>
          </div>
          <p className="text-xs text-text-muted mt-2">{topic._count.wordTopics} ta so&rsquo;z</p>
        </div>
        <ChevronRight
          size={16}
          className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
        />
      </Link>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
        <Link
          href={`/library/topics/${topic.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Check size={13} /> Ochish
        </Link>
        <button
          onClick={detach}
          disabled={busy}
          title="Mavzu o'chmaydi — faqat shu kitobdan chiqariladi"
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors ml-auto"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={13} />}
          Kitobdan chiqarish
        </button>
      </div>
    </div>
  );
}
