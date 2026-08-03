'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameSession, GameAnswer, SessionWord } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Asteroid = {
  id:         string;
  word:       SessionWord;
  x:          number;
  y:          number;
  vx:         number;
  vy:         number;
  radius:     number;
  /** Frames left on a hit flash. */
  flash:      'none' | 'correct' | 'wrong' | 'reveal';
  flashTimer: number;
  cleared:    boolean;
  particles:  Particle[];
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Star = { x: number; y: number; r: number; opacity: number };

const COLORS = {
  bg:        '#161514',     // Sumi Black / Charcoal
  surface:   '#1f1d1c',     // Warm Dark Ash
  border:    '#3a3532',     // Warm Stone Border
  primary:   '#e83929',     // Shu-iro (Vermilion Red)
  success:   '#2d7a47',     // Matcha / Bamboo Green
  danger:    '#c0392b',     // Tsubaki / Camellia Red
  text:      '#faf9f6',     // Washi paper white
  textMuted: '#b3aba2',     // Golden sand grey
  accent:    '#f2a900',     // Yamabuki (Gold)
};

/** Seconds granted per word, and the floor for very short rounds. */
const SECONDS_PER_WORD = 6;
const MIN_SECONDS = 30;
const MAX_LIVES = 3;
/** How long the correct answer is revealed after a mistake, in frames @60fps. */
const REVEAL_FRAMES = 70;

interface ShooterCanvasProps {
  session:    GameSession;
  onComplete: (answers: GameAnswer[]) => void;
}

