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
import { useAuth } from '@/context/AuthContext';
import type { GameAnswer, GameType } from '@/lib/types';

type Step = 'setup' | 'play' | 'results';

export default function WriteGamePage() {
  const GAME_TYPE: GameType = 'WRITE';
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
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

  if (authLoading) {
    return (
      <div className="page-container py-24 flex items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-text-muted">Yuklanmoqda…</span>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="page-container py-24 max-w-md mx-auto text-center space-y-6">
        <div className="text-6xl animate-bounce">🔒</div>
        <h2 className="text-2xl font-extrabold text-text-primary">Kirish cheklangan</h2>
        <p className="text-text-muted">
          Kechirasiz, "Yozish amaliyoti" o'yini faqat administratorlar uchun ochiq qilib belgilangan.
        </p>
        <Link href="/games" className="btn-primary inline-flex items-center gap-2 justify-center px-6 py-2.5 mx-auto">
          <ChevronLeft size={16} /> O'yinlar bo'limiga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container py-10">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-text-muted
                                     hover:text-primary transition-colors mb-8">
        <ChevronLeft size={14} /> O'yinlarga qaytish
      </Link>

      {submitError && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          {submitError}
        </div>
      )}

      {submitLoading ? (
        <div className="flex items-center justify-center py-24 gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted">Natijalar saqlanmoqda…</span>
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
