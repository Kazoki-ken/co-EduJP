'use client';

import Link from 'next/link';
import { ArrowRight, Crown, Loader2, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

/**
 * The one button that actually starts a paper.
 *
 * Same three states as StartAction — loading, not premium, ready — but here
 * "ready" is a real link into the runner rather than a coming-soon stub.
 */
export function StartTestButton({ testId }: { testId: string }) {
  const { isLoading, isPremium } = useAuth();

  const base =
    'flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold transition-all duration-200';

  if (isLoading) {
    return (
      <button type="button" disabled className={cn(base, 'cursor-wait bg-surface-2 text-text-muted')}>
        <Loader2 size={16} className="animate-spin" />
        Tekshirilmoqda…
      </button>
    );
  }

  if (!isPremium) {
    return (
      <Link
        href="/premium"
        className={cn(base, 'bg-accent-gradient text-white hover:shadow-glow-accent active:scale-[0.99]')}
      >
        <Crown size={16} />
        Premium olish
        <ArrowRight size={15} />
      </Link>
    );
  }

  return (
    <Link
      href={`/jlpt/run/${testId}`}
      className={cn(
        base,
        'bg-primary text-white hover:bg-primary-hover hover:shadow-glow active:scale-[0.99]',
      )}
    >
      <Play size={16} />
      Testni boshlash
    </Link>
  );
}

/** Same button, pointed at a full exam set instead of a single test. */
export function StartExamButton({ setId }: { setId: string }) {
  const { isLoading, isPremium } = useAuth();

  const base =
    'flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold transition-all duration-200';

  if (isLoading) {
    return (
      <button type="button" disabled className={cn(base, 'cursor-wait bg-surface-2 text-text-muted')}>
        <Loader2 size={16} className="animate-spin" />
        Tekshirilmoqda…
      </button>
    );
  }

  if (!isPremium) {
    return (
      <Link
        href="/premium"
        className={cn(base, 'bg-accent-gradient text-white hover:shadow-glow-accent active:scale-[0.99]')}
      >
        <Crown size={16} />
        Premium olish
        <ArrowRight size={15} />
      </Link>
    );
  }

  return (
    <Link
      href={`/jlpt/run/set/${setId}`}
      className={cn(
        base,
        'bg-primary text-white hover:bg-primary-hover hover:shadow-glow active:scale-[0.99]',
      )}
    >
      <Play size={16} />
      Imtihonni boshlash
    </Link>
  );
}
