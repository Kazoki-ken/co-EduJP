'use client';

import Link from 'next/link';
import { ArrowRight, Clock, Crown, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

/**
 * The one button on every JLPT screen, and the only place the premium rule
 * lives: the whole section is premium-only.
 *
 * Three states, in the order they are checked:
 *   - auth still loading  → a disabled placeholder, so the button never flips
 *                           from "start" to "upgrade" under the learner's cursor
 *   - not premium         → a link to /premium (this part is real and works)
 *   - premium             → disabled "coming soon", because no exam bank exists yet
 */
export function StartAction({
  label = 'Boshlash',
  className,
  full = true,
}: {
  label?: string;
  className?: string;
  /** Stretch to the container width — the detail pages want a wide button. */
  full?: boolean;
}) {
  const { isLoading, isPremium } = useAuth();

  const base = cn(
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5',
    'text-sm font-bold transition-all duration-200',
    full && 'w-full',
    className,
  );

  if (isLoading) {
    return (
      <button type="button" disabled className={cn(base, 'bg-surface-2 text-text-muted cursor-wait')}>
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

  // Premium, but there is nothing to open yet. A washed-out red button reads
  // as broken; a plain outlined one reads as "not ready", which is the truth.
  return (
    <button
      type="button"
      disabled
      title="Tez orada"
      className={cn(
        base,
        'border border-dashed border-border bg-surface-2/60 text-text-muted cursor-not-allowed',
      )}
    >
      <Clock size={15} />
      {label} — tez orada
    </button>
  );
}

/**
 * Banner explaining why the buttons lead to /premium. Renders nothing for
 * subscribers, who do not need to be sold anything.
 */
export function PremiumGateNotice({ className }: { className?: string }) {
  const { isLoading, isPremium } = useAuth();
  if (isLoading || isPremium) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm',
        className,
      )}
    >
      <Lock size={15} className="mt-0.5 shrink-0 text-accent" />
      <p className="text-text-secondary">
        <span className="font-bold text-accent">Faqat Premium.</span>{' '}
        JLPT sinov imtihonlari premium obuna bilan ochiladi.{' '}
        <Link href="/premium" className="font-semibold text-accent hover:underline">
          Tariflarni ko&rsquo;rish
        </Link>
      </p>
    </div>
  );
}
