'use client';

import Link from 'next/link';
import {
  BookOpen,
  Gamepad2,
  Flame,
  Star,
  ArrowRight,
  Zap,
  Brain,
  Wrench,
  ChevronRight,
  Trophy,
  Sparkles,
  Check,
  Library,
  Volume2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TierStrip } from '@/components/premium/SubscriptionCard';
import { speakWord } from '@/lib/speak';
import { useDashboard } from '@/hooks/useDashboard';
import { LandingPage } from '@/components/landing/LandingPage';
import { cn, leagueIcon } from '@/lib/utils';

const LEAGUE_NAMES: Record<string, string> = {
  BRONZE: 'Bronza',
  SILVER: 'Kumush',
  GOLD: 'Oltin',
  PLATINUM: 'Platina',
  DIAMOND: 'Olmos',
};

// ─── Authenticated Portal Dashboard ──────────────────────────────────────────

function AuthenticatedDashboard() {
  const { user } = useAuth();
  const { data, isLoading: dataLoading } = useDashboard(!!user);

  if (!user) return null;

  const profile = user.profile;
  const league = profile?.league ?? 'BRONZE';

  /**
   * Daily goals driven by the per-day counters the backend already resets at
   * local midnight. The previous version checked lifetime totals, so the first
   * two "daily" goals ticked green forever and the third was hardcoded to
   * never complete.
   */
  const goals = [
    {
      id: 'test',
      text: 'Test o’yinini o’ynang',
      href: '/games/test',
      done: (profile?.dailyTestCount ?? 0) > 0,
    },
    {
      id: 'match',
      text: 'Juftlik moslash o’yini',
      href: '/games/match',
      done: (profile?.dailyMatchCount ?? 0) > 0,
    },
    {
      id: 'write',
      text: 'Yozish mashqi',
      href: '/games/write',
      done: (profile?.dailyWriteCount ?? 0) > 0,
    },
  ];
  const doneGoals = goals.filter((g) => g.done).length;

  const menuItems = [
    {
      href: '/dictionary',
      icon: BookOpen,
      title: "Lug'at & Mavzular",
      desc: "10 000+ so'z, mavzular kesimida",
    },
    {
      href: '/library',
      icon: Library,
      title: "Mening lug'atim",
      desc: "O'z mavzu va kitoblaringizni yarating",
    },
    {
      href: '/games',
      icon: Gamepad2,
      title: "Mashg'ulot & O'yinlar",
      desc: "Test, juftlik, yozish va Space Shooter",
    },
    {
      href: '/chat',
      icon: Brain,
      title: 'AI Suhbatdosh',
      desc: "So'zlarni sun'iy idrok bilan mashq qiling",
    },
    {
      href: '/leaderboard',
      icon: Trophy,
      title: 'Haftalik reyting',
      desc: "Olmos ligasigacha ko'tarilib raqobatlashing",
    },
    {
      href: '/tools',
      icon: Wrench,
      title: 'Uskunalar',
      desc: 'Pomodoro taymeri va yapon alifbosi',
    },
  ];
  return (
    <div className="page-container py-8 space-y-8 animate-fade-in">

      {/* ── Header: greeting + the four numbers, in one compact strip ──────
          Previously two full-width banners stacked on top of each other, so
          the actual study content started below the fold. */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold mb-2">
            <Sparkles size={12} />
            {"Yapon tili sari olg'a"}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
            {'Konnichiwa, '}
            <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
              {user.username}
            </span>
            ! 🇯🇵
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HeaderStat
            icon={Flame}
            value={profile?.streak ?? 0}
            label="kun"
            tone={(profile?.streak ?? 0) > 0 ? 'flame' : 'muted'}
          />
          <HeaderStat icon={Zap} value={(profile?.xp ?? 0).toLocaleString()} label="XP" tone="primary" />
          <HeaderStat icon={Star} value={(profile?.coins ?? 0).toLocaleString()} label="tanga" tone="accent" />
          <Link
            href="/leaderboard"
            className="stat-pill hover:border-primary/40 transition-colors group"
            title={`${LEAGUE_NAMES[league] ?? league} ligasi`}
          >
            <span className="text-base leading-none">{leagueIcon(league)}</span>
            <span className="text-text-primary font-bold">{LEAGUE_NAMES[league] ?? league}</span>
            <ChevronRight size={12} className="text-text-muted group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>

      {/* ── Primary action: what the SRS actually wants you to do today ──── */}
      <ReviewCard
        isLoading={dataLoading}
        dueCount={data?.dueTodayCount ?? 0}
        totalSaved={data?.totalSaved ?? 0}
      />

      {/* Tier state, kept deliberately quiet so it sits under the review call
          to action rather than competing with it. */}
      <TierStrip />

      {/* ── Mastery + daily goals + word of the day ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Mastery breakdown — real SRS levels, the app's core mechanic and
            previously not shown anywhere on the dashboard. */}
        <div className="card-glass p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">
              {"O'zlashtirish darajalari"}
            </h2>
            <span className="text-xs text-text-muted">
              {(data?.totalSaved ?? 0).toLocaleString()} {"ta saqlangan so'z"}
            </span>
          </div>

          {dataLoading ? (
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 skeleton rounded-xl" />
              ))}
            </div>
          ) : (data?.totalSaved ?? 0) === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">
              {"So'z saqlaganingizdan keyin bu yerda o'zlashtirish darajangiz ko'rinadi."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {data!.levels.map(({ level, count }) => {
                  const max = Math.max(...data!.levels.map((l) => l.count), 1);
                  return (
                    <div key={level} className="flex flex-col items-center gap-2 min-w-0">
                      <div className="w-full h-20 bg-surface-2/40 rounded-xl border border-border/40 flex items-end overflow-hidden">
                        <div
                          className={cn(
                            'w-full rounded-b-[10px] transition-all duration-500',
                            level === 5 ? 'bg-accent' : 'bg-primary',
                          )}
                          style={{ height: `${Math.max((count / max) * 100, count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                      <div className="text-center min-w-0">
                        <p className="text-sm font-extrabold text-text-primary leading-none">{count}</p>
                        {/* Just the level number — spelling it out does not fit
                            five columns on a 375px screen. The legend below
                            explains what the ends of the scale mean. */}
                        <p
                          className={cn(
                            'text-[10px] mt-1',
                            level === 5 ? 'text-accent font-bold' : 'text-text-muted',
                          )}
                        >
                          {level}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-text-muted mt-3 text-center">
                {"1 — yangi so'z · "}
                <span className="text-accent font-semibold">{"5 — o'zlashtirilgan"}</span>
              </p>
            </>
          )}
        </div>

        {/* Daily goals — driven by counters the server resets each day. */}
        <div className="card-glass p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">
              Bugungi maqsadlar
            </h2>
            <span className="text-xs font-bold text-primary">{doneGoals}/{goals.length}</span>
          </div>

          <div className="space-y-2 flex-1">
            {goals.map((g) => (
              <Link
                key={g.id}
                href={g.href}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                  g.done
                    ? 'bg-success/5 border-success/25'
                    : 'bg-surface-2/30 border-border/40 hover:border-primary/40',
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    g.done ? 'bg-success border-success text-white' : 'border-text-muted',
                  )}
                >
                  {g.done && <Check size={11} strokeWidth={3} />}
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold flex-1 min-w-0 truncate',
                    g.done ? 'text-text-muted line-through' : 'text-text-secondary',
                  )}
                >
                  {g.text}
                </span>
                {!g.done && <ChevronRight size={13} className="text-text-muted shrink-0" />}
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                style={{ width: `${(doneGoals / goals.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Word of the day — a real dictionary entry, rotating daily ────── */}
      {data?.wordOfTheDay && <WordOfTheDay word={data.wordOfTheDay} />}

      {/* ── Sections ──────────────────────────────────────────────────────
          Compact rows rather than six large gradient tiles: this repeats the
          sidebar, so it should not dominate the page. */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">
          {"Ilova bo'limlari"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {menuItems.map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group card-glass p-4 flex items-center gap-3.5 border border-border/40
                         hover:border-primary/50 hover:shadow-glow-sm transition-all duration-200"
            >
              <span className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary group-hover:scale-105 transition-transform">
                <Icon size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-text-primary truncate group-hover:text-primary transition-colors">
                  {title}
                </span>
                <span className="block text-[11px] text-text-muted truncate">{desc}</span>
              </span>
              <ChevronRight size={15} className="text-text-muted group-hover:text-primary transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard pieces ─────────────────────────────────────────────────────────

function HeaderStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Flame;
  value: number | string;
  label: string;
  tone: 'flame' | 'primary' | 'accent' | 'muted';
}) {
  const toneClass = {
    flame: 'text-orange-400',
    primary: 'text-primary',
    accent: 'text-accent',
    muted: 'text-text-muted',
  }[tone];

  return (
    <div className="stat-pill">
      <Icon size={13} className={toneClass} />
      <span className="text-text-primary font-bold">{value}</span>
      <span className="text-text-muted text-xs">{label}</span>
    </div>
  );
}

/**
 * The one thing the dashboard should push: words the SRS says are due now.
 *
 * Three states, because the right call to action genuinely differs — nothing
 * saved yet, nothing due right now, or N words waiting.
 */
function ReviewCard({
  isLoading,
  dueCount,
  totalSaved,
}: {
  isLoading: boolean;
  dueCount: number;
  totalSaved: number;
}) {
  if (isLoading) {
    return <div className="h-28 skeleton rounded-xl" />;
  }

  if (totalSaved === 0) {
    return (
      <div className="card-glass p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-border/50">
        <div>
          <h2 className="text-lg font-black text-text-primary">{"Birinchi so'zlaringizni saqlang"}</h2>
          <p className="text-sm text-text-secondary mt-1">
            {"O'yin boshlash uchun kamida 4 ta saqlangan so'z kerak."}
          </p>
        </div>
        <Link href="/dictionary" className="btn-primary flex items-center gap-2 text-sm shrink-0">
          {"Lug'atga o'tish"} <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  if (dueCount === 0) {
    return (
      <div className="card-glass p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-success/30 bg-success/[0.04]">
        <div className="flex items-center gap-3.5">
          <span className="w-11 h-11 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center text-success shrink-0">
            <Check size={20} strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-lg font-black text-text-primary">{"Bugungi takrorlash tugadi"}</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {"Navbatdagi so'zlar vaqti kelganda shu yerda paydo bo'ladi."}
            </p>
          </div>
        </div>
        <Link href="/games" className="btn-ghost flex items-center gap-2 text-sm shrink-0">
          {"Baribir mashq qilish"} <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="card-glass p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5
                    border-primary/40 bg-gradient-to-r from-primary/10 to-transparent shadow-glow-sm">
      <div className="flex items-center gap-4">
        <div className="text-center shrink-0">
          <p className="text-4xl font-black text-primary leading-none">{dueCount}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">
            {"so'z"}
          </p>
        </div>
        <div className="w-px h-12 bg-border/60 shrink-0" />
        <div>
          <h2 className="text-lg font-black text-text-primary">{'Bugun takrorlash kerak'}</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {"Oraliqli takrorlash tizimi bu so'zlarni unutish arafangizda tanladi."}
          </p>
        </div>
      </div>

      {/* The combined mode is the review mode now. It needs no ?due=1: the
          server already deals SRS-due words into a session before anything
          else, so the rounds open with exactly what is waiting. */}
      <Link
        href="/games/mixed"
        className="btn-primary flex items-center gap-2 text-sm px-5 py-3 shrink-0 shadow-glow
                   hover:-translate-y-0.5 transition-all group"
      >
        {'Takrorlashni boshlash'}
        <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}

function WordOfTheDay({ word }: { word: { id: string; japaneseWord: string; hiragana: string; meaning: string } }) {
  const speak = () => { void speakWord(word); };

  return (
    <div className="card-glass p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-border/40">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
          <span>📖</span> {"Bugungi so'z"}
        </div>
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="text-2xl font-black text-text-primary tracking-wide">
            {word.japaneseWord}
          </span>
          {word.hiragana && word.hiragana !== word.japaneseWord && (
            <span className="text-sm text-primary font-semibold">({word.hiragana})</span>
          )}
          <button
            onClick={speak}
            title="Talaffuzni eshitish"
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
          >
            <Volume2 size={15} />
          </button>
        </div>
        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{word.meaning}</p>
      </div>

      <Link
        href={`/dictionary/words?search=${encodeURIComponent(word.japaneseWord)}`}
        className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1
                   border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10
                   px-3.5 py-2 rounded-xl transition-all shrink-0 justify-center"
      >
        {"Lug'atda ko'rish"} <ChevronRight size={14} />
      </Link>
    </div>
  );

}

// ─── Main HomePage ────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">{"Yuklanmoqda..."}</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <AuthenticatedDashboard />;
  }

  return <LandingPage />;
}
