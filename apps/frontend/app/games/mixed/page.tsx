'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Play, AlertCircle, Loader2, Shuffle, ListChecks, Link2, PenLine,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MixedGame } from '@/components/games/MixedGame';
import { GameResults } from '@/components/games/GameResults';
import { useGameSession } from '@/hooks/useGameSession';
import { useGameSubmit } from '@/hooks/useGameSubmit';
import { UpgradeNotice, QuotaBar } from '@/components/premium/UpgradeNotice';
import type { GameAnswer, GameType } from '@/lib/types';

type Step = 'intro' | 'play' | 'results';

/**
 * The combined review mode.
 *
 * Deliberately has no setup screen: no topic picker, no length picker, no
 * SRS-only toggle. One button, then 20 server-dealt rounds. Everything that
 * would otherwise be a setting is decided by the backend.
 */
export default function MixedGamePage() {
  const GAME_TYPE: GameType = 'MIXED';
  const router = useRouter();
  const {
    session, isLoading: sessionLoading, error: sessionError, quotaExceeded,
    fetchSession, reset: resetSession,
  } = useGameSession();
  const {
    result, isLoading: submitLoading, error: submitError,
    submit, reset: resetSubmit,
  } = useGameSubmit();
  const [step, setStep] = useState<Step>('intro');

  const handleStart = useCallback(async () => {
    const s = await fetchSession({ gameType: GAME_TYPE });
    if (s) setStep('play');
  }, [fetchSession]);

  const handleComplete = useCallback(async (answers: GameAnswer[]) => {
    if (!session) return;
    const r = await submit(session.sessionId, answers);
    if (r) setStep('results');
  }, [session, submit]);

  const handlePlayAgain = useCallback(() => {
    resetSession();
    resetSubmit();
    setStep('intro');
  }, [resetSession, resetSubmit]);

  return (
    <div className="page-container py-10">
      <Link
        href="/games"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted
                   hover:text-primary transition-colors mb-8"
      >
        <ChevronLeft size={14} /> O&rsquo;yinlarga qaytish
      </Link>

      {submitError && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          {submitError}
        </div>
      )}

      {submitLoading ? (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 size={22} className="animate-spin text-primary" />
          <span className="text-text-muted">Natijalar saqlanmoqda…</span>
        </div>
      ) : step === 'intro' ? (
        <Intro
          isLoading={sessionLoading}
          error={sessionError}
          quotaExceeded={quotaExceeded}
          onStart={handleStart}
        />
      ) : step === 'play' && session ? (
        <MixedGame session={session} onComplete={handleComplete} />
      ) : step === 'results' && result ? (
        <GameResults
          result={result}
          onPlayAgain={handlePlayAgain}
          onGoHome={() => router.push('/games')}
        />
      ) : null}
    </div>
  );
}

function Intro({
  isLoading, error, quotaExceeded, onStart,
}: {
  isLoading: boolean;
  error: string | null;
  quotaExceeded: boolean;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto text-center"
    >
      <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-700
                      ring-1 ring-inset ring-white/20 shadow-lg flex items-center justify-center">
        <Shuffle size={36} strokeWidth={2} className="text-white drop-shadow-sm" />
      </div>
      <h1 className="text-3xl font-extrabold text-text-primary mb-2">
        Aralash mashq
      </h1>
      <p className="text-text-secondary mb-8 leading-relaxed">
        {"20 ta raund. Har raundda uchta o'yindan biri tasodifiy tushadi — variantli test, mos juftliklar yoki yozish amaliyoti."}
      </p>

      <div className="card-glass p-5 mb-6 space-y-4 text-left">
        <Rule
          Icon={ListChecks}
          tint="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          title="Variantli test"
          desc="To'rtta variantdan to'g'ri ma'noni tanlang."
        />
        <Rule
          Icon={Link2}
          tint="bg-stone-500/15 text-stone-300 border-stone-500/30"
          title="Mos juftliklar"
          desc="3 ta jon beriladi. Jonlar tugasa, o'sha raund topilgan juftliklar bilan birga hisobga olinmaydi."
        />
        <Rule
          Icon={PenLine}
          tint="bg-red-500/15 text-red-400 border-red-500/30"
          title="Yozish amaliyoti"
          desc="O'zbekcha ma'nosidan yaponchasini yozing."
        />
      </div>

      <QuotaBar kind="games" className="mb-5 text-left" />

      {error && (
        quotaExceeded ? (
          <div className="mb-5 text-left">
            <UpgradeNotice message={error} />
          </div>
        ) : (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-danger/10
                          border border-danger/30 text-danger text-sm text-left">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )
      )}

      <button
        onClick={onStart}
        disabled={isLoading || quotaExceeded}
        className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base
                   shadow-glow disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Tayyorlanmoqda…
          </>
        ) : (
          <>
            <Play size={18} /> Boshlash
          </>
        )}
      </button>

      <p className="text-[11px] text-text-muted mt-4">
        {"Raundlar soni va so'zlar server tomonidan belgilanadi — sozlash talab qilinmaydi."}
      </p>
    </motion.div>
  );
}

function Rule({
  Icon, tint, title, desc,
}: {
  Icon: LucideIcon;
  /** Background / text / border classes matching the round's colour on the games grid. */
  tint: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${tint}`}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-text-primary">{title}</p>
        <p className="text-xs text-text-muted leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
