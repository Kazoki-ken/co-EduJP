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
  flash:      'none' | 'correct' | 'wrong'; // frame-level flash state
  flashTimer: number;
  exploding:  boolean;
  explodeT:   number;    // 0→1 progress
  particles:  Particle[];
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

type Star = { x: number; y: number; r: number; opacity: number };

const COLORS = {
  bg:        '#0a0a1a',
  surface:   '#0f0f2a',
  border:    '#1e1e4a',
  primary:   '#6d28d9',
  success:   '#10b981',
  danger:    '#ef4444',
  text:      '#f0f0ff',
  textMuted: '#a0a0c0',
  accent:    '#f59e0b',
};

interface ShooterCanvasProps {
  session:    GameSession;
  onComplete: (answers: GameAnswer[]) => void;
}

export function ShooterCanvas({ session, onComplete }: ShooterCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const gameRef    = useRef<{
    asteroids: Asteroid[];
    stars:     Star[];
    targetIdx: number;
    answers:   GameAnswer[];
    timeLeft:  number;
    score:     number;
    done:      boolean;
    startedAt: number;
    roundStart: number;
  } | null>(null);

  const rafRef     = useRef<number>(0);
  const lastRef    = useRef<number>(0);
  const [uiState, setUiState] = useState<{
    timeLeft: number; score: number; total: number; targetMeaning: string;
  }>({ timeLeft: 60, score: 0, total: session.words.length, targetMeaning: '' });
  const [done, setDone] = useState(false);

  // ── Build initial state ──────────────────────────────────────────────────
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;

    const words = [...session.words].sort(() => Math.random() - 0.5);

    // Stars
    const stars: Star[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.7 + 0.2,
    }));

    // Asteroids — one per word
    const asteroids: Asteroid[] = words.map((word, i) => {
      const cols    = Math.ceil(Math.sqrt(words.length));
      const col     = i % cols;
      const row     = Math.floor(i / cols);
      const pad     = 100;
      const cellW   = (W - pad * 2) / cols;
      const cellH   = Math.min(180, (H - 200) / Math.ceil(words.length / cols));
      const radius  = 46;
      const speed   = 0.6 + Math.random() * 0.5;
      const angle   = Math.random() * Math.PI * 2;

      return {
        id:          word.id,
        word,
        x:           pad + col * cellW + cellW / 2,
        y:           120 + row * cellH + cellH / 2,
        vx:          Math.cos(angle) * speed,
        vy:          Math.sin(angle) * speed,
        radius,
        flash:       'none',
        flashTimer:  0,
        exploding:   false,
        explodeT:    0,
        particles:   [],
      };
    });

    gameRef.current = {
      asteroids,
      stars,
      targetIdx:  0,
      answers:    [],
      timeLeft:   60,
      score:      0,
      done:       false,
      startedAt:  Date.now(),
      roundStart: Date.now(),
    };

    setUiState({
      timeLeft:      60,
      score:         0,
      total:         words.length,
      targetMeaning: words[0]?.meaning ?? '',
    });
  }, [session]);

  // ── Click handler ────────────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || g.done) return;
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const mx     = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my     = (e.clientY - rect.top)  * (canvas.height / rect.height);

    const target = g.asteroids[g.targetIdx];
    if (!target) return;

    // Check which asteroid was clicked
    for (const ast of g.asteroids) {
      if (ast.exploding || ast.word.id === target.word.id && g.asteroids.indexOf(ast) !== g.targetIdx) continue;
      const dx   = mx - ast.x, dy = my - ast.y;
      const hit  = dx * dx + dy * dy <= ast.radius * ast.radius;
      if (!hit) continue;

      const timeMs = Date.now() - g.roundStart;

      if (ast.word.id === target.word.id) {
        // CORRECT
        ast.flash      = 'correct';
        ast.flashTimer = 8;
        ast.exploding  = true;
        ast.explodeT   = 0;

        // Spawn particles
        for (let p = 0; p < 18; p++) {
          const angle = (p / 18) * Math.PI * 2 + Math.random() * 0.3;
          const speed = 2 + Math.random() * 3;
          ast.particles.push({
            x: ast.x, y: ast.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 1,
            color: [COLORS.success, COLORS.accent, '#34d399', '#a78bfa'][Math.floor(Math.random() * 4)],
          });
        }

        g.answers.push({ wordId: ast.word.id, answer: ast.word.meaning, timeMs });
        g.score++;

        // Advance target
        const nextIdx = g.targetIdx + 1;
        g.targetIdx   = nextIdx;
        g.roundStart  = Date.now();

        if (nextIdx >= g.asteroids.length) {
          g.done = true;
          setTimeout(() => {
            setDone(true);
            onComplete(g.answers);
          }, 800);
        } else {
          setUiState((u) => ({
            ...u,
            score:         g.score,
            targetMeaning: g.asteroids[nextIdx]?.word.meaning ?? '',
          }));
        }
      } else {
        // WRONG
        ast.flash      = 'wrong';
        ast.flashTimer = 12;
        g.answers.push({ wordId: target.word.id, answer: ast.word.meaning, timeMs });
      }
      break;
    }
  }, [onComplete]);

  // ── Game loop ────────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    const g = gameRef.current;
    const canvas = canvasRef.current;
    if (!g || !canvas || g.done) return;

    const dt    = Math.min(ts - lastRef.current, 50);
    lastRef.current = ts;

    // Timer
    const elapsed   = (Date.now() - g.startedAt) / 1000;
    g.timeLeft      = Math.max(0, 60 - elapsed);

    if (g.timeLeft <= 0 && !g.done) {
      g.done = true;
      // Submit remaining unanswered as empty
      const answered = new Set(g.answers.map((a) => a.wordId));
      for (const ast of g.asteroids) {
        if (!answered.has(ast.word.id)) {
          g.answers.push({ wordId: ast.word.id, answer: '', timeMs: 60000 });
        }
      }
      setTimeout(() => { setDone(true); onComplete(g.answers); }, 200);
      return;
    }

    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    // ── Background ──────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of g.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,255,${s.opacity})`;
      ctx.fill();
    }

    // ── Asteroids ───────────────────────────────────────────────────────
    const target = g.asteroids[g.targetIdx];

    for (const ast of g.asteroids) {
      if (ast.exploding) {
        // Advance explosion
        ast.explodeT += dt / 400;

        // Update + draw particles
        for (const p of ast.particles) {
          p.x    += p.vx * (dt / 16);
          p.y    += p.vy * (dt / 16);
          p.vy   += 0.08 * (dt / 16);
          p.life -= 0.025 * (dt / 16);
          if (p.life <= 0) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
          ctx.fill();
        }
        ast.particles = ast.particles.filter((p) => p.life > 0);
        if (ast.explodeT >= 1) {
          // Remove from active rendering (keep in array for index integrity)
        }
        continue;
      }

      // Move
      ast.x  += ast.vx * (dt / 16);
      ast.y  += ast.vy * (dt / 16);
      if (ast.x - ast.radius < 0)   { ast.x  = ast.radius;     ast.vx = Math.abs(ast.vx); }
      if (ast.x + ast.radius > W)    { ast.x  = W - ast.radius; ast.vx = -Math.abs(ast.vx); }
      if (ast.y - ast.radius < 80)   { ast.y  = 80 + ast.radius; ast.vy = Math.abs(ast.vy); }
      if (ast.y + ast.radius > H - 60) { ast.y = H - 60 - ast.radius; ast.vy = -Math.abs(ast.vy); }

      // Flash timer
      if (ast.flashTimer > 0) ast.flashTimer--;
      else ast.flash = 'none';

      const isTarget = ast.word.id === target?.word.id;

      // Outer glow for target
      if (isTarget) {
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.radius + 8, 0, Math.PI * 2);
        const grd = ctx.createRadialGradient(ast.x, ast.y, ast.radius, ast.x, ast.y, ast.radius + 8);
        grd.addColorStop(0, `${COLORS.primary}60`);
        grd.addColorStop(1, `${COLORS.primary}00`);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Asteroid body
      ctx.beginPath();
      ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
      const bodyColor =
        ast.flash === 'correct' ? `${COLORS.success}80`
        : ast.flash === 'wrong' ? `${COLORS.danger}80`
        : isTarget              ? `${COLORS.primary}50`
        :                         `${COLORS.surface}cc`;
      ctx.fillStyle = bodyColor;
      ctx.fill();

      const borderColor =
        ast.flash === 'correct' ? COLORS.success
        : ast.flash === 'wrong' ? COLORS.danger
        : isTarget              ? COLORS.primary
        :                         COLORS.border;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth   = isTarget ? 2.5 : 1.5;
      ctx.stroke();

      // Japanese word text
      ctx.fillStyle   = isTarget ? COLORS.text : COLORS.textMuted;
      ctx.font        = `bold ${ast.radius > 40 ? 16 : 13}px sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ast.word.japaneseWord, ast.x, ast.y - 6);

      // Hiragana below
      ctx.fillStyle  = isTarget ? `${COLORS.primary}` : COLORS.textMuted;
      ctx.font       = `12px sans-serif`;
      ctx.fillText(ast.word.hiragana, ast.x, ast.y + 10);
    }

    // ── HUD ─────────────────────────────────────────────────────────────
    // Timer bar at top
    const timerFrac = g.timeLeft / 60;
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = g.timeLeft < 15 ? COLORS.danger : COLORS.primary;
    ctx.fillRect(0, 0, W * timerFrac, 6);

    // Update UI state every ~10 frames
    setUiState((prev) => ({
      ...prev,
      timeLeft: Math.ceil(g.timeLeft),
      score:    g.score,
    }));

    rafRef.current = requestAnimationFrame(loop);
  }, [onComplete]);

  useEffect(() => {
    initGame();
    lastRef.current = performance.now();
    rafRef.current  = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [initGame, loop]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="w-full space-y-3">
      {/* HUD overlay */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className={`text-sm font-bold tabular-nums ${uiState.timeLeft < 15 ? 'text-danger' : 'text-text-primary'}`}>
            ⏱ {uiState.timeLeft}s
          </div>
          <div className="text-sm font-bold text-accent">⭐ {uiState.score}/{uiState.total}</div>
        </div>
        <div className="text-right max-w-[60%]">
          <p className="text-xs text-text-muted">Click the asteroid for:</p>
          <p className="text-sm font-bold text-primary truncate">{uiState.targetMeaning}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ height: 480 }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair block"
          style={{ background: COLORS.bg }}
        />
        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <p className="text-2xl font-extrabold text-text-primary animate-bounce">Submitting results…</p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-text-muted">
        Click the asteroid whose Japanese word matches the meaning shown above.{' '}
        <span className="text-primary">Glowing = target word.</span>
      </p>
    </div>
  );
}
