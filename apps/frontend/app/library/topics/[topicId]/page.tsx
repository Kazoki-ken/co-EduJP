'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import api, { errorMessage, isQuotaError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { UpgradeNotice } from '@/components/premium/UpgradeNotice';
import { VisibilityBadge, VisibilityToggle } from '@/components/library/Visibility';
import type { LibraryBook, LibraryTopic, LibraryWord } from '@/lib/types';

export default function LibraryTopicPage() {
  const params = useParams();
  const topicId = String(params.topicId ?? '');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [topic, setTopic] = useState<LibraryTopic | null>(null);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [words, setWords] = useState<LibraryWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // The words endpoint is the authoritative ownership check; the topic
      // list gives its name and book, and the book list feeds the move picker.
      const [w, t, b] = await Promise.all([
        api.get<{ data: LibraryWord[] }>(`/library/topics/${topicId}/words`),
        api.get<{ data: LibraryTopic[] }>('/library/topics'),
        api.get<{ data: LibraryBook[] }>('/library/books'),
      ]);
      setWords(w.data.data);
      setTopic(t.data.data.find((x) => x.id === topicId) ?? null);
      setBooks(b.data.data);
    } catch {
      setError('Mavzu topilmadi yoki sizga tegishli emas.');
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

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

  if (!isAuthenticated || error) {
    return (
      <div className="page-container py-24 text-center">
        <Lock size={44} className="mx-auto mb-4 text-text-muted" />
        <h1 className="text-xl font-bold text-text-primary mb-2">
          {error ?? 'Tizimga kiring'}
        </h1>
        <Link href="/library" className="btn-ghost inline-block mt-4">
          {"Mening lug'atim"}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Back to the parent book when there is one — otherwise to the library. */}
      <Link
        href={topic?.bookId ? `/library/books/${topic.bookId}` : '/library'}
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        {topic?.book ? topic.book.title : "Mening lug'atim"}
      </Link>

      {editing && topic ? (
        <TopicEditForm
          topic={topic}
          books={books}
          onCancel={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
              <Tag size={15} />
              <span>Mavzu</span>
            </div>
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight break-words">
              {topic?.name ?? 'Mavzu'}
            </h1>
            <p className="text-text-muted mt-2 text-sm flex items-center gap-1.5 flex-wrap">
              <span>{words.length} ta so&rsquo;z</span>
              {topic?.book && (
                <>
                  <span>·</span>
                  <Link
                    href={`/library/books/${topic.bookId}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <BookOpen size={12} /> {topic.book.title}
                  </Link>
                </>
              )}
            </p>
          </div>

          {topic && (
            <div className="flex items-center gap-2 shrink-0">
              <VisibilityBadge
                isPublic={topic.isPublic}
                busy={false}
                onToggle={async () => {
                  await api.patch(`/library/topics/${topic.id}`, { isPublic: !topic.isPublic });
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
          )}
        </div>
      )}

      <AddWordForm topicId={topicId} onAdded={load} />

      <div className="mt-8">
        {words.length === 0 ? (
          <div className="card-glass p-8 text-center text-text-muted text-sm">
            {"Hali so'z yo'q. Yuqoridagi shakl orqali birinchi so'zingizni qo'shing."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {words.map((word) => (
              <WordRow key={word.id} word={word} onChanged={load} />
            ))}
          </div>
        )}
      </div>

      {words.length > 0 && words.length < 4 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/30
                        text-accent text-sm mt-6">
          <AlertCircle size={16} className="shrink-0" />
          {`O'yin o'ynash uchun kamida 4 ta so'z kerak — yana ${4 - words.length} ta qo'shing.`}
        </div>
      )}
    </div>
  );
}

function AddWordForm({ topicId, onAdded }: { topicId: string; onAdded: () => void }) {
  const [japaneseWord, setJapaneseWord] = useState('');
  const [hiragana, setHiragana] = useState('');
  const [meaning, setMeaning] = useState('');
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);

  const canSubmit = japaneseWord.trim() && meaning.trim() && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      await api.post(`/library/topics/${topicId}/words`, {
        japaneseWord: japaneseWord.trim(),
        hiragana: hiragana.trim() || null,
        meaning: meaning.trim(),
      });
      // Keep the form open and focused so several words can be added in a row.
      setJapaneseWord('');
      setHiragana('');
      setMeaning('');
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
      onAdded();
    } catch (e: unknown) {
      setQuota(isQuotaError(e));
      setErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-glass p-5 mt-8">
      <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
        <Plus size={16} className="text-primary" />
        {"So'z qo'shish"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          autoFocus
          value={japaneseWord}
          onChange={(e) => setJapaneseWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="日本語 *"
          className="input-field"
        />
        <input
          value={hiragana}
          onChange={(e) => setHiragana(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="にほんご (ixtiyoriy)"
          className="input-field"
        />
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Ma'nosi *"
          className="input-field"
        />
      </div>

      {err && (quota
        ? <div className="mt-3"><UpgradeNotice message={err} /></div>
        : <p className="text-danger text-sm mt-3">{err}</p>)}

      <div className="flex items-center gap-3 mt-4">
        <button onClick={submit} disabled={!canSubmit} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Qo'shish"}
        </button>
        {justAdded && (
          <span className="flex items-center gap-1.5 text-success text-sm font-medium animate-fade-in">
            <Check size={14} /> {"Qo'shildi"}
          </span>
        )}
        <span className="text-xs text-text-muted ml-auto hidden sm:block">
          Enter bosib tez qo&rsquo;shishingiz mumkin
        </span>
      </div>
    </div>
  );
}

/** Rename a topic, move it to another book, or change who can see it. */
function TopicEditForm({
  topic, books, onCancel, onSaved,
}: {
  topic: LibraryTopic;
  books: LibraryBook[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(topic.name);
  const [bookId, setBookId] = useState(topic.bookId ?? '');
  const [isPublic, setIsPublic] = useState(topic.isPublic);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`/library/topics/${topic.id}`, {
        name: name.trim(),
        // An empty select means "no book" — null unparents it.
        bookId: bookId || null,
        isPublic,
      });
      onSaved();
    } catch (e: unknown) {
      setQuota(isQuotaError(e));
      setErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-glass p-5 space-y-3">
      <h2 className="font-bold text-text-primary">Mavzuni tahrirlash</h2>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Mavzu nomi"
        className="input-field"
      />
      <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="input-field">
        <option value="">Kitobsiz (alohida mavzu)</option>
        {books.map((b) => (
          <option key={b.id} value={b.id}>{b.title}</option>
        ))}
      </select>
      <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />
      {err && (quota ? <UpgradeNotice message={err} /> : <p className="text-danger text-sm">{err}</p>)}
      <div className="flex gap-2">
        <button onClick={submit} disabled={!name.trim() || saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Saqlash'}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm">Bekor qilish</button>
      </div>
    </div>
  );
}

function WordRow({ word, onChanged }: { word: LibraryWord; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/library/words/${word.id}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <WordEditForm
        word={word}
        onCancel={() => setEditing(false)}
        onSaved={() => { setEditing(false); onChanged(); }}
      />
    );
  }

  return (
    <div className="card-glass p-4 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-text-primary tracking-wide">
              {word.japaneseWord}
            </span>
            {word.hiragana && word.hiragana !== word.japaneseWord && (
              <span className="text-sm text-primary/80 font-medium">({word.hiragana})</span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{word.meaning}</p>
        </div>

        {confirm ? (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={remove} disabled={busy} className="text-xs font-semibold text-danger hover:underline">
              {busy ? '...' : 'Tasdiq'}
            </button>
            <button onClick={() => setConfirm(false)} className="text-xs text-text-muted hover:text-text-primary">
              Bekor
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              title="Tahrirlash"
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setConfirm(true)}
              title="O'chirish"
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         hover:bg-danger/10 text-text-muted hover:text-danger transition-all"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WordEditForm({
  word, onCancel, onSaved,
}: {
  word: LibraryWord;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [japaneseWord, setJapaneseWord] = useState(word.japaneseWord);
  const [hiragana, setHiragana] = useState(word.hiragana ?? '');
  const [meaning, setMeaning] = useState(word.meaning);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);

  const submit = async () => {
    if (!japaneseWord.trim() || !meaning.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`/library/words/${word.id}`, {
        japaneseWord: japaneseWord.trim(),
        hiragana: hiragana.trim() || null,
        meaning: meaning.trim(),
      });
      onSaved();
    } catch (e: unknown) {
      setQuota(isQuotaError(e));
      setErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-glass p-4 space-y-2 border-primary/40">
      <input
        autoFocus
        value={japaneseWord}
        onChange={(e) => setJapaneseWord(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="日本語 *"
        lang="ja"
        className="input-field"
      />
      <input
        value={hiragana}
        onChange={(e) => setHiragana(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="にほんご (ixtiyoriy)"
        lang="ja"
        className="input-field"
      />
      <input
        value={meaning}
        onChange={(e) => setMeaning(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Ma'nosi *"
        className="input-field"
      />
      {err && (quota ? <UpgradeNotice message={err} /> : <p className="text-danger text-sm">{err}</p>)}
      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={!japaneseWord.trim() || !meaning.trim() || saving}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Saqlash'}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm flex items-center gap-1.5">
          <X size={14} /> Bekor
        </button>
      </div>
    </div>
  );
}
