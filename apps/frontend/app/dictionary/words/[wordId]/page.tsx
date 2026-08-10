'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle, ArrowLeft, Bookmark, BookmarkCheck, ChevronRight,
  Loader2, Volume2,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { WordDetail } from '@/components/dictionary/WordDetail';
import type { Word } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function WordPage() {
  const params = useParams();
  const router = useRouter();
  const wordId = String(params.wordId ?? '');
  const { isAuthenticated } = useAuth();

  const [word, setWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<Word>(`/words/${wordId}`)
      .then(({ data }) => { if (!cancelled) setWord(data); })
      .catch(() => { if (!cancelled) setError("So'z topilmadi."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [wordId]);

  // The audio element is created per playback and revoked on end, so leaving
  // the page mid-sentence cannot leave a blob URL behind.
  const handlePlay = useCallback(async () => {
    if (isPlaying || !word) return;
    setIsPlaying(true);
    setTtsError(false);
    try {
      const text = word.hiragana || word.japaneseWord;
      const res = await fetch(
        `${API_BASE}/tts?text=${encodeURIComponent(text)}&voice=ja-JP-NanamiNeural`,
      );
      if (!res.ok) throw new Error('TTS failed');
      const audioUrl = URL.createObjectURL(await res.blob());
      const audio = new Audio(audioUrl);
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setIsPlaying(false); setTtsError(true); URL.revokeObjectURL(audioUrl); };
      await audio.play();
    } catch {
      setIsPlaying(false);
      setTtsError(true);
    }
  }, [isPlaying, word]);

  const handleSave = useCallback(async () => {
    if (isSaving || !isAuthenticated || !word) return;
    setIsSaving(true);
    setWord({ ...word, isSaved: !word.isSaved });
    try {
      await api.post(`/words/${word.id}/save`);
    } catch {
      setWord({ ...word, isSaved: word.isSaved });
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, isAuthenticated, word]);

  if (isLoading) {
    return (
      <div className="page-container py-10">
        <div className="card-glass p-6 space-y-4">
          <div className="h-9 w-40 skeleton rounded" />
          <div className="h-4 w-64 skeleton rounded" />
          <div className="h-24 w-full skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !word) {
    return (
      <div className="page-container py-10">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error ?? "So'z topilmadi."}
        </div>
        <Link href="/dictionary/words" className="btn-ghost mt-4 inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={15} /> {"So'zlar ro'yxatiga qaytish"}
        </Link>
      </div>
    );
  }

  const topics = word.wordTopics ?? [];

  return (
    <div className="page-container py-10 animate-fade-in">

      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6 flex-wrap">
        <Link href="/dictionary" className="hover:text-primary transition-colors">{"Lug'at"}</Link>
        <ChevronRight size={14} />
        <Link href="/dictionary/words" className="hover:text-primary transition-colors">{"So'zlar"}</Link>
        <ChevronRight size={14} />
        <span className="text-text-secondary">{word.japaneseWord}</span>
      </nav>

      <button
        onClick={() => router.back()}
        className="btn-ghost inline-flex items-center gap-2 text-sm mb-4 hover:text-primary transition-colors"
      >
        <ArrowLeft size={15} /> {'Orqaga'}
      </button>

      {/* ── Header card ────────────────────────────────────────────── */}
      <div className="card-glass p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-4xl font-extrabold text-text-primary tracking-wide">
              {word.japaneseWord}
            </h1>
            {word.hiragana && word.hiragana !== word.japaneseWord && (
              <p className="text-primary/80 font-medium mt-1">({word.hiragana})</p>
            )}
            <p className="text-text-secondary mt-2 text-lg">{word.meaning}</p>

            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {topics.map((wt) => (
                  <Link
                    key={wt.topic.id}
                    href={`/dictionary/words?topicId=${wt.topic.id}`}
                    className="badge-chip bg-surface-2 text-text-muted border border-border hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    {wt.topic.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              title="Talaffuzni eshitish"
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-border',
                isPlaying
                  ? 'bg-primary/20 text-primary cursor-wait'
                  : ttsError
                    ? 'bg-danger/10 text-danger hover:bg-danger/20'
                    : 'hover:bg-surface-2 text-text-muted hover:text-primary',
              )}
            >
              {isPlaying ? <Loader2 size={17} className="animate-spin" /> : <Volume2 size={17} />}
            </button>

            {isAuthenticated && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                title={word.isSaved ? "Saqlanganlardan o'chirish" : "So'zni saqlash"}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-border',
                  isSaving && 'opacity-50 cursor-wait',
                  word.isSaved
                    ? 'bg-accent/10 text-accent hover:bg-danger/10 hover:text-danger'
                    : 'hover:bg-surface-2 text-text-muted hover:text-accent',
                )}
              >
                {word.isSaved
                  ? <BookmarkCheck size={17} className="fill-accent" />
                  : <Bookmark size={17} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Full detail ────────────────────────────────────────────── */}
      <div className="card-glass p-6">
        <WordDetail word={word} isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
