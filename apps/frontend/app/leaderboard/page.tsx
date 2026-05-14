'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, Crown } from 'lucide-react';
import api from '@/lib/api';
import { cn, leagueColor, leagueIcon } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank:        number;
  userId:      string;
  username:    string;
  league:      string;
  streak:      number;
  weeklyCoins: number;
  weeklyXp:    number;
  weeklyGames: number;
  score:       number;
}

type LeagueFilter = 'ALL' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

const LEAGUES: LeagueFilter[] = ['ALL', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];

const RANK_STYLES: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: 'bg-yellow-500/20 border-yellow-500/50', text: 'text-yellow-400', icon: '🥇' },
  2: { bg: 'bg-slate-400/20 border-slate-400/50',   text: 'text-slate-300',  icon: '🥈' },
  3: { bg: 'bg-amber-600/20 border-amber-600/50',   text: 'text-amber-500',  icon: '🥉' },
};

// ─── Inner (needs useSearchParams) ───────────────────────────────────────────

function LeaderboardInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useAuth();

  const [entries,   setEntries]   = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [league, setLeague]       = useState<LeagueFilter>(
    (searchParams.get('league') as LeagueFilter) ?? 'ALL',
  );

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const params = league !== 'ALL' ? { league } : {};
    api.get<LeaderboardEntry[]>('/leaderboard', { params })
      .then(({ data }) => setEntries(data))
      .catch(() => setError('Failed to load leaderboard.'))
      .finally(() => setIsLoading(false));
  }, [league]);

  const handleLeague = (l: LeagueFilter) => {
    setLeague(l);
    const params = new URLSearchParams(searchParams.toString());
    if (l === 'ALL') params.delete('league');
    else params.set('league', l);
    router.replace(`/leaderboard${params.toString() ? `?${params}` : ''}`, { scroll: false });
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10
                        border border-accent/30 text-accent text-sm font-medium mb-5">
          <Trophy size={14} /> Weekly Leaderboard
        </div>
        <h1 className="text-4xl font-extrabold text-text-primary mb-2">Hall of Fame</h1>
        <p className="text-text-secondary max-w-md mx-auto">
          Top learners by weekly score (coins + XP×2). Resets every Monday at 00:00 UTC.
        </p>
      </div>

      {/* League filter pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {LEAGUES.map((l) => (
          <button
            key={l}
            onClick={() => handleLeague(l)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150',
              league === l
                ? 'bg-primary border-primary text-white shadow-glow-sm'
                : 'border-border text-text-muted hover:border-primary/50 hover:text-text-secondary',
            )}
          >
            {l === 'ALL' ? '🌐 All Leagues' : `${leagueIcon(l)} ${l}`}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 max-w-2xl mx-auto">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-center text-danger">{error}</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-text-muted">No entries yet for this league. Be the first!</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-2">
          {entries.map((entry, i) => {
            const rankStyle = RANK_STYLES[entry.rank];
            const isMe      = entry.userId === user?.id;

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all',
                  rankStyle
                    ? `${rankStyle.bg}`
                    : isMe
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-surface/60 border-border hover:border-border/80',
                )}
              >
                {/* Rank */}
                <div className="w-10 text-center shrink-0">
                  {rankStyle ? (
                    <span className="text-2xl">{rankStyle.icon}</span>
                  ) : (
                    <span className={cn('text-lg font-bold tabular-nums', isMe ? 'text-primary' : 'text-text-muted')}>
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  isMe ? 'bg-primary text-white' : 'bg-surface-2 text-text-secondary border border-border',
                )}>
                  {entry.username[0]?.toUpperCase()}
                </div>

                {/* Name + league */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('font-semibold truncate', isMe ? 'text-primary' : 'text-text-primary')}>
                      {entry.username}
                      {isMe && <span className="text-xs text-primary/70 ml-1">(you)</span>}
                    </p>
                    {entry.rank === 1 && <Crown size={14} className="text-yellow-400 shrink-0" />}
                  </div>
                  <p className={cn('text-xs', leagueColor(entry.league))}>
                    {leagueIcon(entry.league)} {entry.league}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm shrink-0">
                  <span className="hidden sm:flex items-center gap-1 text-text-muted">
                    <Flame size={12} className="text-orange-400" /> {entry.streak}
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-text-muted">
                    <Zap size={12} className="text-primary" /> {entry.weeklyXp}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-accent">
                    🪙 {entry.weeklyCoins}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="page-container py-10 space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
      </div>
    }>
      <LeaderboardInner />
    </Suspense>
  );
}
