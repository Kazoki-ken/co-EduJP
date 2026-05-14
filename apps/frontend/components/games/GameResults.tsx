'use client';

import { motion } from 'framer-motion';
import { Home, RotateCcw, Star, Zap, Target, Trophy } from 'lucide-react';
import { cn, leagueIcon } from '@/lib/utils';
import type { GameResult } from '@/lib/types';

const SRS_LEVEL_LABELS: Record<number, string> = {
  1: 'Beginner', 2: 'Familiar', 3: 'Practiced', 4: 'Advanced', 5: 'Mastered',
};

interface GameResultsProps {
  result:       GameResult;
  onPlayAgain:  () => void;
  onGoHome:     () => void;
}

export function GameResults({ result, onPlayAgain, onGoHome }: GameResultsProps) {
  const isPerfect = result.accuracy === 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="max-w-xl mx-auto animate-fade-in"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
          className="text-6xl mb-3"
        >
          {isPerfect ? '🎉' : result.accuracy >= 70 ? '✅' : '💪'}
        </motion.div>
        <h2 className="text-3xl font-extrabold text-text-primary">
          {isPerfect ? 'Perfect!' : result.accuracy >= 70 ? 'Great Job!' : 'Keep Practicing!'}
        </h2>
        <p className="text-text-muted mt-1">
          {result.totalCorrect}/{result.totalQuestions} correct
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<Target size={18} className="text-primary" />}
          label="Accuracy"
          value={`${result.accuracy}%`}
          delay={0.15}
        />
        <StatCard
          icon={<Zap size={18} className="text-accent" />}
          label="XP Earned"
          value={`+${result.xpEarned}`}
          delay={0.25}
        />
        <StatCard
          icon={<span className="text-lg">🪙</span>}
          label="Coins"
          value={`+${result.coinsEarned}`}
          delay={0.35}
        />
      </div>

      {/* Badges earned */}
      {result.badgesEarned.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-glass p-5 mb-6"
        >
          <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <Trophy size={14} className="text-accent" /> New Badges Unlocked!
          </h3>
          <div className="flex flex-wrap gap-3">
            {result.badgesEarned.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl
                           bg-accent/10 border border-accent/30"
              >
                <span className="text-xl">{badge.icon ?? '🏅'}</span>
                <div>
                  <p className="text-xs font-bold text-accent">{badge.name}</p>
                  <p className="text-xs text-text-muted">{badge.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* SRS updates summary */}
      {result.srsUpdates.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="card-glass p-5 mb-6 max-h-48 overflow-y-auto"
        >
          <h3 className="text-sm font-semibold text-text-secondary mb-3">SRS Progress</h3>
          <div className="space-y-2">
            {result.srsUpdates.map((u) => (
              <div key={u.wordId} className="flex items-center justify-between text-xs">
                <span className={cn(
                  'flex items-center gap-1.5 font-medium',
                  u.correct ? 'text-success' : 'text-danger',
                )}>
                  {u.correct ? '✅' : '❌'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted">Lv {u.oldLevel}</span>
                  <span className="text-text-muted">→</span>
                  <span className={cn(
                    'font-semibold',
                    u.newLevel > u.oldLevel ? 'text-success' :
                    u.newLevel < u.oldLevel ? 'text-danger' : 'text-text-secondary',
                  )}>
                    Lv {u.newLevel} ({SRS_LEVEL_LABELS[u.newLevel]})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onGoHome} className="btn-ghost flex items-center gap-2 flex-1 justify-center">
          <Home size={16} /> Home
        </button>
        <button onClick={onPlayAgain} className="btn-primary flex items-center gap-2 flex-1 justify-center">
          <RotateCcw size={16} /> Play Again
        </button>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, delay }: { icon: React.ReactNode; label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className="card-glass p-4 text-center"
    >
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xl font-extrabold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </motion.div>
  );
}
