'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeTimeout } from '@/hooks/useSafeTimeout';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GRID,
  SHAPE_COLORS,
  canPlace,
  comboMultiplier,
  emptyGrid,
  filledCount,
  fitsAnywhere,
  isGameOver,
  place,
  randomTray,
  shapeSize,
  type Grid,
  type Shape,
} from '@/lib/blockPuzzle';
import {
  isMuted,
  setMuted,
  sfxClear,
  sfxCorrect,
  sfxDenied,
  sfxGameOver,
  sfxPick,
  sfxPlace,
  sfxWrong,
  startMusic,
  stopMusic,
  unlockAudio,
} from '@/lib/gameAudio';
import { BlockQuestion, buildQuestion, type AskedQuestion } from './BlockQuestion';
import type { GameSession, GameAnswer } from '@/lib/types';

/** Swaps a player gets per run before the button locks. */
const MAX_SKIPS = 3;

export interface BlockStats {
  score: number;
  lines: number;
  placed: number;
  bestCombo: number;
  perfectClears: number;
  questionsCorrect: number;
  questionsWrong: number;
  prevHighScore: number;
  isNewHighScore: boolean;
}

const bestKey = (userId?: string) => `vocabjp:blocks:best:${userId ?? 'guest'}`;

/** A "+120" that floats up from where the points were earned. */
interface Popup { id: number; text: string; accent: boolean }

interface BlockBlastGameProps {
  session: GameSession;
  userId?: string;
  onComplete: (answers: GameAnswer[], stats: BlockStats) => void;
}

type Phase = 'playing' | 'question' | 'over';

