'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Volume2, Bookmark, BookmarkCheck, ChevronDown, ChevronUp,
  Loader2, Eye, EyeOff, Save, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { Word } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface WordCardProps {
  word: Word;
  isAuthenticated: boolean;
  onToggleSave: (id: string) => Promise<void>;
}

export function WordCard({ word, isAuthenticated, onToggleSave }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState(false);

  // New features
  const [showFurigana, setShowFurigana] = useState(true);
  const [note, setNote] = useState(word.userNote || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // Sync note state when word object changes
  useEffect(() => {
    setNote(word.userNote || '');
  }, [word.userNote]);

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
      audio.onerror = () => { setIsPlaying(false); setTtsError(true); };
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

  // ── Mnemonic Save ─────────────────────────────────────────────────────────
  const handleSaveNote = async () => {
    if (!isAuthenticated) return;
    setIsSavingNote(true);
    try {
      await api.post(`/words/${word.id}/note`, { note });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setIsSavingNote(false);
    }
  };

  // ── Topic Pills ───────────────────────────────────────────────────────────
  const topics = (word.wordTopics ?? []).map((wt) => wt.topic.name);

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
            {showFurigana && word.hiragana && word.hiragana !== word.japaneseWord && (
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
          
          {/* Furigana Toggle */}
          {word.hiragana && word.hiragana !== word.japaneseWord && (
            <button
              onClick={() => setShowFurigana(!showFurigana)}
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
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Yopish' : "Batafsil ko'rish"}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ── Expanded details ──────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-5 pt-4 border-t border-border/50 bg-surface-2/10 space-y-5 animate-fade-in text-sm">
          
          {/* Grid fields: POS, JLPT, Frequency, Pitch Accent */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface-2/30 rounded-xl p-3.5 border border-border/50">
            <div>
              <p className="text-[10px] uppercase font-bold text-text-muted">So'z turi</p>
              <p className="text-text-secondary capitalize font-medium mt-0.5">{word.partOfSpeech || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-text-muted">JLPT Darajasi</p>
              {word.jlptLevel ? (
                <span className="inline-block mt-1 badge-chip bg-primary/20 text-primary border border-primary/30 text-xs px-2 py-0.5">
                  {word.jlptLevel}
                </span>
              ) : <p className="text-text-secondary mt-0.5">—</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-text-muted">Chastota</p>
              <p className="text-text-secondary font-medium mt-0.5">{word.frequency || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-text-muted">Pitch Accent</p>
              <p className="text-text-secondary font-medium mt-0.5">{word.pitchAccent || '—'}</p>
            </div>
          </div>

          {/* Conjugations (te, ta, nai, masu-form) */}
          {(word.teForm || word.taForm || word.naiForm || word.masuForm) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Tuslanish shakllari</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface-2/40 border border-border/40 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-text-muted uppercase">te-form</p>
                  <p className="font-bold text-text-primary text-xs mt-0.5">{word.teForm || '—'}</p>
                </div>
                <div className="bg-surface-2/40 border border-border/40 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-text-muted uppercase">ta-form</p>
                  <p className="font-bold text-text-primary text-xs mt-0.5">{word.taForm || '—'}</p>
                </div>
                <div className="bg-surface-2/40 border border-border/40 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-text-muted uppercase">nai-form</p>
                  <p className="font-bold text-text-primary text-xs mt-0.5">{word.naiForm || '—'}</p>
                </div>
                <div className="bg-surface-2/40 border border-border/40 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-text-muted uppercase">masu-form</p>
                  <p className="font-bold text-text-primary text-xs mt-0.5">{word.masuForm || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Kanji Info Table */}
          {word.kanjiInfo && word.kanjiInfo.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Kanji tarkibi</h4>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-surface-2/10">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-surface-2/40 border-b border-border/50 text-text-muted">
                      <th className="px-3 py-2">Kanji</th>
                      <th className="px-3 py-2">Ma'nosi</th>
                      <th className="px-3 py-2">Kun o'qilishi</th>
                      <th className="px-3 py-2">On o'qilishi</th>
                      <th className="px-3 py-2 text-right">Chiziqlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {word.kanjiInfo.map((k, i) => (
                      <tr key={i} className="hover:bg-surface-2/20 text-text-secondary">
                        <td className="px-3 py-2 font-extrabold text-text-primary text-sm">{k.kanji}</td>
                        <td className="px-3 py-2">{k.meaning || '—'}</td>
                        <td className="px-3 py-2">{k.kunReading || '—'}</td>
                        <td className="px-3 py-2">{k.onReading || '—'}</td>
                        <td className="px-3 py-2 text-right">{k.strokes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Examples blk */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Namunaviy gaplar</h4>
            <div className="space-y-3 bg-surface-2/20 border border-border/50 rounded-xl p-3.5">
              {word.exampleSentence && (
                <div className="space-y-0.5">
                  <p className="text-text-primary font-medium">{word.exampleSentence}</p>
                  {word.exampleTranslation && <p className="text-text-muted italic text-xs">{word.exampleTranslation}</p>}
                </div>
              )}
              {word.additionalExamples && word.additionalExamples.map((ex, i) => (
                <div key={i} className="space-y-0.5 border-t border-border/30 pt-2">
                  <p className="text-text-primary font-medium">{ex.sentence}</p>
                  <p className="text-text-muted italic text-xs">{ex.translation}</p>
                </div>
              ))}
              {!word.exampleSentence && (!word.additionalExamples || word.additionalExamples.length === 0) && (
                <p className="text-text-muted text-xs">Misollar mavjud emas.</p>
              )}
            </div>
          </div>

          {/* Synonyms & Antonyms (Clickable!) */}
          {((word.synonyms && word.synonyms.length > 0) || (word.antonyms && word.antonyms.length > 0)) && (
            <div className="space-y-3 bg-surface-2/20 border border-border/50 rounded-xl p-3.5">
              {word.synonyms && word.synonyms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-text-muted uppercase mr-1">Sinonimlar:</span>
                  {word.synonyms.map((syn, i) => (
                    <a
                      key={i}
                      href={`/dictionary/words?search=${encodeURIComponent(syn)}`}
                      className="badge-chip bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-medium cursor-pointer"
                    >
                      {syn}
                    </a>
                  ))}
                </div>
              )}
              {word.antonyms && word.antonyms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-text-muted uppercase mr-1">Antonimlar:</span>
                  {word.antonyms.map((ant, i) => (
                    <a
                      key={i}
                      href={`/dictionary/words?search=${encodeURIComponent(ant)}`}
                      className="badge-chip bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 text-xs font-medium cursor-pointer"
                    >
                      {ant}
                    </a>
                  ))}
                </div>
              )}
              {word.nuance && (
                <div className="text-xs text-text-secondary border-t border-border/30 pt-2">
                  <span className="font-bold text-text-muted">Farqi (Nuans):</span> {word.nuance}
                </div>
              )}
            </div>
          )}

          {/* Compound Words */}
          {word.compounds && word.compounds.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Birikma so'zlar</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {word.compounds.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface-2/20 text-xs">
                    <div>
                      <p className="font-bold text-text-primary">{c.word}</p>
                      {c.hiragana && <p className="text-[10px] text-primary">({c.hiragana})</p>}
                    </div>
                    <span className="text-text-muted italic">{c.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Homonyms (Talaffuzdosh so'zlar) */}
          {word.homonyms && word.homonyms.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Talaffuzi bir xil bo'lgan boshqa so'zlar (Homonimlar)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {word.homonyms.map((h, i) => (
                  <a
                    key={i}
                    href={`/dictionary/words?search=${encodeURIComponent(h.word)}`}
                    className="flex items-center justify-between p-2 rounded-lg border border-danger/25 bg-danger/5 hover:bg-danger/10 text-xs transition-all cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-text-primary">{h.word}</p>
                      {h.hiragana && <p className="text-[10px] text-danger">({h.hiragana})</p>}
                    </div>
                    <span className="text-text-muted italic">{h.meaning}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Personal Mnemonic Note (User-specific) */}
          {isAuthenticated && (
            <div className="space-y-2 border-t border-border/40 pt-4">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Mening eslatmam (Mnemonika)</h4>
              <div className="flex gap-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Bu so'zni yodda saqlash uchun o'zingizga eslatma yozing (masalan, assotsiatsiya)..."
                  className="input-field text-xs h-16 py-2 flex-1 resize-none"
                />
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="btn-primary self-end px-3 py-2 text-xs flex items-center justify-center shrink-0 h-10 w-12"
                  title="Saqlash"
                >
                  {isSavingNote ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : noteSaved ? (
                    <Check size={13} className="text-success" />
                  ) : (
                    <Save size={13} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

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
