'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, RefreshCw, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAnswerCorrect } from '@/lib/answerCheck';
import type { SessionWord } from '@/lib/types';

/**
 * The question that gates each new set of pieces.
 *
 * Two formats, chosen by the word's index in the session:
 *   - even index → multiple choice, show the Japanese, pick the meaning
 *   - odd index  → typed, show the meaning, write the Japanese
 *
 * That rule is mirrored on the server (game.service.ts) so the answer is graded
 * in the direction it was actually asked, without the client getting to choose.
 */
export type QuestionKind = 'choice' | 'write';

export const questionKindFor = (wordIndex: number): QuestionKind =>
  wordIndex % 2 === 0 ? 'choice' : 'write';

export interface AskedQuestion {
  word: SessionWord;
  index: number;
  kind: QuestionKind;
  /** Multiple-choice options, already shuffled. Empty for typed questions. */
  options: string[];
}

/** Builds a question for a word, drawing decoys from the rest of the session. */
export const buildQuestion = (
  words: SessionWord[],
  index: number,
): AskedQuestion => {
  const word = words[index];
  const kind = questionKindFor(index);

  let options: string[] = [];
  if (kind === 'choice') {
    const decoys = words
      .filter((w) => w.id !== word.id)
      .map((w) => w.meaning)
      .filter((m, i, arr) => arr.indexOf(m) === i && m !== word.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    options = [word.meaning, ...decoys].sort(() => Math.random() - 0.5);
  }

  return { word, index, kind, options };
};

interface BlockQuestionProps {
  question: AskedQuestion;
  /** Called with the raw answer text and whether it was right. */
  onAnswer: (answer: string, correct: boolean) => void;
  /** Swap this question for a different word. */
  onSkip: () => void;
  /** How many swaps are left; the button hides at zero. */
  skipsLeft: number;
}

export function BlockQuestion({ question, onAnswer, onSkip, skipsLeft }: BlockQuestionProps) {
  const { word, kind, options } = question;
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<'none' | 'correct' | 'wrong'>('none');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset whenever a different question arrives.
  useEffect(() => {
    setTyped('');
    setPicked(null);
    setVerdict('none');
    if (kind === 'write') setTimeout(() => inputRef.current?.focus(), 80);
  }, [question.word.id, question.index, kind]);

  const settle = useCallback((raw: string, correct: boolean) => {
    setVerdict(correct ? 'correct' : 'wrong');
    // Hold the verdict on screen briefly so the answer registers before the
    // board takes over again.
    setTimeout(() => onAnswer(raw, correct), correct ? 700 : 1500);
  }, [onAnswer]);

  const submitTyped = useCallback(() => {
    if (verdict !== 'none' || !typed.trim()) return;
    settle(typed.trim(), isAnswerCorrect(word, typed, 'toJapanese'));
  }, [verdict, typed, word, settle]);

  const pick = useCallback((option: string) => {
    if (verdict !== 'none') return;
    setPicked(option);
    settle(option, isAnswerCorrect(word, option, 'toMeaning'));
  }, [verdict, word, settle]);

  const prompt = kind === 'choice' ? word.japaneseWord : word.meaning;
  const answerText = kind === 'choice'
    ? word.meaning
    : `${word.japaneseWord}${word.hiragana && word.hiragana !== word.japaneseWord ? ` (${word.hiragana})` : ''}`;

  return (
    <div className="card-glass p-5 sm:p-6 border-primary/30 animate-fade-in">
      <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold text-center mb-3">
        {kind === 'choice' ? "To'g'ri ma'nosini tanlang" : 'Yaponchasini yozing'}
      </p>

      {/* Prompt */}
      <p className={cn(
        'text-center font-black text-text-primary leading-snug mb-5',
        kind === 'choice' ? 'text-3xl tracking-wide' : 'text-2xl',
      )}>
        {prompt}
      </p>

      {/* ── Multiple choice ──────────────────────────────────────────────── */}
      {kind === 'choice' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {options.map((option) => {
            const isPicked = picked === option;
            const isTheAnswer = verdict !== 'none' && isAnswerCorrect(word, option, 'toMeaning');
            return (
              <button
                key={option}
                onClick={() => pick(option)}
                disabled={verdict !== 'none'}
                className={cn(
                  'px-4 py-3 rounded-xl text-sm font-semibold text-left border transition-all',
                  verdict === 'none'
                    ? 'bg-surface-2/40 border-border/60 text-text-secondary hover:border-primary/50 hover:text-text-primary'
                    : isTheAnswer
                      ? 'bg-success/15 border-success text-success'
                      : isPicked
                        ? 'bg-danger/15 border-danger text-danger'
                        : 'bg-surface-2/20 border-border/40 text-text-muted opacity-60',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        /* ── Typed ─────────────────────────────────────────────────────── */
        <div
          className={cn(
            'flex items-center gap-3 w-full rounded-xl border px-4 py-3 transition-all',
            verdict === 'correct' ? 'border-success bg-success/5'
            : verdict === 'wrong' ? 'border-danger bg-danger/5'
            : 'bg-surface/60 border-border/70 focus-within:border-primary',
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => verdict === 'none' && setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
            placeholder="日本語 — kanji, hiragana yoki katakana…"
            lang="ja"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={verdict !== 'none'}
            className="flex-1 min-w-0 bg-transparent text-base text-text-primary
                       placeholder:text-text-muted outline-none"
          />
        </div>
      )}

      {/* ── Verdict ──────────────────────────────────────────────────────── */}
      {verdict !== 'none' && (
        <div className={cn(
          'flex items-center gap-2 mt-4 text-sm font-semibold',
          verdict === 'correct' ? 'text-success' : 'text-danger',
        )}>
          {verdict === 'correct' ? <Check size={16} /> : <X size={16} />}
          {verdict === 'correct' ? "To'g'ri!" : <>Javob: <span className="text-text-primary">{answerText}</span></>}
        </div>
      )}

      {/* ── Buttons ──────────────────────────────────────────────────────
          "Tasdiqlash" only exists for the typed format — picking an option in
          the multiple-choice format is already the commitment. */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={onSkip}
          disabled={verdict !== 'none' || skipsLeft <= 0}
          className="btn-ghost flex items-center gap-2 text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title={skipsLeft > 0 ? `${skipsLeft} ta almashtirish qoldi` : 'Almashtirishlar tugadi'}
        >
          <RefreshCw size={14} />
          Savolni almashtirish
          <span className="text-xs text-text-muted">({skipsLeft})</span>
        </button>

        {kind === 'write' && (
          <button
            onClick={submitTyped}
            disabled={verdict !== 'none' || !typed.trim()}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 flex-1 justify-center disabled:opacity-40"
          >
            <Send size={14} /> Javobni tasdiqlash
          </button>
        )}
      </div>
    </div>
  );
}
