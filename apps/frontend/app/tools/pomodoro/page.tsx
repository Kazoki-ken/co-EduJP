'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings, Coffee, Brain, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Modes ────────────────────────────────────────────────────────────────────

type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

const MODES: { key: PomodoroMode; label: string; icon: React.ReactNode; defaultMin: number; color: string; glow: string }[] = [
  { key: 'focus',      label: 'Focus',       icon: <Brain size={14} />,   defaultMin: 25, color: 'text-primary',  glow: 'shadow-glow-sm'  },
  { key: 'shortBreak', label: 'Short Break', icon: <Coffee size={14} />,  defaultMin: 5,  color: 'text-success',  glow: 'shadow-[0_0_16px_rgba(16,185,129,0.4)]' },
  { key: 'longBreak',  label: 'Long Break',  icon: <BookOpen size={14} />,defaultMin: 15, color: 'text-accent',   glow: 'shadow-glow-accent' },
];

const MODE_COLORS: Record<PomodoroMode, string> = {
  focus:      'from-violet-600 to-purple-800',
  shortBreak: 'from-emerald-500 to-teal-700',
  longBreak:  'from-amber-500 to-orange-700',
};

// ─── Pomodoro Page ────────────────────────────────────────────────────────────

export default function PomodoroPage() {
  const [mode,       setMode]       = useState<PomodoroMode>('focus');
  const [durations,  setDurations]  = useState({ focus: 25, shortBreak: 5, longBreak: 15 });
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning,  setIsRunning]  = useState(false);
  const [sessions,   setSessions]   = useState(0); // completed focus sessions
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = durations[mode] * 60;
  const pct          = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const minutes      = Math.floor(secondsLeft / 60);
  const seconds      = secondsLeft % 60;

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            // Play completion chime (simple beep via AudioContext)
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
              osc.start(); osc.stop(ctx.currentTime + 0.8);
            } catch {}

            if (mode === 'focus') setSessions((n) => n + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode]);

  const switchMode = (m: PomodoroMode) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setMode(m);
    setSecondsLeft(durations[m] * 60);
  };

  const toggle = () => setIsRunning((r) => !r);

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setSecondsLeft(durations[mode] * 60);
  };

  // SVG circle progress
  const R = 120, CIRCUM = 2 * Math.PI * R;
  const dash = CIRCUM - (pct / 100) * CIRCUM;

  return (
    <div className="page-container py-10 animate-fade-in max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-text-primary mb-1">🍅 Pomodoro Timer</h1>
        <p className="text-text-muted text-sm">Stay focused. Study smarter.</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-8">
        {MODES.map(({ key, label, icon, color }) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-all',
              mode === key
                ? `bg-primary border-primary text-white ${color}`
                : 'border-border text-text-muted hover:border-primary/50',
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-72 h-72">
          {/* Background gradient */}
          <div className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br opacity-10',
            MODE_COLORS[mode],
          )} />

          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 280 280">
            {/* Track */}
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
            {/* Progress */}
            <motion.circle
              cx="140" cy="140" r={R}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              stroke="url(#timerGrad)"
              strokeDasharray={CIRCUM}
              animate={{ strokeDashoffset: dash }}
              transition={{ duration: 0.5 }}
            />
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6d28d9" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-6xl font-extrabold tabular-nums text-text-primary tracking-tight">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
            <p className="text-text-muted text-sm mt-1 capitalize">{mode.replace(/([A-Z])/g, ' $1').trim()}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button onClick={reset} className="p-3 rounded-xl border border-border text-text-muted hover:text-text-primary hover:border-primary/50 transition-all">
          <RotateCcw size={20} />
        </button>
        <button
          onClick={toggle}
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center transition-all',
            'bg-primary hover:bg-primary-hover text-white shadow-glow',
          )}
        >
          {isRunning ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
        </button>
        <button onClick={() => setShowSettings((v) => !v)} className="p-3 rounded-xl border border-border text-text-muted hover:text-text-primary hover:border-primary/50 transition-all">
          <Settings size={20} />
        </button>
      </div>

      {/* Session dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={cn(
            'w-3 h-3 rounded-full border transition-all',
            i < (sessions % 4)
              ? 'bg-primary border-primary'
              : 'border-border',
          )} />
        ))}
        <span className="text-xs text-text-muted ml-2">{sessions} sessions</span>
      </div>

      {/* Settings drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card-glass p-5 space-y-4 overflow-hidden"
          >
            <h3 className="font-semibold text-text-primary text-sm">⚙️ Timer Durations (minutes)</h3>
            {MODES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-text-secondary">{label}</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={durations[key]}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(60, Number(e.target.value)));
                    setDurations((d) => ({ ...d, [key]: val }));
                    if (mode === key) setSecondsLeft(val * 60);
                  }}
                  className="input-field w-20 text-center py-1.5 text-sm"
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
