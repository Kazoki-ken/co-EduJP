'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { GameSetup } from '@/components/games/GameSetup';
import { ShooterCanvas, type ArcadeStats } from '@/components/games/ShooterCanvas';
import { ShooterResults } from '@/components/games/ShooterResults';
import { useGameSession } from '@/hooks/useGameSession';
import { useGameSubmit } from '@/hooks/useGameSubmit';
import { useAuth } from '@/context/AuthContext';
import type { GameAnswer, GameType } from '@/lib/types';

type Step = 'setup' | 'play' | 'results';

export default function ShooterPage() {
  const GAME_TYPE: GameType = 'SHOOTER';
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { session, isLoading: sessionLoading, error: sessionError, quotaExceeded, fetchSession, reset: resetSession } = useGameSession();
  // No submitLoading gate here: the results screen renders from local arcade
  // stats immediately and the server's XP/coins line appears when it lands.
  const { result, error: submitError, submit, reset: resetSubmit } = useGameSubmit();
  const [step, setStep] = useState<Step>('setup');
  const [arcade, setArcade] = useState<ArcadeStats | null>(null);

  const handleStart = useCallback(async (opts: Parameters<typeof fetchSession>[0]) => {
    // One wave holds 8–12 planets; the run itself is endless and just
    // reshuffles this pool into a fresh wave each time.
    const s = await fetchSession({ ...opts, limit: Math.min(opts.limit ?? 10, 12) });
    if (s) setStep('play');
  }, [fetchSession]);

  const handleComplete = useCallback(async (answers: GameAnswer[], stats: ArcadeStats) => {
    setArcade(stats);
    // Show the run summary even if the submit fails — the score is the
    // player's, not the server's, and it would be galling to lose it.
    setStep('results');
    if (session) await submit(session.sessionId, answers);
  }, [session, submit]);

  const handlePlayAgain = useCallback(() => {
    resetSession(); resetSubmit();
    setArcade(null);
    setStep('setup');
  }, [resetSession, resetSubmit]);

  if (authLoading) {
    return (
      <div className="page-container py-24 flex items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-text-muted">Yuklanmoqda…</span>
      </div>
    );
  }


  return (
    // Full-width for the canvas
    <div className={step === 'play' ? 'px-4 py-6' : 'page-container py-10'}>
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-text-muted
                                     hover:text-primary transition-colors mb-6">
        <ChevronLeft size={14} /> O'yinlarga qaytish
      </Link>

      {submitError && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          {submitError}
        </div>
      )}

      {step === 'setup' ? (
        <GameSetup gameType={GAME_TYPE} isLoading={sessionLoading} error={sessionError} quotaExceeded={quotaExceeded} onStart={handleStart} />
      ) : step === 'play' && session ? (
        <ShooterCanvas session={session} onComplete={handleComplete} />
      ) : step === 'results' && arcade ? (
        // Rendered as soon as the run ends; `result` fills in the profile
        // XP/coins line a moment later when the submit resolves.
        <ShooterResults
          stats={arcade}
          result={result}
          onPlayAgain={handlePlayAgain}
          onGoHome={() => router.push('/games')}
        />
      ) : null}
    </div>
  );
}
