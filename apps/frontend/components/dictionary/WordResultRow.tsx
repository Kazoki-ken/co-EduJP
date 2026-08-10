'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Volume2, Bookmark, BookmarkCheck, ChevronsRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Word } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface WordResultRowProps {
  word: Word;
  isAuthenticated: boolean;
  onToggleSave: (id: string) => Promise<void>;
}

/**
 * Compact single-line word result — used for the inline search results on
 * the dictionary landing page. Deliberately shows only the word, its reading,
 * the meaning and the quick actions. The full detail view (JLPT level,
 * conjugation forms, kanji breakdown, examples, notes, ...) lives on
 * /dictionary/words/[wordId], which the chevron opens.
 */
export function WordResultRow({ word, isAuthenticated, onToggleSave }: WordResultRowProps) {
  const [showFurigana, setShowFurigana] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      audio.onerror = () => { setIsPlaying(false); setTtsError(true); };
      await audio.play();
    } catch {
      setIsPlaying(false);
      setTtsError(true);
    }
  }, [isPlaying, word.hiragana, word.japaneseWord]);

  const handleSave = useCallback(async () => {
    if (isSaving || !isAuthenticated) return;
    setIsSaving(true);
    try {
      await onToggleSave(word.id);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, isAuthenticated, onToggleSave, word.id]);

  return (
    <div className="card-glass p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-text-primary tracking-wide">
            {word.japaneseWord}
          </span>
          {showFurigana && word.hiragana && word.hiragana !== word.japaneseWord && (
            <span className="text-sm text-primary/80 font-medium">({word.hiragana})</span>
          )}
        </div>
        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{word.meaning}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {word.hiragana && word.hiragana !== word.japaneseWord && (
          <button
            onClick={() => setShowFurigana((v) => !v)}
            title={showFurigana ? "Furigana yashirish" : "Furigana ko'rsatish"}
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
          {isPlaying ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
        </button>

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

        {/* The full detail page this row always pointed at. */}
        <Link
          href={`/dictionary/words/${word.id}`}
          title="So'z sahifasini ochish"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-accent
                     hover:bg-accent/10 transition-all"
        >
          <ChevronsRight size={18} />
        </Link>
      </div>
    </div>
  );
}

export function WordResultRowSkeleton() {
  return (
    <div className="card-glass p-4 flex items-start gap-3">
      <div className="flex-1 space-y-2">
        <div className="h-5 w-24 skeleton rounded" />
        <div className="h-4 w-3/4 skeleton rounded" />
      </div>
      <div className="flex gap-1">
        <div className="w-8 h-8 skeleton rounded-lg" />
        <div className="w-8 h-8 skeleton rounded-lg" />
        <div className="w-8 h-8 skeleton rounded-lg" />
      </div>
    </div>
  );
}
