'use client';

import { motion } from 'framer-motion';
import { Home, RotateCcw, Trophy, Zap, Flame, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArcadeStats } from './ShooterCanvas';
import type { GameResult } from '@/lib/types';

interface ShooterResultsProps {
  stats: ArcadeStats;
  /** Server response — profile XP/coins. Absent if the submit failed. */
  result: GameResult | null;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

/**
 * Arcade-style summary for the space shooter.
 *
 * Deliberately not the shared GameResults: this mode does not touch SRS
 * levels, so an "SRS progress" list would be a row of no-ops. What matters
 * here is the run score, the level reached and whether either beat a
 * personal best.
 */
export function ShooterResults({ stats, result, onPlayAgain, onGoHome }: ShooterResultsProps) {
  const beatSomething = stats.isNewHighScore || stats.isNewHighestLevel;

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      {/* ── Headline ───────────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="text-6xl mb-3"
        >
          {beatSomething ? '🏆' : stats.level >= 3 ? '🚀' : '🪐'}
        </motion.div>

        <h2 className="text-3xl font-extrabold text-text-primary">
          {beatSomething ? 'Yangi rekord!' : "O'yin tugadi"}
        </h2>

        <p className="text-text-muted mt-1">
          {stats.level}-darajaga yetdingiz · {stats.waves} ta to&rsquo;lqin
        </p>
      </div>

      {/* ── Run score ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'card-glass p-6 text-center mb-4',
          stats.isNewHighScore ? 'border-accent/50 shadow-glow-accent' : 'border-border/50',
        )}
      >
        <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">
          {"To'plangan XP"}
        </p>
        <p className="text-5xl font-black text-accent tabular-nums leading-none">
          {stats.scoreXp}
        </p>
        {stats.isNewHighScore && (
          <p className="text-xs text-accent font-bold mt-2">
            ⭐ Avvalgi rekord: {stats.prevHighScore} XP
          </p>
        )}
      </motion.div>

      {/* ── Personal bests ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <BestCard
          icon={<Trophy size={16} className="text-accent" />}
          label="Eng yuqori XP"
          value={Math.max(stats.prevHighScore, stats.scoreXp)}
          isNew={stats.isNewHighScore}
          delay={0.18}
        />
        <BestCard
          icon={<Layers size={16} className="text-primary" />}
          label="Eng yuqori daraja"
          value={Math.max(stats.prevHighestLevel, stats.level)}
          isNew={stats.isNewHighestLevel}
          delay={0.24}
        />
      </div>

      {/* ── Run detail ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card-glass p-4 mb-4 grid grid-cols-3 gap-3 text-center"
      >
        <Detail icon={<Flame size={15} className="text-primary" />} label="Eng uzun seriya" value={stats.bestStreak} />
        <Detail icon={<span className="text-sm">🎯</span>} label="Topilgan" value={stats.correct} />
        <Detail icon={<span className="text-sm">💥</span>} label="Xato" value={stats.wrong} />
      </motion.div>

      {/* ── Profile rewards ────────────────────────────────────────────── */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.36 }}
          className="card-glass p-4 mb-6 flex items-center justify-center gap-6 text-sm"
        >
          <span className="flex items-center gap-1.5 font-bold text-accent">
            <Zap size={15} /> +{result.xpEarned} XP
          </span>
          <span className="flex items-center gap-1.5 font-bold text-text-secondary">
            🪙 +{result.coinsEarned}
          </span>
          <span className="text-xs text-text-muted">hisobingizga</span>
        </motion.div>
      )}

      {/* This mode is pure practice — say so, since every other game moves the
          review schedule and a learner would reasonably assume this one does. */}
      <p className="text-center text-[11px] text-text-muted mb-5">
        {"Bu rejim so'zlarning takrorlash jadvaliga ta'sir qilmaydi."}
      </p>

      <div className="flex gap-3">
        <button onClick={onGoHome} className="btn-ghost flex items-center gap-2 flex-1 justify-center">
          <Home size={16} /> O&rsquo;yinlarga
        </button>
        <button onClick={onPlayAgain} className="btn-primary flex items-center gap-2 flex-1 justify-center">
          <RotateCcw size={16} /> Yana o&rsquo;ynash
        </button>
      </div>
    </div>
  );
}

function BestCard({
  icon, label, value, isNew, delay,
}: {
  icon: React.ReactNode; label: string; value: number; isNew: boolean; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'card-glass p-4 text-center relative overflow-hidden',
        isNew ? 'border-accent/50' : 'border-border/40',
      )}
    >
      {isNew && (
        <span className="absolute top-1.5 right-1.5 text-[9px] font-black text-accent uppercase tracking-wider">
          Yangi
        </span>
      )}
      <div className="flex items-center justify-center gap-1.5 mb-1.5">{icon}</div>
      <p className="text-2xl font-black text-text-primary tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-text-muted mt-1.5 font-medium">{label}</p>
    </motion.div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-lg font-extrabold text-text-primary tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-text-muted mt-1">{label}</p>
    </div>
  );
}
