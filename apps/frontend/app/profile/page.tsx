'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, BookOpen, Trophy, Star, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { cn, leagueColor, leagueIcon } from '@/lib/utils';
import type { EarnedBadge, SrsUpdate } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBadgeEntry {
  earnedAt: string;
  badge: EarnedBadge;
}

interface ProgressData {
  totalSaved: number;
  dueTodayCount: number;
  levelBreakdown: { level: number; count: number }[];
}

const SRS_LEVELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Beginner',  color: 'text-red-400',    bg: 'bg-red-500'     },
  2: { label: 'Familiar',  color: 'text-orange-400', bg: 'bg-orange-500'  },
  3: { label: 'Practiced', color: 'text-yellow-400', bg: 'bg-yellow-500'  },
  4: { label: 'Advanced',  color: 'text-emerald-400',bg: 'bg-emerald-500' },
  5: { label: 'Mastered',  color: 'text-violet-400', bg: 'bg-violet-500'  },
};

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [badges,   setBadges]   = useState<UserBadgeEntry[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<UserBadgeEntry[]>('/users/me/badges'),
      api.get<ProgressData>('/users/me/progress'),
    ]).then(([b, p]) => {
      setBadges(b.data);
      setProgress(p.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="page-container py-10">
        <div className="space-y-4">
          <div className="h-10 w-48 skeleton rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
          </div>
          <div className="h-48 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container py-24 text-center">
        <p className="text-text-muted">Please sign in to view your profile.</p>
      </div>
    );
  }

  const totalWords = progress?.levelBreakdown.reduce((s, l) => s + l.count, 0) ?? 0;
  const masteredCount = progress?.levelBreakdown.find((l) => l.level === 5)?.count ?? 0;

  return (
    <div className="page-container py-10 animate-fade-in space-y-8">
      {/* ── Profile Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass p-7 flex flex-col sm:flex-row items-center sm:items-start gap-6"
      >
        {/* Avatar */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 border-2 border-primary/50
                          flex items-center justify-center text-3xl font-black text-primary
                          shadow-glow animate-pulse-glow">
            {user.username[0]?.toUpperCase()}
          </div>
          <span className="absolute -bottom-2 -right-2 text-2xl">
            {leagueIcon(user.profile?.league ?? 'BRONZE')}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold text-text-primary">{user.username}</h1>
          <p className="text-text-muted text-sm">{user.email}</p>
          <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
            <span className={cn('badge-chip border', leagueColor(user.profile?.league ?? 'BRONZE'))}>
              {leagueIcon(user.profile?.league ?? 'BRONZE')} {user.profile?.league ?? 'BRONZE'} League
            </span>
            <span className="badge-chip bg-surface-2 text-text-muted border border-border">
              Member since {new Date(user.createdAt).getFullYear()}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {[
            { icon: <Flame size={16} className="text-orange-400" />, val: user.profile?.streak ?? 0,   label: 'Day streak'  },
            { icon: <Zap   size={16} className="text-primary"     />, val: user.profile?.xp ?? 0,      label: 'Total XP'    },
            { icon: <span className="text-base">🪙</span>,             val: user.profile?.coins ?? 0,   label: 'Coins'       },
            { icon: <Trophy size={16} className="text-accent"     />, val: badges.length,               label: 'Badges'      },
          ].map(({ icon, val, label }) => (
            <div key={label} className="bg-surface-2 border border-border rounded-xl p-3 text-center">
              <div className="flex justify-center mb-1">{icon}</div>
              <p className="font-extrabold text-lg text-text-primary">{val.toLocaleString()}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── SRS Progress ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" /> SRS Progress
        </h2>
        <div className="card-glass p-6 space-y-4">
          {/* Overview */}
          <div className="flex flex-wrap gap-4 text-sm mb-2">
            <span className="text-text-muted">
              Total tracked: <span className="text-text-primary font-semibold">{totalWords}</span>
            </span>
            <span className="text-text-muted">
              Mastered: <span className="text-violet-400 font-semibold">{masteredCount}</span>
            </span>
            <span className="text-text-muted">
              Due today: <span className="text-accent font-semibold">{progress?.dueTodayCount ?? 0}</span>
            </span>
          </div>

          {/* Level bars */}
          {totalWords > 0 && [1, 2, 3, 4, 5].map((lvl) => {
            const entry = progress?.levelBreakdown.find((l) => l.level === lvl);
            const count = entry?.count ?? 0;
            const pct   = totalWords > 0 ? (count / totalWords) * 100 : 0;
            const meta  = SRS_LEVELS[lvl]!;

            return (
              <div key={lvl} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={cn('font-medium', meta.color)}>
                    Lv {lvl} — {meta.label}
                  </span>
                  <span className="text-text-muted">{count} words</span>
                </div>
                <div className="h-2.5 bg-surface-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: lvl * 0.08, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', meta.bg)}
                  />
                </div>
              </div>
            );
          })}

          {totalWords === 0 && (
            <p className="text-center text-text-muted py-6">
              No progress yet. Play a game to start tracking your SRS levels!
            </p>
          )}
        </div>
      </section>

      {/* ── Badge Showcase ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-accent" /> Badge Showcase
          <span className="text-sm font-normal text-text-muted ml-1">({badges.length} earned)</span>
        </h2>

        {badges.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <p className="text-4xl mb-3">🏅</p>
            <p className="text-text-muted">No badges yet. Keep playing to unlock them!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map(({ badge, earnedAt }, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                className="card-glass p-5 flex flex-col items-center text-center gap-3
                           hover:border-accent/50 hover:shadow-glow-accent transition-all"
              >
                <span className="text-4xl">{badge.icon ?? '🏅'}</span>
                <div>
                  <p className="font-bold text-sm text-text-primary">{badge.name}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{badge.description}</p>
                </div>
                <p className="text-xs text-text-muted/60 border-t border-border/50 pt-2 w-full">
                  {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
