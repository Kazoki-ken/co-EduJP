'use client';

import { useState, useCallback } from 'react';
import { Volume2, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Word } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface WordCardProps {
  word: Word;
  isAuthenticated: boolean;
  onToggleSave: (id: string) => Promise<void>;
}

export function WordCard({ word, isAuthenticated, onToggleSave }: WordCardProps) {
  const [expanded,   setExpanded]   = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [ttsError,   setTtsError]   = useState(false);

  // ── TTS Playback ─────────────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setTtsError(false);
    try {
      // Prefer hiragana for cleaner pronunciation; fall back to kanji
      const text = word.hiragana || word.japaneseWord;
      const url   = `${API_BASE}/tts?text=${encodeURIComponent(text)}&voice=ja-JP-NanamiNeural`;
      const res   = await fetch(url);
      if (!res.ok) throw new Error('TTS failed');

      const blob        = await res.blob();
      const audioUrl    = URL.createObjectURL(blob);
      const audio       = new Audio(audioUrl);
      audio.onended     = () => { setIsPlaying(false); URL.revokeObjectURL(audioUrl); };
      audio.onerror     = () => { setIsPlaying(false); setTtsError(true); };
      await audio.play();
    } catch {
      setIsPlaying(false);
      setTtsError(true);
    }
  }, [isPlaying, word.hiragana, word.japaneseWord]);

  // ── Save Toggle ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (isSaving || !isAuthenticated) return;
    setIsSaving(true);
    try {
      await onToggleSave(word.id);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, isAuthenticated, onToggleSave, word.id]);

  // ── Topic Pills ───────────────────────────────────────────────────────────
  const topics = word.wordTopics.map((wt) => wt.topic.name);

  return (
    <div className={cn(
      'card-glass group transition-all duration-200',
      'hover:border-border/80',
      expanded && 'border-primary/30',
    )}>
      {/* ── Main Row ───────────────────────────────────────────────────── */}
      <div className="p-4 flex items-start gap-3">

        {/* Japanese word block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-bold text-text-primary tracking-wide">
              {word.japaneseWord}
            </span>
            {word.hiragana && word.hiragana !== word.japaneseWord && (
              <span className="text-sm text-primary/80 font-medium">
                ({word.hiragana})
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
            {word.meaning}
          </p>

          {/* Topic pills */}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {topics.slice(0, 3).map((t) => (
                <span key={t} className="badge-chip bg-surface-2 text-text-muted border border-border">
                  {t}
                </span>
              ))}
              {topics.length > 3 && (
                <span className="badge-chip bg-surface-2 text-text-muted border border-border">
                  +{topics.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* TTS */}
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            title="Talaffuzni eshitish"
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              isPlaying
                ? 'bg-primary/20 text-primary cursor-wait'
                : ttsError
                  ? 'bg-danger/10 text-danger hover:bg-danger/20'
                  : 'hover:bg-surface-2 text-text-muted hover:text-primary',
            )}
          >
            {isPlaying
              ? <Loader2 size={15} className="animate-spin" />
              : <Volume2 size={15} />
            }
          </button>

          {/* Save */}
          {isAuthenticated && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              title={word.isSaved ? "So'zni saqlanganlardan o'chirish" : "So'zni saqlash"}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                isSaving && 'opacity-50 cursor-wait',
                word.isSaved
                  ? 'bg-accent/10 text-accent hover:bg-danger/10 hover:text-danger'
                  : 'hover:bg-surface-2 text-text-muted hover:text-accent',
              )}
            >
              {word.isSaved
                ? <BookmarkCheck size={15} className="fill-accent" />
                : <Bookmark size={15} />
              }
            </button>
          )}

          {/* Expand toggle */}
          {(word.exampleSentence) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Yopish' : "Misolni ko'rish"}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded: Example Sentence ──────────────────────────────── */}
      {expanded && word.exampleSentence && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50">
          <div className="mt-3 space-y-1">
            <p className="text-sm text-text-secondary font-medium">
              {word.exampleSentence}
            </p>
            {word.exampleTranslation && (
              <p className="text-sm text-text-muted italic">
                {word.exampleTranslation}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function WordCardSkeleton() {
  return (
    <div className="card-glass p-4 flex items-start gap-3">
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-6 w-20 skeleton rounded" />
          <div className="h-4 w-14 skeleton rounded" />
        </div>
        <div className="h-4 w-3/4 skeleton rounded" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 skeleton rounded-full" />
          <div className="h-5 w-20 skeleton rounded-full" />
        </div>
      </div>
      <div className="flex gap-1">
        <div className="w-8 h-8 skeleton rounded-lg" />
        <div className="w-8 h-8 skeleton rounded-lg" />
      </div>
    </div>
  );
}
