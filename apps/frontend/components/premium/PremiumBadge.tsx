'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The subscriber mark, used everywhere a username appears.
 *
 * One shape and one colour across the whole app — sidebar, profile, leaderboard,
 * community listings, admin panel — so learners come to read the gold crown as
 * "this person subscribed" rather than decoding a different hint per screen.
 *
 * The leaderboard's rank medals are emoji and its own crown was removed, so the
 * crown never means two things on the same row.
 */

/** Just the icon, for sitting inline next to a name. */
export function PremiumMark({
  size = 13,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Crown
      size={size}
      className={cn('text-accent shrink-0', className)}
      // Screen readers announce the subscription rather than "crown icon".
      role="img"
      aria-label="Premium obunachi"
    />
  );
}

/** Icon plus the word, for headers where there is room to spell it out. */
export function PremiumBadge({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      title="Premium obunachi"
      className={cn(
        'badge-chip border font-bold bg-accent/15 text-accent border-accent/30',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs',
        className,
      )}
    >
      <Crown size={size === 'sm' ? 10 : 12} />
      Premium
    </span>
  );
}

/**
 * Shown to free accounts in the same slot the badge would occupy.
 *
 * Only ever rendered on the viewer's own screens — never against someone
 * else's name, where it would read as a public mark of not paying.
 */
export function UpgradeChip({ className }: { className?: string }) {
  return (
    <Link
      href="/premium"
      className={cn(
        'badge-chip border font-bold text-[11px] transition-colors',
        'bg-surface-2 text-text-muted border-border hover:text-accent hover:border-accent/40',
        className,
      )}
    >
      <Crown size={11} />
      Premium olish
    </Link>
  );
}
