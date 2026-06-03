'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Tag, Gamepad2, Bookmark, UserPlus, Zap, Trophy, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { cn, leagueIcon } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformStats {
  totals: {
    users: number;
    words: number;
    books: number;
    topics: number;
    completedGameSessions: number;
    savedWords: number;
    newUsersThisWeek: number;
  };
  leagueDistribution: { league: string; count: number }[];
  currentWeek: {
    gamesPlayed: number;
    coinsEarned: number;
    xpEarned: number;
    wordsLearned: number;
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, delay, gradient,
}: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; delay: number; gradient: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn('card-glass p-5 relative overflow-hidden')}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-5', gradient)} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br', gradient)}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-extrabold text-text-primary">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-text-muted mt-0.5">{label}</p>
        {sub && <p className="text-xs text-text-muted/60 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    api.get<PlatformStats>('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setError("Statistikani yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return <p className="text-danger text-sm">{error ?? "Ma'lumotlar yo'q."}</p>;
  }

  const { totals, currentWeek, leagueDistribution } = stats;

  // League chart: find max for relative bar width
  const maxLeague = Math.max(...leagueDistribution.map((l) => l.count), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary mb-1">Boshqaruv paneli</h1>
        <p className="text-text-muted text-sm">Plataformaning umumiy holati</p>
      </div>

      {/* ── Totals ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-4">Platformaning umumiy ko'rsatkichlari</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users size={18} className="text-white" />}      label="Jami foydalanuvchilar"    value={totals.users}                  delay={0.05} gradient="from-violet-600 to-purple-800" />
          <StatCard icon={<BookOpen size={18} className="text-white" />}   label="Jami so'zlar"    value={totals.words}                  delay={0.10} gradient="from-sky-600 to-blue-800" />
          <StatCard icon={<BookOpen size={18} className="text-white" />}   label="Kitoblar"          value={totals.books}                  delay={0.15} gradient="from-emerald-600 to-teal-800" />
          <StatCard icon={<Tag size={18} className="text-white" />}        label="Mavzular"         value={totals.topics}                 delay={0.20} gradient="from-amber-600 to-orange-800" />
          <StatCard icon={<Gamepad2 size={18} className="text-white" />}   label="O'ynalgan o'yinlar"   value={totals.completedGameSessions}  delay={0.25} gradient="from-rose-600 to-pink-800" />
          <StatCard icon={<Bookmark size={18} className="text-white" />}   label="Saqlangan so'zlar"    value={totals.savedWords}             delay={0.30} gradient="from-cyan-600 to-indigo-800" />
          <StatCard icon={<UserPlus size={18} className="text-white" />}   label="Yangi foydalanuvchilar"      value={totals.newUsersThisWeek}       delay={0.35} gradient="from-fuchsia-600 to-purple-800" sub="shu haftada" />
          <StatCard icon={<TrendingUp size={18} className="text-white" />} label="O'rganilgan so'zlar"  value={currentWeek.wordsLearned}      delay={0.40} gradient="from-green-600 to-emerald-800" sub="shu haftada" />
        </div>
      </section>

      {/* ── This Week ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-4">Joriy hafta</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Gamepad2 size={18} className="text-white" />} label="O'ynalgan o'yinlar"  value={currentWeek.gamesPlayed} delay={0.45} gradient="from-violet-600 to-purple-800" />
          <StatCard icon={<span className="text-lg">🪙</span>}           label="Yutilgan tangalar"  value={currentWeek.coinsEarned} delay={0.50} gradient="from-amber-500 to-orange-700" />
          <StatCard icon={<Zap size={18} className="text-white" />}      label="Yutilgan XP"     value={currentWeek.xpEarned}   delay={0.55} gradient="from-sky-600 to-blue-800" />
          <StatCard icon={<Trophy size={18} className="text-white" />}   label="O'rganilgan so'zlar" value={currentWeek.wordsLearned} delay={0.60} gradient="from-emerald-600 to-teal-800" />
        </div>
      </section>

      {/* ── League Distribution ─────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-4">Ligalar bo'yicha taqsimot</h2>
        <div className="card-glass p-6 space-y-4">
          {leagueDistribution.length === 0 ? (
            <p className="text-text-muted text-sm">Hozircha liga ma'lumotlari yo'q.</p>
          ) : (
            leagueDistribution.map((l, i) => (
              <div key={l.league} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-secondary">
                    {leagueIcon(l.league)} {l.league}
                  </span>
                  <span className="text-text-muted">{l.count} ta foydalanuvchi</span>
                </div>
                <div className="h-2.5 bg-surface-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(l.count / maxLeague) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.1 * i }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
