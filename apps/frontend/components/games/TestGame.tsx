'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameSession, GameAnswer, SessionWord } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// Build 4 options: 1 correct + 3 distractors from session pool
function buildOptions(word: SessionWord, pool: SessionWord[]): string[] {
  const correct    = word.meaning;
  const distractors = pool
    .filter((w) => w.id !== word.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((w) => w.meaning);

  // Pad with repeats if pool is tiny
  while (distractors.length < 3) {
    distractors.push(distractors[distractors.length - 1] ?? '—');
  }

  return [correct, ...distractors].sort(() => Math.random() - 0.5);
}

type AnswerState = 'idle' | 'correct' | 'wrong';

interface TestGameProps {
  session:    GameSession;
  onComplete: (answers: GameAnswer[]) => void;
}

export function TestGame({ session, onComplete }: TestGameProps) {
  const words       = session.words;
  const [index,     setIndex]     = useState(0);
  const [options,   setOptions]   = useState<string[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [state,     setState]     = useState<AnswerState>('idle');
  const [answers,   setAnswers]   = useState<GameAnswer[]>([]);
  const startedAt   = useRef<number>(Date.now());

  const currentWord = words[index];

  // Rebuild options when index changes
  useEffect(() => {
    setOptions(buildOptions(currentWord, words));
    setSelected(null);
    setState('idle');
    startedAt.current = Date.now();
  }, [index, words]); // eslint-disable-line

  const handleSelect = useCallback((option: string) => {
    if (state !== 'idle') return;
    const timeMs  = Date.now() - startedAt.current;
    const correct = option === currentWord.meaning;
    setSelected(option);
    setState(correct ? 'correct' : 'wrong');

    setAnswers((prev) => [
      ...prev,
      { wordId: currentWord.id, answer: option, timeMs },
    ]);

    // Advance after a moment
    setTimeout(() => {
      if (index + 1 >= words.length) {
        onComplete([...answers, { wordId: currentWord.id, answer: option, timeMs }]);
      } else {
        setIndex((i) => i + 1);
      }
    }, 900);
  }, [state, currentWord, index, words, answers, onComplete]);

  // TTS
  const handleTts = useCallback(async () => {
    const url = `${API_BASE}/tts?text=${encodeURIComponent(currentWord.hiragana || currentWord.japaneseWord)}&voice=ja-JP-NanamiNeural`;
    try {
      const res   = await fetch(url);
      const blob  = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play();
    } catch {}
  }, [currentWord]);

  const progress = ((index) / words.length) * 100;

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-xs text-text-muted shrink-0">{index + 1}/{words.length}</span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <div className="card-glass p-8 text-center mb-5">
            <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-widest">
              What does this mean?
            </p>
            <div className="flex items-center justify-center gap-3">
              <p className="text-4xl font-bold text-text-primary tracking-wide">
                {currentWord.japaneseWord}
              </p>
              <button onClick={handleTts} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-primary transition-colors">
                <Volume2 size={18} />
              </button>
            </div>
            {currentWord.hiragana !== currentWord.japaneseWord && (
              <p className="text-primary/70 text-lg mt-1">{currentWord.hiragana}</p>
            )}
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const isSelected = selected === opt;
              const isCorrect  = opt === currentWord.meaning;

              const bgClass =
                !isSelected     ? ''
                : state === 'correct' && isSelected  ? 'bg-success/20 border-success shadow-[0_0_16px_rgba(16,185,129,0.4)]'
                : state === 'wrong'   && isSelected  ? 'bg-danger/20 border-danger'
                : '';

              const dimmed = selected !== null && !isSelected && !(state === 'wrong' && isCorrect);

              return (
                <motion.button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  disabled={state !== 'idle'}
                  whileTap={state === 'idle' ? { scale: 0.97 } : {}}
                  animate={
                    state === 'wrong' && isCorrect
                      ? { x: [0, -4, 4, -4, 0] }
                      : {}
                  }
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'card-glass px-4 py-4 text-sm text-left font-medium',
                    'hover:border-primary/50 transition-all duration-200 cursor-pointer',
                    bgClass,
                    dimmed && 'opacity-40',
                    state === 'idle' && 'hover:bg-surface-2/60',
                    // Highlight correct answer after wrong pick
                    state === 'wrong' && isCorrect && 'border-success bg-success/10',
                  )}
                >
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
