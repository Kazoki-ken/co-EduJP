'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { LibraryTopic, LibraryWord } from '@/lib/types';

export default function LibraryTopicPage() {
  const params = useParams();
  const topicId = String(params.topicId ?? '');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [topic, setTopic] = useState<LibraryTopic | null>(null);
  const [words, setWords] = useState<LibraryWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The words endpoint is the authoritative ownership check; the topic
      // list is only used to show its name and book above the form.
      const [w, t] = await Promise.all([
        api.get<{ data: LibraryWord[] }>(`/library/topics/${topicId}/words`),
        api.get<{ data: LibraryTopic[] }>('/library/topics'),
      ]);
      setWords(w.data.data);
      setTopic(t.data.data.find((x) => x.id === topicId) ?? null);
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
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-text-primary mb-2">
          {error ?? "Tizimga kiring"}
        </h1>
        <Link href="/library" className="btn-ghost inline-block mt-4">
          {"Mening lug'atim"}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container py-10 animate-fade-in">
      <Link
        href="/library"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} /> {"Mening lug'atim"}
      </Link>

      <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
        <Tag size={15} />
        <span>Mavzu</span>
      </div>
      <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
        {topic?.name ?? 'Mavzu'}
      </h1>
      <p className="text-text-muted mt-2">
        {words.length} ta so&rsquo;z
        {topic?.book && <> · 📕 {topic.book.title}</>}
        {topic && (topic.isPublic ? ' · 🌐 Ochiq' : ' · 🔒 Yopiq')}
      </p>

      <AddWordForm topicId={topicId} onAdded={load} />

      <div className="mt-8">
        {words.length === 0 ? (
          <div className="card-glass p-8 text-center text-text-muted text-sm">
            {"Hali so'z yo'q. Yuqoridagi shakl orqali birinchi so'zingizni qo'shing."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {words.map((word) => (
              <WordRow key={word.id} word={word} onDeleted={load} />
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
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Xatolik');
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

      {err && <p className="text-danger text-sm mt-3">{err}</p>}

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

function WordRow({ word, onDeleted }: { word: LibraryWord; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/library/words/${word.id}`);
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-glass p-4 flex items-start gap-3">
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
        <button
          onClick={() => setConfirm(true)}
          title="O'chirish"
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                     hover:bg-danger/10 text-text-muted hover:text-danger transition-all"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