export function ShooterCanvas({ session, onComplete }: ShooterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    asteroids: Asteroid[];
    stars:     Star[];
    targetIdx: number;
    answers:   GameAnswer[];
    timeLeft:  number;
    totalTime: number;
    score:     number;
    lives:     number;
    done:      boolean;
    startedAt: number;
    roundStart: number;
  } | null>(null);

  const rafRef  = useRef<number>(0);
  const lastRef = useRef<number>(0);
  /** Keeps the loop free of changing deps so it never restarts mid-game. */
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  /** Throttles React updates — the previous version set state every frame. */
  const uiTickRef = useRef(0);

  const totalTime = Math.max(MIN_SECONDS, session.words.length * SECONDS_PER_WORD);

  const [ui, setUi] = useState({
    timeLeft: totalTime,
    score: 0,
    lives: MAX_LIVES,
    total: session.words.length,
    targetMeaning: '',
    targetIndex: 1,
  });
  const [done, setDone] = useState(false);

  // ── Build initial state ──────────────────────────────────────────────────
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;

    const words = [...session.words].sort(() => Math.random() - 0.5);

    const stars: Star[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.7 + 0.2,
    }));

    // Spread the asteroids over a grid, then let them drift from there so they
    // start apart rather than stacked on top of each other.
    const cols  = Math.ceil(Math.sqrt(words.length));
    const rows  = Math.ceil(words.length / cols);
    const padX  = 70;
    const topY  = 70;
    const botY  = H - 40;
    const cellW = (W - padX * 2) / cols;
    const cellH = (botY - topY) / rows;
    const radius = Math.max(34, Math.min(48, Math.min(cellW, cellH) / 2 - 6));

    // Grid cells are handed out in a shuffled order. Filling them in array
    // order put the first target top-left, the second next to it and so on —
    // so sweeping the canvas left-to-right walked the answers in sequence
    // without reading a single word.
    const cells = Array.from({ length: words.length }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const asteroids: Asteroid[] = words.map((word, i) => {
      const cell = cells[i];
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      const speed = 0.25 + Math.random() * 0.3;
      const angle = Math.random() * Math.PI * 2;

      return {
        id: word.id,
        word,
        x: padX + col * cellW + cellW / 2 + (Math.random() - 0.5) * 10,
        y: topY + row * cellH + cellH / 2 + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius,
        flash: 'none',
        flashTimer: 0,
        cleared: false,
        particles: [],
      };
    });

    gameRef.current = {
      asteroids,
      stars,
      targetIdx: 0,
      answers: [],
      timeLeft: totalTime,
      totalTime,
      score: 0,
      lives: MAX_LIVES,
      done: false,
      startedAt: Date.now(),
      roundStart: Date.now(),
    };

    setUi({
      timeLeft: totalTime,
      score: 0,
      lives: MAX_LIVES,
      total: words.length,
      targetMeaning: words[0]?.meaning ?? '',
      targetIndex: 1,
    });
  }, [session, totalTime]);

  const finish = useCallback((g: NonNullable<typeof gameRef.current>) => {
    if (g.done) return;
    g.done = true;
    // Anything never attempted counts as a miss, so accuracy reflects the
    // whole session rather than only the words the player got to.
    const answered = new Set(g.answers.map((a) => a.wordId));
    for (const ast of g.asteroids) {
      if (!answered.has(ast.word.id)) {
        g.answers.push({ wordId: ast.word.id, answer: '', timeMs: g.totalTime * 1000 });
      }
    }
    setTimeout(() => { setDone(true); completeRef.current(g.answers); }, 600);
  }, []);

  // ── Pointer handler (works for mouse and touch) ──────────────────────────
  const handlePointer = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || g.done) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const target = g.asteroids[g.targetIdx];
    if (!target) return;

    for (const ast of g.asteroids) {
      if (ast.cleared) continue;
      const dx = mx - ast.x, dy = my - ast.y;
      if (dx * dx + dy * dy > ast.radius * ast.radius) continue;

      const timeMs = Date.now() - g.roundStart;

      if (ast.word.id === target.word.id) {
        ast.flash = 'correct';
        ast.flashTimer = 8;
        ast.cleared = true;

        for (let p = 0; p < 18; p++) {
          const angle = (p / 18) * Math.PI * 2 + Math.random() * 0.3;
          const speed = 2 + Math.random() * 3;
          ast.particles.push({
            x: ast.x, y: ast.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 1,
            color: [COLORS.success, COLORS.accent, '#d82f25', '#3d8b5a'][Math.floor(Math.random() * 4)],
          });
        }

        g.answers.push({ wordId: ast.word.id, answer: ast.word.meaning, timeMs });
        g.score++;
        g.targetIdx += 1;
        g.roundStart = Date.now();

        if (g.targetIdx >= g.asteroids.length) {
          finish(g);
        } else {
          setUi((u) => ({
            ...u,
            score: g.score,
            targetMeaning: g.asteroids[g.targetIdx]?.word.meaning ?? '',
            targetIndex: g.targetIdx + 1,
          }));
        }
      } else {
        // Wrong pick: flag it, and briefly outline the one that was right —
        // seeing the correct pairing is the point of the drill.
        ast.flash = 'wrong';
        ast.flashTimer = 14;
        target.flash = 'reveal';
        target.flashTimer = REVEAL_FRAMES;

        g.answers.push({ wordId: target.word.id, answer: ast.word.meaning, timeMs });
        g.lives -= 1;
        setUi((u) => ({ ...u, lives: g.lives }));

        if (g.lives <= 0) finish(g);
      }
      break;
    }
  }, [finish]);

  // ── Game loop ────────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    const g = gameRef.current;
    const canvas = canvasRef.current;
    if (!g || !canvas) return;
    if (g.done) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const dt = Math.min(ts - lastRef.current, 50);
    lastRef.current = ts;

    const elapsed = (Date.now() - g.startedAt) / 1000;
    g.timeLeft = Math.max(0, g.totalTime - elapsed);
    if (g.timeLeft <= 0) { finish(g); return; }

    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    for (const s of g.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,255,${s.opacity})`;
      ctx.fill();
    }

    const live = g.asteroids.filter((a) => !a.cleared);

    // Keep asteroids from overlapping — unreadable text is the main way this
    // game got frustrating.
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = a.radius + b.radius + 6;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }

    for (const ast of g.asteroids) {
      if (ast.cleared) {
        for (const p of ast.particles) {
          p.x += p.vx * (dt / 16);
          p.y += p.vy * (dt / 16);
          p.vy += 0.08 * (dt / 16);
          p.life -= 0.025 * (dt / 16);
          if (p.life <= 0) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
          ctx.fill();
        }
        ast.particles = ast.particles.filter((p) => p.life > 0);
        continue;
      }

      ast.x += ast.vx * (dt / 16);
      ast.y += ast.vy * (dt / 16);
      if (ast.x - ast.radius < 0)       { ast.x = ast.radius;         ast.vx = Math.abs(ast.vx); }
      if (ast.x + ast.radius > W)       { ast.x = W - ast.radius;     ast.vx = -Math.abs(ast.vx); }
      if (ast.y - ast.radius < 50)      { ast.y = 50 + ast.radius;    ast.vy = Math.abs(ast.vy); }
      if (ast.y + ast.radius > H - 20)  { ast.y = H - 20 - ast.radius; ast.vy = -Math.abs(ast.vy); }

      if (ast.flashTimer > 0) ast.flashTimer--;
      else ast.flash = 'none';

      // NOTE: every asteroid is drawn identically. The old version gave the
      // target a red glow and even told the player "Glowing = target word",
      // so the round could be cleared without reading anything.
      ctx.beginPath();
      ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
      ctx.fillStyle =
        ast.flash === 'correct' ? `${COLORS.success}80`
        : ast.flash === 'wrong' ? `${COLORS.danger}80`
        : ast.flash === 'reveal' ? `${COLORS.accent}35`
        : `${COLORS.surface}dd`;
      ctx.fill();

      ctx.strokeStyle =
        ast.flash === 'correct' ? COLORS.success
        : ast.flash === 'wrong' ? COLORS.danger
        : ast.flash === 'reveal' ? COLORS.accent
        : COLORS.border;
      ctx.lineWidth = ast.flash === 'none' ? 1.5 : 2.5;
      ctx.stroke();

      const fontSize = ast.radius > 42 ? 17 : ast.radius > 36 ? 15 : 13;
      ctx.fillStyle = COLORS.text;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ast.word.japaneseWord, ast.x, ast.y - 7);

      if (ast.word.hiragana && ast.word.hiragana !== ast.word.japaneseWord) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = `${fontSize - 4}px sans-serif`;
        ctx.fillText(ast.word.hiragana, ast.x, ast.y + 11);
      }
    }

    // Timer bar
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, W, 5);
    ctx.fillStyle = g.timeLeft < g.totalTime * 0.25 ? COLORS.danger : COLORS.primary;
    ctx.fillRect(0, 0, W * (g.timeLeft / g.totalTime), 5);

    // Throttle React to ~5 updates/sec instead of 60 — the old code called
    // setUiState inside every frame, re-rendering the whole component 60x/sec.
    uiTickRef.current += dt;
    if (uiTickRef.current > 200) {
      uiTickRef.current = 0;
      const secs = Math.ceil(g.timeLeft);
      setUi((u) => (u.timeLeft === secs ? u : { ...u, timeLeft: secs }));
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [finish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    initGame();
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [initGame, loop]);

  // Keep the backing store in step with the element, without re-seeding the
  // round (resizing mid-game should not reshuffle the asteroids).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const lowTime = ui.timeLeft < Math.max(10, totalTime * 0.25);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      {/* ── The question, given the space it deserves ───────────────────── */}
      <div className="card-glass px-5 py-4 text-center border-primary/30">
        <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1.5">
          {"Shu ma'nodagi so'zni toping"}
        </p>
        <p className="text-xl sm:text-2xl font-black text-text-primary leading-snug">
          {ui.targetMeaning}
        </p>
      </div>

      {/* ── HUD ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold tabular-nums ${lowTime ? 'text-danger' : 'text-text-secondary'}`}>
            ⏱ {ui.timeLeft}s
          </span>
          <span className="text-sm font-bold text-accent tabular-nums">
            ⭐ {ui.score}/{ui.total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted tabular-nums">
            {ui.targetIndex}/{ui.total}
          </span>
          <span className="flex items-center gap-0.5" title={`${ui.lives} ta jon qoldi`}>
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={i < ui.lives ? 'opacity-100' : 'opacity-25 grayscale'}>
                ❤️
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-xl overflow-hidden border border-border"
           style={{ height: 'min(60vh, 480px)' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointer}
          className="w-full h-full cursor-crosshair block touch-none"
          style={{ background: COLORS.bg }}
        />
        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <p className="text-xl font-extrabold text-text-primary animate-pulse">
              {'Natijalar saqlanmoqda…'}
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-text-muted">
        {"Yuqoridagi ma'noga mos yaponcha so'zni bosing. "}
        <span className="text-danger">{"Xato bossangiz jon kamayadi"}</span>
        {" — to'g'ri javob bir lahza "}
        <span className="text-accent">{'oltin rangda'}</span>
        {' ko’rsatiladi.'}
      </p>
    </div>
  );
}
