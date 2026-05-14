'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Send, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameSession, GameAnswer, SessionWord } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type WriteState = 'idle' | 'correct' | 'wrong';

interface WriteGameProps {
  session:    GameSession;
  onComplete: (answers: GameAnswer[]) => void;
}

export function WriteGame({ session, onComplete }: WriteGameProps) {
  const words      = session.words;
  const [index,    setIndex]    = useState(0);
  const [input,    setInput]    = useState('');
  const [state,    setState]    = useState<WriteState>('idle');
  const [answers,  setAnswers]  = useState<GameAnswer[]>([]);
  const startedAt  = useRef<number>(Date.now());
  const inputRef   = useRef<HTMLInputElement>(null);

  const currentWord = words[index];

  useEffect(() => {
    setInput('');
    setState('idle');
    startedAt.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [index]);

  const handleTts = useCallback(async () => {
    const url = `${API_BASE}/tts?text=${encodeURIComponent(currentWord.hiragana || currentWord.japaneseWord)}&voice=ja-JP-NanamiNeural`;
    try {
      const res   = await fetch(url);
      const blob  = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play();
    } catch {}
  }, [currentWord]);

  const handleSubmit = useCallback(() => {
    if (state !== 'idle' || !input.trim()) return;

    const timeMs   = Date.now() - startedAt.current;
    const trimmed  = input.trim().toLowerCase();
    const correct  = currentWord.meaning.toLowerCase();

    // Lenient matching: answer is a substring of correct OR correct is substring of answer
    const isCorrect =
      correct.includes(trimmed) || trimmed.includes(correct) ||
      trimmed === correct;

    setState(isCorrect ? 'correct' : 'wrong');
    const newAnswer: GameAnswer = { wordId: currentWord.id, answer: input.trim(), timeMs };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    setTimeout(() => {
      if (index + 1 >= words.length) {
        onComplete(updatedAnswers);
      } else {
        setIndex((i) => i + 1);
      }
    }, 1100);
  }, [state, input, currentWord, index, words, answers, onComplete]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const progress = (index / words.length) * 100;

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <span className="text-xs text-text-muted">{index + 1}/{words.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Word display */}
          <div className="card-glass p-8 text-center">
            <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-widest">
              Type the meaning in English
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

          {/* Input */}
          <div className="relative">
            <motion.input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => state === 'idle' && setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type meaning…"
              animate={state === 'wrong' ? { x: [-6, 6, -6, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={cn(
                'input-field pr-12 text-base',
                state === 'correct' && 'border-success focus:border-success',
                state === 'wrong'   && 'border-danger focus:border-danger',
              )}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || state !== 'idle'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary-hover
                         disabled:opacity-30 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {state !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  'flex items-start gap-2.5 p-4 rounded-xl border text-sm',
                  state === 'correct'
                    ? 'bg-success/10 border-success/40 text-success'
                    : 'bg-danger/10 border-danger/40 text-danger',
                )}
              >
                {state === 'correct'
                  ? <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  : <XCircle    size={16} className="shrink-0 mt-0.5" />
                }
                <div>
                  <p className="font-semibold">{state === 'correct' ? 'Correct!' : 'Incorrect'}</p>
                  {state === 'wrong' && (
                    <p className="text-text-muted mt-0.5">
                      The answer was: <span className="text-text-primary font-medium">{currentWord.meaning}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Example sentence (shown after answer) */}
          {state !== 'idle' && currentWord.exampleSentence && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-glass p-4 text-sm space-y-1"
            >
              <p className="text-text-secondary">{currentWord.exampleSentence}</p>
              {currentWord.exampleTranslation && (
                <p className="text-text-muted italic">{currentWord.exampleTranslation}</p>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
