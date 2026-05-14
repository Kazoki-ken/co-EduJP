'use client';

import Link from 'next/link';
import {
  BookOpen,
  Gamepad2,
  Trophy,
  Flame,
  Star,
  ArrowRight,
  Zap,
  Target,
  Brain,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, leagueIcon } from '@/lib/utils';
import type { Metadata } from 'next';

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const { isAuthenticated, user } = useAuth();

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/8 rounded-full blur-3xl" />
      </div>

      <div className="page-container relative text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20
                        border border-primary/30 text-primary text-sm font-medium mb-8 animate-in">
          <Star size={14} className="fill-primary" />
          AI-Powered Japanese Vocabulary SRS
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-text-primary mb-6 leading-tight animate-in">
          Master Japanese Vocabulary{' '}
          <span className="bg-gradient-to-r from-primary via-violet-400 to-diamond
                           bg-clip-text text-transparent">
            Faster Than Ever
          </span>
        </h1>

        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-in">
          Spaced-repetition games, AI chat practice, live leaderboards, and{' '}
          <span className="text-accent font-semibold">streak rewards</span> — all in one
          deep-space platform.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 animate-in">
          {isAuthenticated ? (
            <>
              <Link href="/games" className="btn-primary flex items-center gap-2 text-base px-7 py-3">
                <Gamepad2 size={18} /> Start Playing
              </Link>
              <Link href="/dictionary" className="btn-ghost flex items-center gap-2 text-base px-7 py-3">
                <BookOpen size={18} /> Browse Dictionary
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/register" className="btn-primary flex items-center gap-2 text-base px-7 py-3">
                Get Started Free <ArrowRight size={18} />
              </Link>
              <Link href="/auth/login" className="btn-ghost flex items-center gap-2 text-base px-7 py-3">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Live stats row */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-center">
          {[
            { label: 'Words Available', value: '10,000+' },
            { label: 'Daily Players',   value: '500+'    },
            { label: 'Games Played',    value: '50,000+' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-2xl font-extrabold text-text-primary">{value}</p>
              <p className="text-sm text-text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats Dashboard (authenticated) ─────────────────────────────────────────

function UserStatsCards() {
  const { user } = useAuth();
  if (!user) return null;

  const stats = [
    {
      icon: Flame,
      label: 'Day Streak',
      value: user.profile?.streak ?? 0,
      unit: 'days',
      color: 'text-orange-400',
      glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
    },
    {
      icon: Zap,
      label: 'Total XP',
      value: (user.profile?.xp ?? 0).toLocaleString(),
      unit: 'xp',
      color: 'text-primary',
      glow: 'shadow-glow-sm',
    },
    {
      icon: Star,
      label: 'Coins',
      value: (user.profile?.coins ?? 0).toLocaleString(),
      unit: '🪙',
      color: 'text-accent',
      glow: 'shadow-glow-accent',
    },
    {
      icon: BookOpen,
      label: 'Saved Words',
      value: user._count?.savedWords ?? 0,
      unit: 'words',
      color: 'text-success',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    },
  ];

  return (
    <section className="page-container py-12">
      <h2 className="text-xl font-bold text-text-primary mb-6">
        Welcome back, <span className="text-primary">{user.username}</span>! 👋
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ icon: Icon, label, value, unit, color, glow }) => (
          <div key={label} className={cn('card-glass p-5 hover:scale-[1.02] transition-transform', glow)}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={18} className={color} />
              <span className="text-sm text-text-muted">{label}</span>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-extrabold text-text-primary">{value}</span>
              <span className="text-sm text-text-muted pb-0.5">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* League badge */}
      <div className="card-glass p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{leagueIcon(user.profile?.league ?? 'BRONZE')}</span>
          <div>
            <p className="text-sm text-text-muted">Current League</p>
            <p className="font-bold text-text-primary">
              {user.profile?.league ?? 'BRONZE'} League
            </p>
          </div>
        </div>
        <Link
          href="/leaderboard"
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover
                     transition-colors font-medium"
        >
          View Rankings <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    href: '/games/test',
    icon: Brain,
    title: 'Multiple Choice',
    desc: 'Test your recall with 4-option questions',
    gradient: 'from-violet-600 to-purple-800',
    badge: 'Popular',
  },
  {
    href: '/games/write',
    icon: Target,
    title: 'Typing Practice',
    desc: 'Type the meaning from memory',
    gradient: 'from-emerald-600 to-teal-800',
    badge: null,
  },
  {
    href: '/games/match',
    icon: Zap,
    title: 'Matching Pairs',
    desc: 'Match words to their meanings',
    gradient: 'from-amber-600 to-orange-800',
    badge: null,
  },
  {
    href: '/dictionary',
    icon: BookOpen,
    title: 'Dictionary',
    desc: 'Browse and save vocabulary words',
    gradient: 'from-sky-600 to-blue-800',
    badge: null,
  },
];

function QuickActions() {
  return (
    <section className="page-container py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Quick Start</h2>
        <Link
          href="/games"
          className="text-sm text-primary hover:text-primary-hover transition-colors font-medium
                     flex items-center gap-1"
        >
          All Games <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map(({ href, icon: Icon, title, desc, gradient, badge }) => (
          <Link
            key={href}
            href={href}
            className="group relative card-glass p-5 hover:border-primary/50
                       hover:shadow-glow-sm transition-all duration-200 hover:-translate-y-1"
          >
            {badge && (
              <span className="absolute top-3 right-3 badge-chip bg-primary/20 text-primary">
                {badge}
              </span>
            )}
            <div className={cn(
              'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4',
              gradient,
            )}>
              <Icon size={20} className="text-white" />
            </div>
            <h3 className="font-semibold text-text-primary mb-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-text-muted">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Features (unauthenticated) ───────────────────────────────────────────────

const FEATURES = [
  { icon: '🧠', title: 'Smart SRS Engine', desc: 'Words resurface exactly when you\'re about to forget them — 5 mastery levels, scientifically spaced.' },
  { icon: '🎮', title: '4 Game Modes', desc: 'Multiple choice, typing, matching pairs, and a Space Shooter — learning that feels like play.' },
  { icon: '🤖', title: 'AI Chat Partner', desc: 'Practice any word with a Gemini-powered AI that\'s strictly focused on vocabulary.' },
  { icon: '🏆', title: 'Weekly Leagues', desc: 'Compete in Bronze → Diamond leagues. Top 20% promote, keeping the pressure fun.' },
  { icon: '📊', title: 'Progress Tracking', desc: 'See your SRS level breakdown, streak history, badge collection, and weekly XP charts.' },
  { icon: '🎵', title: 'Native Pronunciation', desc: 'Every word reads aloud via Microsoft Edge\'s natural Japanese neural voices.' },
];

function FeaturesSection() {
  return (
    <section className="py-20 border-t border-border/40">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-text-primary mb-4">
            Everything You Need to Actually Remember
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Not just flashcards. A full vocabulary-first learning ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="card-glass p-6 hover:border-primary/40 transition-all duration-200">
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <HeroSection />
      {isAuthenticated && (
        <>
          <UserStatsCards />
          <QuickActions />
        </>
      )}
      {!isAuthenticated && (
        <>
          <FeaturesSection />
          {/* CTA */}
          <section className="py-20 text-center">
            <div className="page-container">
              <div className="card-glass max-w-2xl mx-auto p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary-gradient opacity-5 rounded-xl" />
                <h2 className="text-3xl font-extrabold text-text-primary mb-4 relative">
                  Ready to Start Your Journey?
                </h2>
                <p className="text-text-secondary mb-8 relative">
                  Join thousands of learners mastering Japanese vocabulary.
                </p>
                <Link
                  href="/auth/register"
                  className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2 relative"
                >
                  Create Free Account <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
