'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Volume2, Bookmark, BookmarkCheck, Loader2, Eye, EyeOff, ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Word } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface WordCardProps {
  word: Word;
  isAuthenticated: boolean;
  onToggleSave: (id: string) => Promise<void>;
}

/**
 * One line per word: the word, its reading, its meaning and the quick actions.
 *
 * Everything else a word carries — JLPT level, conjugations, kanji breakdown,
 * examples, synonyms, mnemonic — lives on /dictionary/words/[wordId] behind
 * the "Ochish" button. A lesson is 40+ words, and expanding that much detail
 * inline made a topic unreadable; the listing is for scanning, the page is for
 * studying one word.
 */
export function WordCard({ word, isAuthenticated, onToggleSave }: WordCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);

  // ── TTS Playback ─────────────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setTtsError(false);
    try {
      const text = word.hiragana || word.japaneseWord;
      const url = `${API_BASE}/tts?text=${encodeURIComponent(text)}&voice=ja-JP-NanamiNeural`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setIsPlaying(false); setTtsError(true); URL.revokeObjectURL(audioUrl); };
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

  const hasReading = !!word.hiragana && word.hiragana !== word.japaneseWord;

  return (
    <div className="card-glass group transition-all duration-200 hover:border-border/80">
      <div className="p-4 flex items-center gap-3">

        {/* Word + reading + meaning */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-bold text-text-primary tracking-wide">
              {word.japaneseWord}
            </span>
            {showFurigana && hasReading && (
              <span className="text-sm text-primary/80 font-medium">
                ({word.hiragana})
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
            {word.meaning}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Furigana toggle */}
          {hasReading && (
            <button
              onClick={() => setShowFurigana(!showFurigana)}
              title={showFurigana ? 'Furigana yashirish' : "Furigana ko'rsatish"}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                showFurigana
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'hover:bg-surface-2 text-text-muted hover:text-primary',
              )}
            >
              {showFurigana ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}

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

          {/* Open the word's own page */}
          <Link
            href={`/dictionary/words/${word.id}`}
            title="So'z sahifasini ochish"
            className="ml-1 h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs font-medium
                       border border-border text-text-muted
                       hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
          >
            {'Ochish'}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

export function WordCardSkeleton() {
  return (
    <div className="card-glass p-4 flex items-center gap-3">
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-6 w-20 skeleton rounded" />
          <div className="h-4 w-14 skeleton rounded" />
        </div>
        <div className="h-4 w-3/4 skeleton rounded" />
      </div>
      <div className="flex gap-1">
        <div className="w-8 h-8 skeleton rounded-lg" />
        <div className="w-8 h-8 skeleton rounded-lg" />
        <div className="w-16 h-8 skeleton rounded-lg" />
      </div>
    </div>
  );
}