export function BlockBlastGame({ session, userId, onComplete }: BlockBlastGameProps) {
  const delay = useSafeTimeout();
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [tray, setTray] = useState<Shape[]>(() => randomTray(3));
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [perfectClears, setPerfectClears] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [muted, setMutedState] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);

  // Question gate
  const [question, setQuestion] = useState<AskedQuestion | null>(null);
  const [skipsLeft, setSkipsLeft] = useState(MAX_SKIPS);
  const askedRef = useRef(0);
  const answersRef = useRef<GameAnswer[]>([]);
  const qStatsRef = useRef({ correct: 0, wrong: 0 });
  const popupId = useRef(0);

  // Drag state — `pointer` drives the floating piece that follows the cursor.
  const [dragging, setDragging] = useState<{ shape: Shape; index: number; dx: number; dy: number } | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(40);

  const [clearing, setClearing] = useState<Set<string>>(new Set());

  // ── Audio lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    setMutedState(isMuted());
    return () => stopMusic();
  }, []);

  useEffect(() => {
    if (phase === 'over') stopMusic();
  }, [phase]);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    if (!next) { unlockAudio(); startMusic(); }
  };

  /** Keeps the floating piece the same size as the board's cells. */
  useEffect(() => {
    const measure = () => {
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      // 8 cells plus the 1px gaps between them and the 2px padding either side.
      setCellPx((rect.width - 16 - (GRID - 1) * 4) / GRID);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const addPopup = useCallback((text: string, accent = false) => {
    const id = ++popupId.current;
    setPopups((p) => [...p, { id, text, accent }]);
    delay(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  }, [delay]);

  // ── Question flow ────────────────────────────────────────────────────────

  const nextQuestion = useCallback(() => {
    const idx = askedRef.current % session.words.length;
    askedRef.current += 1;
    setQuestion(buildQuestion(session.words, idx));
  }, [session.words]);

  const handleAnswer = useCallback((raw: string, correct: boolean) => {
    if (question) {
      answersRef.current.push({ wordId: question.word.id, answer: correct ? raw : '', timeMs: 1000 });
    }
    if (correct) {
      sfxCorrect();
      qStatsRef.current.correct += 1;
      setTray(randomTray(3));
      setQuestion(null);
      setPhase('playing');
    } else {
      // A wrong answer does not hand over the pieces — a fresh question comes
      // up instead, so the only way forward is to get one right.
      sfxWrong();
      qStatsRef.current.wrong += 1;
      nextQuestion();
    }
  }, [question, nextQuestion]);

  const handleSkip = useCallback(() => {
    if (skipsLeft <= 0) return;
    setSkipsLeft((n) => n - 1);
    nextQuestion();
  }, [skipsLeft, nextQuestion]);

  // ── Finish ───────────────────────────────────────────────────────────────

  const finish = useCallback((finalScore: number) => {
    sfxGameOver();
    stopMusic();

    let prevHighScore = 0;
    try {
      const raw = localStorage.getItem(bestKey(userId));
      if (raw) prevHighScore = JSON.parse(raw)?.score ?? 0;
    } catch { /* no readable best */ }

    const isNewHighScore = finalScore > prevHighScore;
    try {
      localStorage.setItem(bestKey(userId), JSON.stringify({
        score: Math.max(prevHighScore, finalScore),
      }));
    } catch { /* ignore */ }

    setPhase('over');
    delay(() => {
      onComplete(answersRef.current, {
        score: finalScore,
        lines,
        placed,
        bestCombo,
        perfectClears,
        questionsCorrect: qStatsRef.current.correct,
        questionsWrong: qStatsRef.current.wrong,
        prevHighScore,
        isNewHighScore,
      });
    }, 700);
  }, [userId, lines, placed, bestCombo, perfectClears, onComplete, delay]);

  // ── Placement ────────────────────────────────────────────────────────────

  const commitPlacement = useCallback((shape: Shape, index: number, row: number, col: number) => {
    if (!canPlace(grid, shape, row, col)) { sfxDenied(); return false; }

    const result = place(grid, shape, row, col, combo);
    const clearedCount = result.clearedRows.length + result.clearedCols.length;

    if (clearedCount > 0) {
      sfxClear(clearedCount);
      const marks = new Set<string>();
      for (const r of result.clearedRows) for (let c = 0; c < GRID; c++) marks.add(`${r}:${c}`);
      for (const c of result.clearedCols) for (let r = 0; r < GRID; r++) marks.add(`${r}:${c}`);
      setClearing(marks);
      delay(() => setClearing(new Set()), 260);

      addPopup(`+${result.points}`, true);
      if (result.breakdown.comboMultiplier > 1) {
        addPopup(`${result.breakdown.comboMultiplier.toFixed(1)}x kombo`, true);
      }
      if (result.breakdown.perfectClear) addPopup('TOZA TAXTA! +150', true);
    } else {
      sfxPlace();
      addPopup(`+${result.points}`);
    }

    setGrid(result.grid);
    setScore((s) => s + result.points);
    setLines((l) => l + clearedCount);
    setPlaced((p) => p + 1);
    setCombo(result.nextCombo);
    setBestCombo((b) => Math.max(b, result.nextCombo));
    if (result.breakdown.perfectClear) setPerfectClears((n) => n + 1);

    const nextTray = tray.filter((_, i) => i !== index);
    setTray(nextTray);

    // Tray empty → a question stands between the player and the next three
    // pieces. The very first tray is free, which is why this only fires once
    // a tray has actually been used up.
    if (nextTray.length === 0) {
      setPhase('question');
      nextQuestion();
    } else if (isGameOver(result.grid, nextTray)) {
      finish(score + result.points);
    }

    return true;
  }, [grid, tray, score, combo, nextQuestion, finish, addPopup, delay]);

  // ── Pointer drag ─────────────────────────────────────────────────────────

  /**
   * Maps a pointer position to a board cell.
   *
   * The piece is anchored by the cell the player grabbed (`dx`/`dy`), and the
   * whole thing is lifted a little above the finger so a thumb does not cover
   * the landing spot on a phone.
   */
  const cellFromPoint = useCallback((clientX: number, clientY: number, dx: number, dy: number) => {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const step = cellPx + 4;
    const localX = clientX - rect.left - 8;
    const localY = clientY - rect.top - 8 - LIFT;
    return {
      row: Math.round(localY / step - dy),
      col: Math.round(localX / step - dx),
    };
  }, [cellPx]);

  const beginDrag = (shape: Shape, index: number) => (e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    e.preventDefault();
    unlockAudio();
    if (!isMuted()) startMusic();
    sfxPick();

    // Work out which cell of the piece was grabbed, so it keeps its offset.
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const { rows, cols } = shapeSize(shape);
    const trayCell = rect.width / cols;
    const dx = Math.floor((e.clientX - rect.left) / trayCell);
    const dy = Math.floor((e.clientY - rect.top) / (rect.height / rows));

    // Capture keeps the drag alive when the pointer leaves the tray tile, but
    // it throws if the browser has no active pointer with this id. That must
    // never abort the drag itself, so it is best-effort.
    try { target.setPointerCapture?.(e.pointerId); } catch { /* drag still works */ }

    setDragging({ shape, index, dx, dy });
    setPointer({ x: e.clientX, y: e.clientY });
    setHover(cellFromPoint(e.clientX, e.clientY, dx, dy));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPointer({ x: e.clientX, y: e.clientY });
    setHover(cellFromPoint(e.clientX, e.clientY, dragging.dx, dragging.dy));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const spot = cellFromPoint(e.clientX, e.clientY, dragging.dx, dragging.dy);
    if (spot) commitPlacement(dragging.shape, dragging.index, spot.row, spot.col);
    setDragging(null);
    setPointer(null);
    setHover(null);
  };

  /** Cells the dragged piece would occupy, and whether that placement is legal. */
  const preview = useMemo(() => {
    if (!dragging || !hover) return null;
    const ok = canPlace(grid, dragging.shape, hover.row, hover.col);
    const cells = new Set(dragging.shape.cells.map((c) => `${hover.row + c.r}:${hover.col + c.c}`));
    return { cells, ok };
  }, [dragging, hover, grid]);

  // Game over can also arrive without placing — e.g. a fresh tray that fits
  // nowhere on a crowded board.
  useEffect(() => {
    if (phase === 'playing' && tray.length > 0 && isGameOver(grid, tray)) finish(score);
  }, [phase, grid, tray, score, finish]);

  const fillPct = Math.round((filledCount(grid) / (GRID * GRID)) * 100);

  return (
    <div
      className="w-full select-none"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={() => { setDragging(null); setPointer(null); setHover(null); }}
    >
      <div className="flex justify-center">
        {/* ── Board column ─────────────────────────────────────────────── */}
        <div className="space-y-3 w-full max-w-[26rem]">

          {/* HUD */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2 relative">
              <span className="text-3xl font-black text-accent tabular-nums">{score}</span>
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">ball</span>

              {/* Floating point popups */}
              <div className="absolute left-0 -top-1 pointer-events-none">
                {popups.map((p, i) => (
                  <span
                    key={p.id}
                    className={cn(
                      'absolute whitespace-nowrap text-sm font-black animate-float-up',
                      p.accent ? 'text-accent' : 'text-success',
                    )}
                    style={{ top: `${-i * 18}px` }}
                  >
                    {p.text}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-text-muted">
              {combo > 1 && (
                <span className="font-black text-primary tabular-nums">
                  🔥 {comboMultiplier(combo).toFixed(1)}x
                </span>
              )}
              <span className="tabular-nums">🧹 {lines}</span>
              <span className={cn('tabular-nums', fillPct > 75 && 'text-danger font-bold')}>
                {fillPct}%
              </span>
              <button
                onClick={toggleMute}
                title={muted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
                className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-primary transition-colors"
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>

          {/* Board */}
          <div
            ref={boardRef}
            className="grid gap-1 p-2 rounded-2xl bg-surface-2/40 border border-border/60 touch-none"
            style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
          >
            {grid.map((row, r) =>
              row.map((value, c) => {
                const key = `${r}:${c}`;
                const inPreview = preview?.cells.has(key) ?? false;
                const isClearing = clearing.has(key);

                return (
                  <div
                    key={key}
                    className={cn(
                      'aspect-square rounded-[5px] transition-all duration-150',
                      value === null && !inPreview && 'bg-surface/70',
                      inPreview && !preview!.ok && 'ring-2 ring-danger',
                      isClearing && 'scale-110 brightness-150',
                    )}
                    style={
                      value !== null
                        ? { background: SHAPE_COLORS[value] }
                        : inPreview && preview!.ok && dragging
                          ? { background: SHAPE_COLORS[dragging.shape.color], opacity: 0.35 }
                          : undefined
                    }
                  />
                );
              }),
            )}
          </div>

          {/* Tray */}
          <div className="grid grid-cols-3 gap-3 min-h-[104px]">
            {tray.map((shape, index) => {
              const { rows, cols } = shapeSize(shape);
              const isDragged = dragging?.index === index;
              const usable = fitsAnywhere(grid, shape);

              return (
                <div
                  key={shape.id}
                  onPointerDown={beginDrag(shape, index)}
                  className={cn(
                    'flex items-center justify-center p-3 rounded-xl border touch-none transition-all',
                    'bg-surface-2/30 border-border/50',
                    phase === 'playing' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                    isDragged && 'opacity-25 scale-95',
                    !usable && !isDragged && 'opacity-40 grayscale',
                  )}
                  title={usable ? undefined : "Bu shakl hech qayerga sig'maydi"}
                >
                  <div
                    className="grid gap-[3px]"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      gridTemplateRows: `repeat(${rows}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: rows * cols }).map((_, i) => {
                      const r = Math.floor(i / cols), c = i % cols;
                      const filled = shape.cells.some((x) => x.r === r && x.c === c);
                      return (
                        <div
                          key={i}
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded-[4px]"
                          style={filled ? { background: SHAPE_COLORS[shape.color] } : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-text-muted">
            {"Shakllarni tarmoqqa sudrab tashlang — qator yoki ustun to'lsa tozalanadi."}
          </p>
        </div>
      </div>

      {/*
        The question floats over the board rather than occupying a column of
        its own. Being `fixed`, it is outside the document flow, so the board
        keeps its exact position while a question is up. No backdrop dismiss:
        answering (or swapping) is the only way past it.
      */}
      {phase === 'question' && question && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4
                        bg-background/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg">
            <BlockQuestion
              question={question}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
              skipsLeft={skipsLeft}
            />
          </div>
        </div>
      )}

      {/*
        The piece being dragged. Rendered at board-cell size and pinned to the
        pointer so it reads as one object being carried, rather than the tray
        item dimming while a separate outline appears on the grid.
      */}
      {dragging && pointer && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: pointer.x,
            top: pointer.y - LIFT,
            transform: `translate(${-(dragging.dx + 0.5) * (cellPx + 4)}px, ${-(dragging.dy + 0.5) * (cellPx + 4)}px)`,
          }}
        >
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${shapeSize(dragging.shape).cols}, ${cellPx}px)`,
              gridTemplateRows: `repeat(${shapeSize(dragging.shape).rows}, ${cellPx}px)`,
            }}
          >
            {Array.from({
              length: shapeSize(dragging.shape).rows * shapeSize(dragging.shape).cols,
            }).map((_, i) => {
              const cols = shapeSize(dragging.shape).cols;
              const r = Math.floor(i / cols), c = i % cols;
              const filled = dragging.shape.cells.some((x) => x.r === r && x.c === c);
              return (
                <div
                  key={i}
                  className="rounded-[5px]"
                  style={filled ? {
                    background: SHAPE_COLORS[dragging.shape.color],
                    boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                  } : undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** How far above the pointer the carried piece floats, in px. */
const LIFT = 46;
