'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeTimeout } from '@/hooks/useSafeTimeout';
import { useAuth } from '@/context/AuthContext';
import {
  MAX_MULTIPLIER,
  XP_PER_LEVEL,
  XP_PER_PLANET,
  applyCorrect,
  applyWrong,
  initialArcadeState,
  multiplierFor,
  type ArcadeState,
} from '@/lib/shooterRules';
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
  flash:      'none' | 'correct' | 'wrong' | 'reveal';
  flashTimer: number;
  cleared:    boolean;
  particles:  Particle[];
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Star = { x: number; y: number; r: number; opacity: number };

/** Floating "+7 XP" text that drifts up from a destroyed planet. */
type FloatText = { x: number; y: number; life: number; text: string; color: string };

export interface ArcadeStats {
  scoreXp: number;
  level: number;
  levelXp: number;
  bestStreak: number;
  waves: number;
  correct: number;
  wrong: number;
  /** Personal bests *before* this run, so the results screen can celebrate. */
  prevHighScore: number;
  prevHighestLevel: number;
  isNewHighScore: boolean;
  isNewHighestLevel: boolean;
}

const COLORS = {
  bg:        '#161514',
  surface:   '#1f1d1c',
  border:    '#3a3532',
  primary:   '#e83929',
  success:   '#2d7a47',
  danger:    '#c0392b',
  text:      '#faf9f6',
  textMuted: '#b3aba2',
  accent:    '#f2a900',
};

// ─── Arcade tuning that belongs to the presentation layer ────────────────────
// Scoring itself lives in lib/shooterRules.ts.

const MAX_LIVES = 3;
const REVEAL_FRAMES = 70;
/** Level-up flash duration, in ms. */
const LEVELUP_MS = 1400;

const bestKey = (userId?: string) => `vocabjp:shooter:best:${userId ?? 'guest'}`;

interface ShooterCanvasProps {
  session:    GameSession;
  onComplete: (answers: GameAnswer[], stats: ArcadeStats) => void;
}

