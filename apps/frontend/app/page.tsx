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
  User,
  ChevronRight,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, leagueIcon } from '@/lib/utils';

// ─── Hero Section (unauthenticated) ──────────────────────────────────────────

function HeroSection() {
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
          <Link href="/auth/register" className="btn-primary flex items-center gap-2 text-base px-7 py-3">
            {"Bepul boshlash"} <ArrowRight size={18} />
          </Link>
          <Link href="/auth/login" className="btn-ghost flex items-center gap-2 text-base px-7 py-3">
            {"Kirish"}
          </Link>
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

// ─── Authenticated Portal Dashboard ──────────────────────────────────────────

function AuthenticatedDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  // Stats for the user
  const stats = [
    {
      icon: Flame,
      label: 'Kunlik faollik',
      value: user.profile?.streak ?? 0,
      unit: 'kun',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
    },
    {
      icon: Zap,
      label: 'Umumiy XP',
      value: (user.profile?.xp ?? 0).toLocaleString(),
      unit: 'xp',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      icon: Star,
      label: 'Tangalar',
      value: (user.profile?.coins ?? 0).toLocaleString(),
      unit: 'tanga',
      color: 'text-accent',
      bg: 'bg-accent/10 border-accent/20',
    },
    {
      icon: BookOpen,
      label: 'Saqlangan so\'zlar',
      value: user._count?.savedWords ?? 0,
      unit: 'so\'z',
      color: 'text-success',
      bg: 'bg-success/10 border-success/20',
    },
  ];

  // Daily quests based on user stats
  const hasSavedWords = (user._count?.savedWords ?? 0) > 0;
  const hasXp = (user.profile?.xp ?? 0) > 0;

  const quests = [
    { id: 1, text: "Lug'atdan yangi so'z o'rganish", xp: 10, done: hasSavedWords },
    { id: 2, text: "1 ta interaktiv o'yin o'ynash", xp: 15, done: hasXp },
    { id: 3, text: "AI Suhbatdosh bilan suhbat", xp: 25, done: false },
  ];
  
  const completedQuestsCount = quests.filter(q => q.done).length;

  const menuItems = [
    {
      href: '/dictionary',
      icon: BookOpen,
      title: 'Lug\'at & Mavzular',
      desc: 'Mavzular va kitob darsliklari kesimida so\'zlarni o\'rganing',
      gradient: 'from-blue-500 to-indigo-600',
      badge: 'Lug\'at',
    },
    {
      href: '/games',
      icon: Gamepad2,
      title: 'Mashg\'ulotlar & O\'yinlar',
      desc: 'Juftlik moslash, testlar va SRS o\'yinlar amaliyoti',
      gradient: 'from-purple-500 to-pink-600',
      badge: 'SRS',
    },
    {
      href: '/chat',
      icon: Brain,
      title: 'AI Chat (Suhbatdosh)',
      desc: 'Sun\'iy idrok bilan yapon tilida jonli muloqot qiling',
      gradient: 'from-emerald-500 to-teal-600',
      badge: 'AI Partner',
    },
    {
      href: '/leaderboard',
      icon: Trophy,
      title: 'Haftalik Reyting (Ligalar)',
      desc: 'Olmos ligasigacha ko\'tarilib raqobatlashing',
      gradient: 'from-amber-500 to-orange-600',
      badge: 'Ligalar',
    },
    {
      href: '/tools',
      icon: Wrench,
      title: 'Yordamchi Asboblar',
      desc: 'Pomodoro taymeri va Yapon alifbosi asboblari',
      gradient: 'from-sky-500 to-cyan-600',
      badge: 'Asboblar',
    },
    {
      href: '/profile',
      icon: User,
      title: 'Mening Profilim',
      desc: 'O\'rganish tarixi va erishilgan yutuqlar hisoboti',
      gradient: 'from-violet-500 to-purple-600',
      badge: 'Profil',
    },
  ];

  return (
    <div className="page-container py-10 space-y-10 animate-fade-in">
      
      {/* ── Welcome Banner ── */}
      <div className="card-glass p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border-primary/20">
        <div className="absolute inset-0 bg-primary-gradient opacity-[0.03] rounded-2xl pointer-events-none" />
        <div className="space-y-3 text-center md:text-left relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/25 border border-primary/30 text-primary text-xs font-semibold">
            <Sparkles size={12} className="text-primary-hover animate-pulse" />
            {"Yapon tili sari olg'a!"}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">
            {"Konnichiwa, "}<span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">{user.username}</span>! 🇯🇵
          </h1>
          <p className="text-text-secondary text-sm max-w-md leading-relaxed">
            {"Bugun yapon tili so'zlarini oraliqli takrorlash (SRS) orqali yod olish va bilimingizni oshirish uchun ajoyib kun!"}
          </p>
        </div>
        
        {/* League badge info */}
        <div className="flex items-center gap-4 bg-surface-2/70 border border-border/40 p-4.5 rounded-2xl shrink-0 relative z-10 shadow-glass">
          <span className="text-4xl filter drop-shadow-[0_4px_10px_rgba(109,40,217,0.3)]">
            {leagueIcon(user.profile?.league ?? 'BRONZE')}
          </span>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{"Joriy Liga"}</p>
            <p className="font-extrabold text-base text-text-primary mt-0.5">
              {{
                BRONZE: 'Bronza',
                SILVER: 'Kumush',
                GOLD: 'Oltin',
                PLATINUM: 'Platina',
                DIAMOND: 'Olmos',
              }[user.profile?.league ?? 'BRONZE'] ?? (user.profile?.league ?? 'BRONZE')}{" ligasi"}
            </p>
            <Link href="/leaderboard" className="text-xs text-primary font-bold flex items-center gap-1 mt-1.5 hover:text-primary-hover transition-colors group">
              {"Batafsil reyting"} <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Quick Practice Banner ── */}
      <div className="card-glass p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-primary/10 via-surface to-surface border border-primary/35 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-glow-sm hover:border-primary/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="space-y-2 text-center md:text-left">
          <div className="badge-chip bg-primary text-white text-[10px] uppercase tracking-wider font-extrabold">Active Learning</div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight">{"Bugungi Mashg'ulot 🚀"}</h2>
          <p className="text-xs text-text-secondary max-w-lg leading-relaxed">
            {"Spaced-repetition (SRS) tizimi xotirangizni mustahkamlash uchun navbatdagi yaponcha so'zlarni tayyorlab qo'ydi. Hozir boshlang va 50 XP gacha yuting!"}
          </p>
        </div>
        <Link href="/games" className="btn-primary flex items-center gap-2 text-sm px-6 py-3 shrink-0 shadow-glow group hover:-translate-y-0.5 transition-all">
          {"Mashq qilishni boshlash"} <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Daily Quests & Stats Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Quests Card */}
        <div className="card-glass p-6 border-border/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="text-lg">🎯</span> Kunlik topshiriqlar
              </h2>
              <span className="text-xs font-bold text-primary">
                {completedQuestsCount}/{quests.length} bajarildi
              </span>
            </div>

            {/* Quests list */}
            <div className="space-y-3">
              {quests.map((q) => (
                <div key={q.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors", q.done ? "bg-success/5 border-success/20 text-text-secondary" : "bg-surface-2/30 border-border/40")}>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all", q.done ? "border-success bg-success text-white border-transparent" : "border-text-muted bg-transparent")}>
                    {q.done && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold truncate", q.done && "line-through text-text-muted")}>{q.text}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Mukofot: +{q.xp} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-6 pt-4 border-t border-border/20">
            <div className="flex justify-between text-xs text-text-muted mb-1.5 font-bold">
              <span>Kunlik taraqqiyot</span>
              <span>{Math.round((completedQuestsCount / quests.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden border border-border/30">
              <div
                className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                style={{ width: `${(completedQuestsCount / quests.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* User stats grid (Takes 2 cols on lg) */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">{"O'rganish ko'rsatkichlari"}</h2>
            <div className="grid grid-cols-2 gap-4">
              {stats.map(({ icon: Icon, label, value, unit, color, bg }) => (
                <div key={label} className={cn('card-glass p-5 hover:border-primary/30 transition-all border border-border/40 flex items-center justify-between gap-4 group')}>
                  <div className="space-y-1">
                    <p className="text-xs text-text-muted font-bold uppercase tracking-wider">{label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-text-primary tracking-tight group-hover:text-primary-hover transition-colors">{value}</span>
                      <span className="text-xs text-text-secondary font-medium">{unit}</span>
                    </div>
                  </div>
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105', bg)}>
                    <Icon size={20} className={color} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Japanese Word / Wisdom Card */}
          <div className="card-glass p-5 border-border/40 bg-surface-2/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                <span>📖</span> Bugungi Yapon So'zi
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-text-primary tracking-wide">木漏れ日</span>
                <span className="text-sm text-primary font-semibold">(Komorebi)</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {"Daraxt barglari orasidan suzilib o'tuvchi quyosh nurlari."}
              </p>
            </div>
            <Link href="/dictionary" className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 px-3.5 py-2 rounded-xl transition-all self-stretch sm:self-auto text-center justify-center">
              {"Lug'atni o'rganish"} <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── App Navigation Menu (Bo'limlar) ── */}
      <div className="space-y-5">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">{"Ilova bo'limlari"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {menuItems.map(({ href, icon: Icon, title, desc, gradient, badge }) => (
            <Link
              key={href}
              href={href}
              className="group card-glass p-6 hover:border-primary/50 hover:shadow-glow-sm transition-all duration-300 hover:-translate-y-1 border border-border/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform duration-300', gradient)}>
                    <Icon size={20} />
                  </div>
                  <span className="badge-chip text-[10px] bg-surface-2 border border-border/40 text-text-muted px-2 py-0.5">
                    {badge}
                  </span>
                </div>
                <h3 className="font-extrabold text-text-primary mb-1 group-hover:text-primary transition-colors text-base">
                  {title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">{desc}</p>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-primary font-bold pt-2 border-t border-border/20 group-hover:gap-1.5 transition-all">
                <span>{"Bo'limga o'tish"}</span>
                <ChevronRight size={13} className="mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
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

  return (
    <div className="animate-fade-in">
      <HeroSection />
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
    </div>
  );
}
