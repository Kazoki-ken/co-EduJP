'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Home, RotateCcw, Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { GameSetup } from '@/components/games/GameSetup';
import { BlockBlastGame, type BlockStats } from '@/components/games/BlockBlastGame';
import { useGameSession } from '@/hooks/useGameSession';
import { useGameSubmit } from '@/hooks/useGameSubmit';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { GameAnswer, GameType } from '@/lib/types';

type Step = 'setup' | 'play' | 'results';

export default function BlocksGamePage() {
  const GAME_TYPE: GameType = 'BLOCKS';
  const router = useRouter();
  const { user } = useAuth();
  const { session, isLoading: sessionLoading, error: sessionError, fetchSession, reset: resetSession } = useGameSession();
  const { result, error: submitError, submit, reset: resetSubmit } = useGameSubmit();
  const [step, setStep] = useState<Step>('setup');
  const [stats, setStats] = useState<BlockStats | null>(null);

  const handleStart = useCallback(async (opts: Parameters<typeof fetchSession>[0]) => {
    // The word pool feeds the question gate, which repeats for as long as the
    // run lasts, so a modest pool is plenty.
    const s = await fetchSession({ ...opts, limit: Math.min(opts.limit ?? 20, 30) });
    if (s) setStep('play');
  }, [fetchSession]);

  const handleComplete = useCallback(async (answers: GameAnswer[], blockStats: BlockStats) => {
    setStats(blockStats);
    setStep('results');
    // Show the summary immediately; the profile XP line fills in when the
    // submit resolves. An empty answer list means no question was ever reached.
    if (session && answers.length > 0) await submit(session.sessionId, answers);
  }, [session, submit]);

  const handlePlayAgain = useCallback(() => {
    resetSession(); resetSubmit();
    setStats(null);
    setStep('setup');
  }, [resetSession, resetSubmit]);

  return (
    <div className="page-container py-10">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-text-muted
                                     hover:text-primary transition-colors mb-6">
        <ChevronLeft size={14} /> O&rsquo;yinlarga qaytish
      </Link>

      {submitError && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          {submitError}
        </div>
      )}

      {step === 'setup' ? (
        <GameSetup gameType={GAME_TYPE} isLoading={sessionLoading} error={sessionError} onStart={handleStart} />
      ) : step === 'play' && session ? (
        <BlockBlastGame session={session} userId={user?.id} onComplete={handleComplete} />
      ) : step === 'results' && stats ? (
        <BlockResults
          stats={stats}
          xpEarned={result?.xpEarned ?? null}
          coinsEarned={result?.coinsEarned ?? null}
          onPlayAgain={handlePlayAgain}
          onGoHome={() => router.push('/games')}
        />
      ) : null}
    </div>
  );
}

function BlockResults({
  stats, xpEarned, coinsEarned, onPlayAgain, onGoHome,
}: {
  stats: BlockStats;
  xpEarned: number | null;
  coinsEarned: number | null;
  onPlayAgain: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="text-6xl mb-3"
        >
          {stats.isNewHighScore ? '🏆' : '🧱'}
        </motion.div>
        <h2 className="text-3xl font-extrabold text-text-primary">
          {stats.isNewHighScore ? 'Yangi rekord!' : "O'yin tugadi"}
        </h2>
        <p className="text-text-muted mt-1">Joy qolmadi — shakllar sig&rsquo;maydi</p>
      </div>

      <div className={cn(
        'card-glass p-6 text-center mb-4',
        stats.isNewHighScore ? 'border-accent/50 shadow-glow-accent' : 'border-border/50',
      )}>
        <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">
          To&rsquo;plangan ball
        </p>
        <p className="text-5xl font-black text-accent tabular-nums leading-none">{stats.score}</p>
        {stats.isNewHighScore && stats.prevHighScore > 0 && (
          <p className="text-xs text-accent font-bold mt-2">
            ⭐ Avvalgi rekord: {stats.prevHighScore}
          </p>
        )}
      </div>

      <div className="card-glass p-4 mb-4 flex items-center justify-center gap-2">
        <Trophy size={15} className="text-accent" />
        <span className="text-sm text-text-muted">Eng yuqori ball:</span>
        <span className="text-sm font-black text-text-primary tabular-nums">
          {Math.max(stats.prevHighScore, stats.score)}
        </span>
      </div>

      <div className="card-glass p-4 mb-4 grid grid-cols-3 gap-2 text-center">
        <Detail label="Tozalangan qator" value={stats.lines} />
        <Detail label="Eng uzun kombo" value={stats.bestCombo} />
        <Detail label="Toza taxta" value={stats.perfectClears} />
      </div>

      <div className="card-glass p-4 mb-4 grid grid-cols-3 gap-2 text-center">
        <Detail label="Joylangan shakl" value={stats.placed} />
        <Detail label="To'g'ri javob" value={stats.questionsCorrect} />
        <Detail label="Xato javob" value={stats.questionsWrong} />
      </div>

      {xpEarned !== null && (
        <div className="card-glass p-4 mb-5 flex items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-1.5 font-bold text-accent">
            <Zap size={15} /> +{xpEarned} XP
          </span>
          <span className="flex items-center gap-1.5 font-bold text-text-secondary">
            🪙 +{coinsEarned}
          </span>
          <span className="text-xs text-text-muted">hisobingizga</span>
        </div>
      )}

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

function Detail({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-extrabold text-text-primary tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-text-muted mt-1.5">{label}</p>
    </div>
  );
}
