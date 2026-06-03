'use client';

import Link from 'next/link';
import {
  BookOpen,
  Gamepad2,
  Flame,
  Star,
  ArrowRight,
  Zap,
  Target,
  Brain,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, leagueIcon } from '@/lib/utils';

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const { isAuthenticated } = useAuth();

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
          {"Sun'iy idrokka asoslangan yapon tili so'z boyligi SRS tizimi"}
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-text-primary mb-6 leading-tight animate-in">
          {"Yapon tili so'zlarini"}{' '}
          <span className="bg-gradient-to-r from-primary via-violet-400 to-diamond
                           bg-clip-text text-transparent">
            {"har qachongidan tezroq o'rganing"}
          </span>
        </h1>

        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-in">
          {"Interaktiv oraliqli takrorlash o'yinlari, AI chat amaliyoti, jonli reytinglar va faollik mukofotlari — hammasi bitta zamonaviy platformada."}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 animate-in">
          {isAuthenticated ? (
            <>
              <Link href="/games" className="btn-primary flex items-center gap-2 text-base px-7 py-3">
                <Gamepad2 size={18} /> {"O'yinni boshlash"}
              </Link>
              <Link href="/dictionary" className="btn-ghost flex items-center gap-2 text-base px-7 py-3">
                <BookOpen size={18} /> {"Lug'atni ko'rish"}
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/register" className="btn-primary flex items-center gap-2 text-base px-7 py-3">
                {"Bepul boshlash"} <ArrowRight size={18} />
              </Link>
              <Link href="/auth/login" className="btn-ghost flex items-center gap-2 text-base px-7 py-3">
                {"Kirish"}
              </Link>
            </>
          )}
        </div>

        {/* Live stats row */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-center">
          {[
            { label: 'Mavjud so\'zlar', value: '10,000+' },
            { label: 'Kunlik o\'yinchilar',   value: '500+'    },
            { label: 'O\'ynalgan o\'yinlar',    value: '50,000+' },
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
      label: 'Kunlik faollik',
      value: user.profile?.streak ?? 0,
      unit: 'kun',
      color: 'text-orange-400',
      glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
    },
    {
      icon: Zap,
      label: 'Umumiy XP',
      value: (user.profile?.xp ?? 0).toLocaleString(),
      unit: 'xp',
      color: 'text-primary',
      glow: 'shadow-glow-sm',
    },
    {
      icon: Star,
      label: 'Tangalar',
      value: (user.profile?.coins ?? 0).toLocaleString(),
      unit: 'tangalar',
      color: 'text-accent',
      glow: 'shadow-glow-accent',
    },
    {
      icon: BookOpen,
      label: 'Saqlangan so\'zlar',
      value: user._count?.savedWords ?? 0,
      unit: 'so\'z',
      color: 'text-success',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    },
  ];

  return (
    <section className="page-container py-12">
      <h2 className="text-xl font-bold text-text-primary mb-6">
        {"Xush kelibsiz,"} <span className="text-primary">{user.username}</span>! 👋
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
            <p className="text-sm text-text-muted">{"Joriy liga"}</p>
            <p className="font-bold text-text-primary">
              {{
                BRONZE: 'Bronza',
                SILVER: 'Kumush',
                GOLD: 'Oltin',
                PLATINUM: 'Platina',
                DIAMOND: 'Olmos',
              }[user.profile?.league ?? 'BRONZE'] ?? (user.profile?.league ?? 'BRONZE')}{" ligasi"}
            </p>
          </div>
        </div>
        <Link
          href="/leaderboard"
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover
                     transition-colors font-medium"
        >
          {"Reytingni ko'rish"} <ArrowRight size={14} />
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
    title: 'Test savollari',
    desc: '4 ta variantli savollar bilan eslab qolishni sinang',
    gradient: 'from-violet-600 to-purple-800',
    badge: 'Ommabop',
  },
  {
    href: '/games/write',
    icon: Target,
    title: 'Yozish amaliyoti',
    desc: 'Tarjimani xotiradan klaviaturada yozing',
    gradient: 'from-emerald-600 to-teal-800',
    badge: null,
  },
  {
    href: '/games/match',
    icon: Zap,
    title: 'Mos juftliklar',
    desc: "So'zlarni o'z tarjimalariga moslashtiring",
    gradient: 'from-amber-600 to-orange-800',
    badge: null,
  },
  {
    href: '/dictionary',
    icon: BookOpen,
    title: "Lug'at",
    desc: "So'zlarni ko'rib chiqing va saqlab boring",
    gradient: 'from-sky-600 to-blue-800',
    badge: null,
  },
];

function QuickActions() {
  return (
    <section className="page-container py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">{"Tezkor boshlash"}</h2>
        <Link
          href="/games"
          className="text-sm text-primary hover:text-primary-hover transition-colors font-medium
                     flex items-center gap-1"
        >
          {"Barcha o'yinlar"} <ArrowRight size={14} />
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
  { icon: '🧠', title: 'Aqlli SRS tizimi', desc: "So'zlar siz ularni unutish arafasida bo'lganingizda chiqadi — 5 xil o'zlashtirish darajasi, ilmiy oraliqli takrorlash." },
  { icon: '🎮', title: "4 xil o'yin rejimi", desc: "Test, yozish, juftliklarni moslashtirish va Space Shooter — o'yin orqali maroqli o'rganish." },
  { icon: '🤖', title: 'AI Suhbatdosh', desc: "Gemini sun'iy idroki yordamida yaponcha so'zlarni jonli amaliyotda sinab ko'ring." },
  { icon: '🏆', title: 'Haftalik ligalar', desc: "Bronza → Olmos ligasigacha raqobatlashing. Eng yaxshi 20% yuqori ligaga ko'tariladi." },
  { icon: '📊', title: 'Natijalarni kuzatish', desc: "O'zlashtirish darajalari, kunlik faollik tarixi, nishonlar va haftalik XP grafiklarini kuzating." },
  { icon: '🎵', title: 'Tabiiy talaffuz', desc: "Har bir so'z Microsoft Edge-ning tabiiy neyron ovozlari orqali eshittiriladi." },
];

function FeaturesSection() {
  return (
    <section className="py-20 border-t border-border/40">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-text-primary mb-4">
            {"Haqiqatdan ham eslab qolishingiz uchun barcha sharoitlar"}
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            {"Shunchaki kartochkalar emas. So'z o'rganishga yo'naltirilgan to'liq ekotizim."}
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
          <p className="text-text-muted text-sm">{"Yuklanmoqda..."}</p>
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
                  {"Sayohatni boshlashga tayyormisiz?"}
                </h2>
                <p className="text-text-secondary mb-8 relative">
                  {"Yapon tili so'zlarini o'rganayotgan minglab o'quvchilarga qo'shiling."}
                </p>
                <Link
                  href="/auth/register"
                  className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2 relative"
                >
                  {"Bepul hisob yaratish"} <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
