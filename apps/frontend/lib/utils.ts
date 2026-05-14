import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with locale-aware thousands separator (e.g. 1,234). */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Format a date as "Mon DD, YYYY" */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Returns the Tailwind color name for a league tier. */
export function leagueColor(league: string): string {
  const map: Record<string, string> = {
    BRONZE:   'text-bronze',
    SILVER:   'text-silver',
    GOLD:     'text-gold',
    PLATINUM: 'text-platinum',
    DIAMOND:  'text-diamond',
  };
  return map[league] ?? 'text-text-secondary';
}

/** Returns the emoji icon for a league tier. */
export function leagueIcon(league: string): string {
  const map: Record<string, string> = {
    BRONZE:   '🥉',
    SILVER:   '🥈',
    GOLD:     '🥇',
    PLATINUM: '💎',
    DIAMOND:  '💠',
  };
  return map[league] ?? '⭐';
}
