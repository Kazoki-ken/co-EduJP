'use client';

import Link from 'next/link';
import { ArrowRight, Crown, Gamepad2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

/**
 * What the learner sees when a tier allowance runs out.
 *
 * The backend answers a spent quota with 402 and a message written for the
 * learner, so that text is shown verbatim and this only adds the way forward.
 * Deliberately reassuring rather than pushy: the limits it hits are on games
 * and AI, never on SRS review, and saying so keeps the free tier trustworthy.
 */
export function UpgradeNotice({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'card-glass p-5 border-accent/40 bg-gradient-to-r from-accent/[0.07] to-transparent',
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center
                         justify-center text-accent shrink-0">
          <Crown size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-text-primary mb-1">Kunlik limit tugadi</p>
          <p className="text-sm text-text-secondary leading-relaxed">{message}</p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Link href="/premium" className="btn-primary text-sm inline-flex items-center gap-2">
              <Crown size={15} /> Tariflarni ko&rsquo;rish
              <ArrowRight size={14} />
            </Link>
            <Link href="/" className="btn-ghost text-sm">
              Takrorlashga o&rsquo;tish
            </Link>
          </div>

          <p className="text-[11px] text-text-muted mt-3">
            {"Eslatma: takrorlash (SRS) hech qachon cheklanmaydi — bugungi so'zlaringizni bemalol takrorlang."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Today's remaining allowance, for free accounts only.
 *
 * Premium users and unlimited quotas render nothing — a progress bar that can
 * never fill is just noise.
 */
export function QuotaBar({ kind, className }: { kind: 'games' | 'ai'; className?: string }) {
  const { entitlements } = useAuth();
  if (!entitlements || entitlements.isPremium) return null;

  const limit =
    kind === 'games' ? entitlements.limits.dailyGames : entitlements.limits.dailyAiMessages;
  if (limit === null) return null;

  const used =
    kind === 'games' ? entitlements.usage.gamesToday : entitlements.usage.aiMessagesToday;
  const left = Math.max(0, limit - used);
  const pct = Math.min(100, (used / limit) * 100);
  const Icon = kind === 'games' ? Gamepad2 : MessageCircle;

  return (
    <div className={cn('card-glass px-4 py-3 flex items-center gap-3', className)}>
      <Icon size={15} className="text-text-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-xs font-semibold text-text-secondary">
            {kind === 'games' ? "Bugungi o'yinlar" : 'Bugungi AI xabarlar'}
          </span>
          <span className="text-xs text-text-muted tabular-nums">
            {used}/{limit}
          </span>
        </div>
        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              left === 0 ? 'bg-danger' : left <= 1 ? 'bg-accent' : 'bg-primary',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Link
        href="/premium"
        className="text-[11px] font-bold text-accent hover:underline shrink-0 whitespace-nowrap"
      >
        Cheksiz →
      </Link>
    </div>
  );
}
