'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { GameSetup } from '@/components/games/GameSetup';
import { WriteGame } from '@/components/games/WriteGame';
import { GameResults } from '@/components/games/GameResults';
import { useGameSession } from '@/hooks/useGameSession';
import { useGameSubmit } from '@/hooks/useGameSubmit';
import type { GameAnswer, GameType } from '@/lib/types';

type Step = 'setup' | 'play' | 'results';

export default function WriteGamePage() {
  const GAME_TYPE: GameType = 'WRITE';
  const router = useRouter();
  const { session, isLoading: sessionLoading, error: sessionError, fetchSession, reset: resetSession } = useGameSession();
  const { result,  isLoading: submitLoading,  error: submitError,  submit,       reset: resetSubmit  } = useGameSubmit();
  const [step, setStep] = useState<Step>('setup');

  const handleStart = useCallback(async (opts: Parameters<typeof fetchSession>[0]) => {
    const s = await fetchSession(opts);
    if (s) setStep('play');
  }, [fetchSession]);

  const handleComplete = useCallback(async (answers: GameAnswer[]) => {
    if (!session) return;
    const r = await submit(session.sessionId, answers);
    if (r) setStep('results');
  }, [session, submit]);

  const handlePlayAgain = useCallback(() => {
    resetSession(); resetSubmit();
    setStep('setup');
  }, [resetSession, resetSubmit]);

  return (
    <div className="page-container py-10">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-text-muted
                                     hover:text-primary transition-colors mb-8">
        <ChevronLeft size={14} /> Back to Games
      </Link>

      {submitError && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          {submitError}
        </div>
      )}

      {submitLoading ? (
        <div className="flex items-center justify-center py-24 gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted">Submitting results…</span>
        </div>
      ) : step === 'setup' ? (
        <GameSetup gameType={GAME_TYPE} isLoading={sessionLoading} error={sessionError} onStart={handleStart} />
      ) : step === 'play' && session ? (
        <WriteGame session={session} onComplete={handleComplete} />
      ) : step === 'results' && result ? (
        <GameResults result={result} onPlayAgain={handlePlayAgain} onGoHome={() => router.push('/games')} />
      ) : null}
    </div>
  );
}