export function ShooterCanvas({ session, onComplete }: ShooterCanvasProps) {
  const delay = useSafeTimeout();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gameRef = useRef<{
    asteroids: Asteroid[];
    stars:     Star[];
    floats:    FloatText[];
    targetIdx: number;
    wave:      number;
    /** Score, level and streak — see lib/shooterRules.ts. */
    arcade:    ArcadeState;
    correct:   number;
    wrong:     number;
    lives:     number;
    /** Last outcome per word, used to build the submission payload. */
    outcomes:  Map<string, boolean>;
    levelUpAt: number;
    levelUpTo: number;
    done:      boolean;
    roundStart: number;
  } | null>(null);

  const rafRef  = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const uiTickRef = useRef(0);

  const [ui, setUi] = useState({
    scoreXp: 0,
    level: 1,
    levelProgress: 0,
    streak: 0,
    multiplier: 1,
    lives: MAX_LIVES,
    wave: 1,
    targetMeaning: '',
    levelUpTo: 0,
  });
  const [done, setDone] = useState(false);

  // ── Wave spawning ────────────────────────────────────────────────────────

  /**
   * Lays out a fresh wave of planets.
   *
   * Grid cells are dealt out shuffled and independently of the answer order:
   * filling them in sequence put the first target top-left, the next beside
   * it and so on, so sweeping the canvas walked the answers without reading.
   */
  const buildWave = useCallback((W: number, H: number): Asteroid[] => {
    const words = [...session.words].sort(() => Math.random() - 0.5);

    const cols  = Math.ceil(Math.sqrt(words.length));
    const rows  = Math.ceil(words.length / cols);
    const padX  = 70;
    const topY  = 70;
    const botY  = H - 40;
    const cellW = (W - padX * 2) / cols;
    const cellH = (botY - topY) / rows;
    const radius = Math.max(32, Math.min(48, Math.min(cellW, cellH) / 2 - 6));

    const cells = Array.from({ length: words.length }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    return words.map((word, i) => {
      const cell = cells[i];
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      const speed = 0.25 + Math.random() * 0.3;
      const angle = Math.random() * Math.PI * 2;

      return {
        id: `${word.id}-${Math.random().toString(36).slice(2, 7)}`,
        word,
        x: padX + col * cellW + cellW / 2 + (Math.random() - 0.5) * 10,
        y: topY + row * cellH + cellH / 2 + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius,
        flash: 'none' as const,
        flashTimer: 0,
        cleared: false,
        particles: [],
      };
    });
  }, [session]);

  const explode = (ast: Asteroid, palette: string[]) => {
    ast.cleared = true;
    for (let p = 0; p < 18; p++) {
      const angle = (p / 18) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      ast.particles.push({
        x: ast.x, y: ast.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1,
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }
  };

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;

    const stars: Star[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.7 + 0.2,
    }));

    const asteroids = buildWave(W, H);

    gameRef.current = {
      asteroids,
      stars,
      floats: [],
      targetIdx: 0,
      wave: 1,
      arcade: initialArcadeState(),
      correct: 0,
      wrong: 0,
      lives: MAX_LIVES,
      outcomes: new Map(),
      levelUpAt: 0,
      levelUpTo: 0,
      done: false,
      roundStart: Date.now(),
    };

    setUi({
      scoreXp: 0, level: 1, levelProgress: 0, streak: 0, multiplier: 1,
      lives: MAX_LIVES, wave: 1,
      targetMeaning: asteroids[0]?.word.meaning ?? '',
      levelUpTo: 0,
    });
  }, [buildWave]);

  const syncUi = (g: NonNullable<typeof gameRef.current>) => {
    setUi({
      scoreXp: g.arcade.scoreXp,
      level: g.arcade.level,
      levelProgress: g.arcade.levelXp % XP_PER_LEVEL,
      streak: g.arcade.streak,
      multiplier: multiplierFor(g.arcade.streak),
      lives: g.lives,
      wave: g.wave,
      targetMeaning: g.asteroids[g.targetIdx]?.word.meaning ?? '',
      levelUpTo: g.levelUpTo,
    });
  };

  const finish = useCallback((g: NonNullable<typeof gameRef.current>) => {
    if (g.done) return;
    g.done = true;

    // One answer per distinct word — its most recent outcome. Endless waves
    // would otherwise pile up hundreds of entries for the same handful of ids.
    const answers: GameAnswer[] = [];
    for (const word of session.words) {
      const ok = g.outcomes.get(word.id);
      if (ok === undefined) continue;
      answers.push({ wordId: word.id, answer: ok ? word.meaning : '', timeMs: 1000 });
    }

    // Personal bests live in localStorage: this is an arcade score, not
    // progress the server tracks, and it stays per-account on the device.
    let prevHighScore = 0, prevHighestLevel = 1;
    try {
      const raw = localStorage.getItem(bestKey(user?.id));
      if (raw) {
        const parsed = JSON.parse(raw) as { scoreXp?: number; level?: number };
        prevHighScore = parsed.scoreXp ?? 0;
        prevHighestLevel = parsed.level ?? 1;
      }
    } catch { /* unreadable storage just means no previous best */ }

    const isNewHighScore = g.arcade.scoreXp > prevHighScore;
    const isNewHighestLevel = g.arcade.level > prevHighestLevel;

    try {
      localStorage.setItem(bestKey(user?.id), JSON.stringify({
        scoreXp: Math.max(prevHighScore, g.arcade.scoreXp),
        level: Math.max(prevHighestLevel, g.arcade.level),
      }));
    } catch { /* ignore */ }

    const stats: ArcadeStats = {
      scoreXp: g.arcade.scoreXp,
      level: g.arcade.level,
      levelXp: g.arcade.levelXp,
      bestStreak: g.arcade.bestStreak,
      waves: g.wave,
      correct: g.correct,
      wrong: g.wrong,
      prevHighScore,
      prevHighestLevel,
      isNewHighScore,
      isNewHighestLevel,
    };

    delay(() => { setDone(true); completeRef.current(answers, stats); }, 700);
  }, [session, user, delay]);

  // ── Pointer handler ──────────────────────────────────────────────────────
  const handlePointer = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    const canvas = canvasRef.current;
    if (!g || !canvas || g.done) return;
    // Ignore taps during the level-up flash — every planet is already blowing up.
    if (g.levelUpAt && Date.now() - g.levelUpAt < LEVELUP_MS) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const target = g.asteroids[g.targetIdx];
    if (!target) return;

    for (const ast of g.asteroids) {
      if (ast.cleared) continue;
      const dx = mx - ast.x, dy = my - ast.y;
      if (dx * dx + dy * dy > ast.radius * ast.radius) continue;

      if (ast.word.id === target.word.id) {
        ast.flash = 'correct';
        ast.flashTimer = 8;
        explode(ast, [COLORS.success, COLORS.accent, '#d82f25', '#3d8b5a']);

        // The hit planet is already cleared, so it is not part of the
        // level-up detonation — count what is still standing behind it.
        const remaining = g.asteroids.filter((a) => !a.cleared);
        const outcome = applyCorrect(g.arcade, remaining.length);
        g.arcade = outcome.next;

        g.floats.push({ x: ast.x, y: ast.y, life: 1, text: `+${outcome.gain}`, color: COLORS.accent });
        g.correct++;
        g.outcomes.set(ast.word.id, true);
        g.roundStart = Date.now();

        if (outcome.leveledUpTo !== null) {
          for (const a of remaining) {
            explode(a, [COLORS.accent, '#ffd76a', COLORS.primary, COLORS.text]);
            g.floats.push({ x: a.x, y: a.y, life: 1, text: `+${XP_PER_PLANET}`, color: COLORS.accent });
          }
          g.levelUpAt = Date.now();
          g.levelUpTo = outcome.leveledUpTo;
          g.targetIdx = g.asteroids.length; // wave is spent; loop respawns it
        } else {
          g.targetIdx += 1;
        }

        syncUi(g);
      } else {
        ast.flash = 'wrong';
        ast.flashTimer = 14;
        target.flash = 'reveal';
        target.flashTimer = REVEAL_FRAMES;

        g.wrong++;
        g.arcade = applyWrong(g.arcade);
        g.lives -= 1;
        g.outcomes.set(target.word.id, false);
        syncUi(g);

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
    if (g.done) { rafRef.current = requestAnimationFrame(loop); return; }

    const dt = Math.min(ts - lastRef.current, 50);
    lastRef.current = ts;

    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d')!;
    const levelUpActive = g.levelUpAt > 0 && Date.now() - g.levelUpAt < LEVELUP_MS;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    for (const s of g.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,255,${s.opacity})`;
      ctx.fill();
    }

    // Endless: once the wave is spent (and any level-up flash has played out),
    // roll a fresh one instead of ending the run.
    const anyAlive = g.asteroids.some((a) => !a.cleared);
    if (!anyAlive && !levelUpActive) {
      const settled = g.asteroids.every((a) => a.particles.length === 0);
      if (settled) {
        g.asteroids = buildWave(W, H);
        g.targetIdx = 0;
        g.wave += 1;
        g.levelUpAt = 0;
        g.roundStart = Date.now();
        syncUi(g);
      }
    }

    const live = g.asteroids.filter((a) => !a.cleared);
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
      if (ast.x - ast.radius < 0)      { ast.x = ast.radius;          ast.vx = Math.abs(ast.vx); }
      if (ast.x + ast.radius > W)      { ast.x = W - ast.radius;      ast.vx = -Math.abs(ast.vx); }
      if (ast.y - ast.radius < 50)     { ast.y = 50 + ast.radius;     ast.vy = Math.abs(ast.vy); }
      if (ast.y + ast.radius > H - 20) { ast.y = H - 20 - ast.radius; ast.vy = -Math.abs(ast.vy); }

      if (ast.flashTimer > 0) ast.flashTimer--;
      else ast.flash = 'none';

      // Every planet is drawn identically — the target gets no tell.
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

    // Floating XP numbers
    for (const f of g.floats) {
      f.y -= 0.6 * (dt / 16);
      f.life -= 0.018 * (dt / 16);
    }
    g.floats = g.floats.filter((f) => f.life > 0);
    for (const f of g.floats) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    // Level-up flash
    if (levelUpActive) {
      const t = (Date.now() - g.levelUpAt) / LEVELUP_MS;
      const fade = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      ctx.globalAlpha = Math.max(0, fade) * 0.5;
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${g.levelUpTo}-DARAJA`, W / 2, H / 2 - 12);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = COLORS.accent;
      ctx.fillText('Barcha sayyoralar portladi!', W / 2, H / 2 + 24);
      ctx.globalAlpha = 1;
    }

    // Throttle React to ~5 updates/sec rather than one per frame.
    uiTickRef.current += dt;
    if (uiTickRef.current > 200) {
      uiTickRef.current = 0;
      const flashing = levelUpActive ? g.levelUpTo : 0;
      setUi((u) => (u.scoreXp === g.arcade.scoreXp && u.levelUpTo === flashing
        ? u
        : { ...u, scoreXp: g.arcade.scoreXp, levelUpTo: flashing }));
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [buildWave]);

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

  const progressPct = (ui.levelProgress / XP_PER_LEVEL) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      {/* ── Question ─────────────────────────────────────────────────────── */}
      <div className="card-glass px-5 py-4 text-center border-primary/30">
        <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1.5">
          {"Shu ma'nodagi sayyorani toping"}
        </p>
        <p className="text-xl sm:text-2xl font-black text-text-primary leading-snug">
          {ui.targetMeaning}
        </p>
      </div>

      {/* ── Level bar ────────────────────────────────────────────────────── */}
      <div className="card-glass px-4 py-3">
        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
          <span className="text-accent">{ui.level}-daraja</span>
          <span className="text-text-muted tabular-nums">
            {ui.levelProgress}/{XP_PER_LEVEL} XP
          </span>
        </div>
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── HUD ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-accent tabular-nums">
            ⚡ {ui.scoreXp} XP
          </span>
          <span
            className={`text-sm font-bold tabular-nums ${
              ui.multiplier >= MAX_MULTIPLIER ? 'text-accent'
              : ui.streak > 0 ? 'text-primary' : 'text-text-muted'
            }`}
            title={`${ui.streak} ta ketma-ket`}
          >
            🔥 {ui.multiplier.toFixed(1)}x
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted tabular-nums">{ui.wave}-to&rsquo;lqin</span>
          <span className="flex items-center gap-0.5" title={`${ui.lives} ta jon qoldi`}>
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={i < ui.lives ? 'opacity-100' : 'opacity-25 grayscale'}>
                ❤️
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
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
        {"Har bir topilgan sayyora "}
        <span className="text-accent">{XP_PER_PLANET} XP</span>
        {" — ketma-ket topsangiz ko‘paytirgich "}
        <span className="text-accent">{MAX_MULTIPLIER}x</span>
        {" gacha o‘sadi. "}
        <span className="text-danger">{"Xato — jon kamayadi."}</span>
      </p>
    </div>
  );
}
