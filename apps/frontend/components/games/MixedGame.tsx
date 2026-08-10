'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, Send, CheckCircle, XCircle, Heart, ListChecks, Link2, PenLine,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAnswerCorrect } from '@/lib/answerCheck';
import { speakWord as speak } from '@/lib/speak';
import { useSafeTimeout } from '@/hooks/useSafeTimeout';
import type { GameAnswer, GameSession, MixedRound, MixedRoundKind, SessionWord } from '@/lib/types';

/**
 * Lives inside a MATCH round. Running out does NOT end the run — it ends the
 * round, and the round counts as a miss.
 */
const MATCH_LIVES = 3;

/** Icons and colours mirror the cards on /games so a round is recognisable. */
const ROUND_META: Record<MixedRoundKind, { label: string; Icon: LucideIcon; chip: string }> = {
  TEST:  {
    label: 'Variantli test',
    Icon: ListChecks,
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  MATCH: {
    label: 'Mos juftliklar',
    Icon: Link2,
    chip: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
  },
  WRITE: {
    label: 'Yozish amaliyoti',
    Icon: PenLine,
    chip: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
};

// ─── Orchestrator ─────────────────────────────────────────────────────────────

interface MixedGameProps {
  session: GameSession;
  onComplete: (answers: GameAnswer[]) => void;
}

export function MixedGame({ session, onComplete }: MixedGameProps) {
  const rounds = useMemo<MixedRound[]>(() => session.rounds ?? [], [session.rounds]);
  const wordMap = useMemo(
    () => new Map(session.words.map((w) => [w.id, w])),
    [session.words],
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  // Answers accumulate across rounds; the run submits once at the end.
  const answersRef = useRef<GameAnswer[]>([]);

  const round = rounds[roundIndex];
  const roundWords = useMemo(
    () => (round?.wordIds ?? []).map((id) => wordMap.get(id)).filter(Boolean) as SessionWord[],
    [round, wordMap],
  );

  const handleRoundDone = useCallback(
    (answers: GameAnswer[], wasClean: boolean) => {
      answersRef.current = [...answersRef.current, ...answers];
      if (wasClean) setCorrectRounds((n) => n + 1);

      if (roundIndex + 1 >= rounds.length) {
        onComplete(answersRef.current);
      } else {
        setRoundIndex((i) => i + 1);
      }
    },
    [roundIndex, rounds.length, onComplete],
  );

  if (!round || roundWords.length === 0) return null;

  const meta = ROUND_META[round.kind];
  const progress = (roundIndex / rounds.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Run-level header — the only thing shared by every round type */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-xs text-text-muted shrink-0 tabular-nums font-semibold">
          {roundIndex + 1}/{rounds.length}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 mb-6">
        <span className={cn(
          'badge-chip text-[11px] font-bold px-2.5 py-1 border inline-flex items-center gap-1.5',
          meta.chip,
        )}>
          <meta.Icon size={13} strokeWidth={2.4} />
          {meta.label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted font-semibold">
          <CheckCircle size={13} className="text-success" />
          {correctRounds} ta raund
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={roundIndex}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
        >
          {round.kind === 'TEST' ? (
            <TestRound
              word={roundWords[0]}
              pool={session.words}
              onDone={handleRoundDone}
            />
          ) : round.kind === 'WRITE' ? (
            <WriteRound word={roundWords[0]} onDone={handleRoundDone} />
          ) : (
            <MatchRound words={roundWords} onDone={handleRoundDone} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── TEST round — one word, four options ─────────────────────────────────────

type RoundDone = (answers: GameAnswer[], wasClean: boolean) => void;

function buildOptions(word: SessionWord, pool: SessionWord[]): string[] {
  const distractors = pool
    .filter((w) => w.id !== word.id && w.meaning !== word.meaning)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((w) => w.meaning);

  while (distractors.length < 3) {
    distractors.push(distractors[distractors.length - 1] ?? '—');
  }

  return [word.meaning, ...distractors].sort(() => Math.random() - 0.5);
}

function TestRound({
  word, pool, onDone,
}: {
  word: SessionWord;
  pool: SessionWord[];
  onDone: RoundDone;
}) {
  const delay = useSafeTimeout();
  const [options] = useState(() => buildOptions(word, pool));
  const [selected, setSelected] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    const correct = option === word.meaning;
    const answer: GameAnswer = {
      wordId: word.id,
      answer: option,
      timeMs: Date.now() - startedAt.current,
    };
    delay(() => onDone([answer], correct), 900);
  };

  return (
    <div>
      <div className="card-glass p-8 text-center mb-5">
        <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-widest">
          {"Bu nimani anglatadi?"}
        </p>
        <div className="flex items-center justify-center gap-3">
          <p className="text-4xl font-bold text-text-primary tracking-wide">{word.japaneseWord}</p>
          <button
            onClick={() => speak(word)}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-primary transition-colors"
          >
            <Volume2 size={18} />
          </button>
        </div>
        {word.hiragana && word.hiragana !== word.japaneseWord && (
          <p className="text-primary/70 text-lg mt-1">{word.hiragana}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt;
          const isCorrect = opt === word.meaning;
          const answered = selected !== null;

          return (
            <motion.button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={answered}
              whileTap={!answered ? { scale: 0.97 } : {}}
              className={cn(
                'card-glass px-4 py-4 text-sm text-left font-medium transition-all duration-200',
                !answered && 'hover:border-primary/50 hover:bg-surface-2/60 cursor-pointer',
                answered && isCorrect && 'border-success bg-success/15',
                answered && isSelected && !isCorrect && 'border-danger bg-danger/20',
                answered && !isSelected && !isCorrect && 'opacity-40',
              )}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── WRITE round — one word, type the Japanese ───────────────────────────────

function WriteRound({ word, onDone }: { word: SessionWord; onDone: RoundDone }) {
  const delay = useSafeTimeout();
  const [input, setInput] = useState('');
  const [state, setState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const startedAt = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = delay(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [delay]);

  const handleSubmit = () => {
    if (state !== 'idle' || !input.trim()) return;

    // Same normalisation the server uses, so the instant feedback shown here
    // always agrees with the score that comes back from /games/submit.
    const correct = isAnswerCorrect(word, input, 'toJapanese');
    setState(correct ? 'correct' : 'wrong');

    const answer: GameAnswer = {
      wordId: word.id,
      answer: input.trim(),
      timeMs: Date.now() - startedAt.current,
    };
    delay(() => onDone([answer], correct), 1300);
  };

  return (
    <div className="space-y-4">
      {/* The Japanese is the answer, so neither it nor its audio appears yet. */}
      <div className="card-glass p-8 text-center">
        <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-widest">
          {'Yaponchasini yozing'}
        </p>
        <p className="text-3xl font-bold text-text-primary leading-snug">{word.meaning}</p>
      </div>

      <div className="relative">
        <motion.input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => state === 'idle' && setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="日本語 — kanji, hiragana yoki katakana…"
          lang="ja"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          animate={state === 'wrong' ? { x: [-6, 6, -6, 0] } : {}}
          transition={{ duration: 0.3 }}
          className={cn(
            'input-field pr-12 text-base',
            state === 'correct' && 'border-success focus:border-success',
            state === 'wrong' && 'border-danger focus:border-danger',
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
              : <XCircle size={16} className="shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{state === 'correct' ? "To'g'ri!" : "Noto'g'ri"}</p>
              {/* Right or wrong, seeing the written form is the point. */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-text-muted">Javob:</span>
                <span className="text-text-primary font-bold text-lg">{word.japaneseWord}</span>
                {word.hiragana && word.hiragana !== word.japaneseWord && (
                  <span className="text-primary/80">({word.hiragana})</span>
                )}
                <button
                  onClick={() => speak(word)}
                  title="Talaffuzni eshitish"
                  className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-primary transition-colors"
                >
                  <Volume2 size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MATCH round — pairs, three lives, all-or-nothing ────────────────────────

interface Tile {
  id: string;
  text: string;
  wordId: string;
  side: 'jp' | 'uz';
  matched: boolean;
}

/**
 * Lives are per round here, not per run.
 *
 * Spending all three means the round is a miss: every word in it is submitted
 * blank, which the server always grades as wrong. Pairs the player did get
 * right are deliberately thrown away with the rest — the round is the unit.
 */
function MatchRound({ words, onDone }: { words: SessionWord[]; onDone: RoundDone }) {
  const delay = useSafeTimeout();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [lives, setLives] = useState(MATCH_LIVES);
  const [failed, setFailed] = useState(false);
  const solved = useRef<GameAnswer[]>([]);
  const busy = useRef(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    setTiles([
      ...shuffle(words).map<Tile>((w) => ({
        id: `jp-${w.id}`,
        text: w.hiragana && w.hiragana !== w.japaneseWord
          ? `${w.japaneseWord} (${w.hiragana})`
          : w.japaneseWord,
        wordId: w.id,
        side: 'jp',
        matched: false,
      })),
      ...shuffle(words).map<Tile>((w) => ({
        id: `uz-${w.id}`,
        text: w.meaning,
        wordId: w.id,
        side: 'uz',
        matched: false,
      })),
    ]);
  }, [words]);

  const finishAsMiss = useCallback(() => {
    setFailed(true);
    // A blank answer is always wrong server-side — that is what makes the
    // already-matched pairs in this round count for nothing.
    const blanks: GameAnswer[] = words.map((w) => ({
      wordId: w.id,
      answer: '',
      timeMs: Date.now() - startedAt.current,
    }));
    delay(() => onDone(blanks, false), 1400);
  }, [words, onDone, delay]);

  const handleSelect = (tile: Tile) => {
    if (busy.current || tile.matched || failed) return;

    if (!selected || selected.side === tile.side) {
      setSelected(tile);
      return;
    }

    const timeMs = Date.now() - startedAt.current;

    if (selected.wordId === tile.wordId) {
      busy.current = true;
      setTiles((prev) =>
        prev.map((t) => (t.wordId === tile.wordId ? { ...t, matched: true } : t)),
      );
      setSelected(null);
      solved.current = [
        ...solved.current,
        {
          wordId: tile.wordId,
          answer: tile.side === 'uz' ? tile.text : selected.text,
          timeMs,
        },
      ];

      const cleared = solved.current.length >= words.length;
      delay(() => {
        busy.current = false;
        if (cleared) onDone(solved.current, true);
      }, 320);
      return;
    }

    // Wrong pair — flash, deselect, spend a life.
    busy.current = true;
    setWrongPair([selected.id, tile.id]);
    const remaining = lives - 1;
    setLives(remaining);

    delay(() => {
      setWrongPair(null);
      setSelected(null);
      busy.current = false;
      if (remaining <= 0) finishAsMiss();
    }, 600);
  };

  const jpTiles = tiles.filter((t) => t.side === 'jp');
  const uzTiles = tiles.filter((t) => t.side === 'uz');

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-text-muted">
          {"So'zni bosing, keyin uning ma'nosini bosing."}
        </p>
        <div className="flex items-center gap-1 shrink-0 bg-surface/40 px-3 py-1.5 rounded-full border border-border">
          {Array.from({ length: MATCH_LIVES }).map((_, i) => (
            <Heart
              key={i}
              size={15}
              className={cn(
                'transition-all duration-300',
                i < lives ? 'text-red-500 fill-red-500' : 'text-text-muted opacity-20 scale-75',
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {failed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-semibold text-center"
          >
            {"Jonlar tugadi — bu raund hisobga olinmaydi."}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn('grid grid-cols-2 gap-3 transition-opacity', failed && 'opacity-40')}>
        <div className="space-y-2">
          {jpTiles.map((tile) => (
            <MatchTile
              key={tile.id}
              tile={tile}
              isSelected={selected?.id === tile.id}
              isWrong={wrongPair?.includes(tile.id) ?? false}
              onClick={() => handleSelect(tile)}
            />
          ))}
        </div>
        <div className="space-y-2">
          {uzTiles.map((tile) => (
            <MatchTile
              key={tile.id}
              tile={tile}
              isSelected={selected?.id === tile.id}
              isWrong={wrongPair?.includes(tile.id) ?? false}
              onClick={() => handleSelect(tile)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchTile({
  tile, isSelected, isWrong, onClick,
}: {
  tile: Tile;
  isSelected: boolean;
  isWrong: boolean;
  onClick: () => void;
}) {
  return (
    <AnimatePresence>
      {!tile.matched && (
        <motion.button
          layout
          exit={{ opacity: 0, scale: 0.8 }}
          whileTap={{ scale: 0.96 }}
          animate={isWrong ? { x: [-6, 6, -6, 0] } : {}}
          transition={{ duration: 0.3 }}
          onClick={onClick}
          className={cn(
            'w-full px-3 py-3 rounded-xl border text-sm font-medium text-left transition-all duration-150',
            isWrong
              ? 'bg-danger/20 border-danger text-danger'
              : isSelected
                ? 'bg-primary/20 border-primary text-primary shadow-glow-sm'
                : 'bg-surface/60 border-border text-text-secondary hover:border-primary/50 hover:text-text-primary',
          )}
        >
          {tile.text}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
