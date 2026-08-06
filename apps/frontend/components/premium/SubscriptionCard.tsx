'use client';

import Link from 'next/link';
import {
  ArrowRight, BookMarked, Crown, Gamepad2, Infinity as InfinityIcon,
  Library, MessageCircle, Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { Entitlements } from '@/lib/types';

/**
 * The subscription panel on the profile page.
 *
 * Answers the two questions a subscriber actually has — "am I premium?" and
 * "until when?" — and, for a free account, shows how much of each allowance is
 * left today. Showing the remaining budget is the honest version of an upsell:
 * it is useful whether or not they ever buy.
 */
export function SubscriptionCard({ className }: { className?: string }) {
  const { entitlements, isLoading } = useAuth();

  if (isLoading) return <div className={cn('h-28 skeleton rounded-xl', className)} />;
  if (!entitlements) return null;

  return entitlements.isPremium
    ? <PremiumState e={entitlements} className={className} />
    : <FreeState e={entitlements} className={className} />;
}

// ─── Premium ──────────────────────────────────────────────────────────────────

/** Whole days left, or null for a lifetime grant. */
const daysLeft = (until: string | null): number | null => {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
};

function PremiumState({ e, className }: { e: Entitlements; className?: string }) {
  const left = daysLeft(e.premiumUntil);
  // A fortnight is enough warning to renew without nagging all month.
  const expiringSoon = left !== null && left <= 14;

  return (
    <div
      className={cn(
        'card-glass p-6 border-accent/40 bg-gradient-to-r from-accent/[0.08] to-transparent',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/30 flex items-center
                           justify-center text-accent shrink-0">
            <Crown size={21} />
          </span>
          <div>
            <h2 className="text-lg font-black text-text-primary">Premium faol</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {e.premiumUntil === null
                ? 'Umrbod — muddati cheklanmagan'
                : `${new Date(e.premiumUntil).toLocaleDateString('uz-UZ', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })} gacha`}
            </p>
          </div>
        </div>

        {left !== null && (
          <div className="text-center shrink-0">
            <p className={cn(
              'text-2xl font-black leading-none tabular-nums',
              expiringSoon ? 'text-danger' : 'text-accent',
            )}>
              {left}
            </p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">
              kun qoldi
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Perk icon={Gamepad2} label="Cheksiz o'yin" />
        <Perk icon={MessageCircle} label={`Kuniga ${e.limits.dailyAiMessages ?? '∞'} AI xabar`} />
        <Perk icon={BookMarked} label="Cheksiz so'z" />
        <Perk icon={Volume2} label="Cheksiz talaffuz" />
      </div>

      {expiringSoon && (
        <div className="mt-4 flex flex-wrap items-center gap-3 pt-4 border-t border-border/40">
          <p className="text-sm text-danger font-semibold">
            {'Obuna tugayapti — uzaytirsangiz qolgan kunlar yo‘qolmaydi.'}
          </p>
          <Link href="/premium" className="btn-primary text-sm inline-flex items-center gap-2">
            Uzaytirish <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

function Perk({ icon: Icon, label }: { icon: typeof Crown; label: string }) {
  return (
    <span className="badge-chip bg-accent/10 text-accent border border-accent/25 text-[11px]">
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── Free ─────────────────────────────────────────────────────────────────────

function FreeState({ e, className }: { e: Entitlements; className?: string }) {
  const rows = [
    {
      icon: Gamepad2,
      label: "Bugungi o'yinlar",
      used: e.usage.gamesToday,
      limit: e.limits.dailyGames,
    },
    {
      icon: MessageCircle,
      label: 'Bugungi AI xabarlar',
      used: e.usage.aiMessagesToday,
      limit: e.limits.dailyAiMessages,
    },
    {
      icon: BookMarked,
      label: "Saqlangan so'zlar",
      used: e.usage.savedWords,
      limit: e.limits.maxSavedWords,
    },
    {
      icon: Library,
      label: 'Shaxsiy mavzular',
      used: e.usage.topics,
      limit: e.limits.maxTopics,
    },
  ].filter((r) => r.limit !== null);

  return (
    <div className={cn('card-glass p-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-black text-text-primary">Bepul tarif</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {'Takrorlash (SRS) cheksiz — quyidagilar kunlik yoki umumiy chegara.'}
          </p>
        </div>
        <Link href="/premium" className="btn-primary text-sm inline-flex items-center gap-2 shrink-0">
          <Crown size={15} /> Premium olish
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {rows.map((r) => (
          <UsageRow key={r.label} {...r} limit={r.limit as number} />
        ))}
      </div>
    </div>
  );
}

function UsageRow({
  icon: Icon, label, used, limit,
}: {
  icon: typeof Crown;
  label: string;
  used: number;
  limit: number;
}) {
  const pct = Math.min(100, (used / limit) * 100);
  const full = used >= limit;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-2 text-sm text-text-secondary font-medium">
          <Icon size={14} className="text-text-muted shrink-0" />
          {label}
        </span>
        <span className={cn('text-xs tabular-nums', full ? 'text-danger font-bold' : 'text-text-muted')}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            full ? 'bg-danger' : pct > 75 ? 'bg-accent' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * A one-line tier strip for the dashboard.
 *
 * Deliberately quieter than the profile card: the dashboard's job is to push
 * today's review, so this sits underneath it rather than competing with it.
 */
export function TierStrip({ className }: { className?: string }) {
  const { entitlements } = useAuth();
  if (!entitlements) return null;

  if (entitlements.isPremium) {
    const left = daysLeft(entitlements.premiumUntil);
    return (
      <div className={cn(
        'flex items-center gap-2.5 text-sm px-4 py-2.5 rounded-xl',
        'bg-accent/[0.07] border border-accent/25',
        className,
      )}>
        <Crown size={14} className="text-accent shrink-0" />
        <span className="text-accent font-bold">Premium</span>
        <span className="text-text-muted text-xs">
          {left === null ? 'umrbod' : `${left} kun qoldi`}
        </span>
        <InfinityIcon size={13} className="text-text-muted ml-auto shrink-0" />
      </div>
    );
  }

  const games = entitlements.limits.dailyGames;
  const leftToday = games === null ? null : Math.max(0, games - entitlements.usage.gamesToday);

  return (
    <Link
      href="/premium"
      className={cn(
        'flex items-center gap-2.5 text-sm px-4 py-2.5 rounded-xl group',
        'bg-surface-2/50 border border-border hover:border-accent/40 transition-colors',
        className,
      )}
    >
      <Crown size={14} className="text-text-muted group-hover:text-accent shrink-0 transition-colors" />
      <span className="text-text-secondary">
        {leftToday === null
          ? 'Bepul tarif'
          : leftToday === 0
            ? "Bugungi o'yin limiti tugadi"
            : `Bugun yana ${leftToday} ta o'yin`}
      </span>
      <span className="ml-auto text-xs font-bold text-accent shrink-0">Premium →</span>
    </Link>
  );
}
