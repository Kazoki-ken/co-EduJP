'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  BookOpen,
  Check,
  ChevronDown,
  Crown,
  Flame,
  Gamepad2,
  GraduationCap,
  Headphones,
  Layers,
  LineChart,
  Minus,
  Repeat,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Volume2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteName } from '@/lib/siteConfig';

/**
 * The signed-out landing page.
 *
 * A visitor who has never seen the product needs to be told what it is before
 * being handed the app's navigation, so this page — not the dashboard — is the
 * first screen. Every claim below describes something the app actually does;
 * no user counts or testimonials are invented.
 *
 * Section ids match the anchors in the guest navbar (components/layout/NavBar).
 */

// ─── Sakura ambience ──────────────────────────────────────────────────────────

interface Petal {
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  opacity: number;
}

/**
 * Petals are randomised, so they are mounted only on the client — rendering
 * them during SSR would hand React a different tree than the browser builds.
 */
function HeroPetals({ count = 12 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const petals = useMemo<Petal[]>(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 14,
        duration: 13 + Math.random() * 12,
        size: 7 + Math.random() * 9,
        drift: (Math.random() - 0.5) * 160,
        opacity: 0.12 + Math.random() * 0.28,
      })),
    [count],
  );

  if (!mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {petals.map((p, i) => (
        <span
          key={i}
          className="sakura-petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.85,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Small shared pieces ──────────────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : '')}>
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2/70 border border-border/60',
          'text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted mb-5',
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        {eyebrow}
      </div>
      <h2 className="text-3xl md:text-[2.6rem] leading-[1.1] font-black text-text-primary tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-text-secondary mt-4 text-base md:text-lg leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

// ─── 1. Hero ──────────────────────────────────────────────────────────────────

function Hero() {
  const siteName = useSiteName();

  return (
    <section className="relative overflow-hidden pt-14 pb-20 md:pt-20 md:pb-28">
      {/* Ambient light */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-[8%] w-[26rem] h-[26rem] bg-accent/10 rounded-full blur-3xl" />
      </div>
      <HeroPetals />

      <div className="page-container relative">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">

          {/* ── Copy ─────────────────────────────────────────────── */}
          <div className="text-center lg:text-left animate-in">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                         bg-primary/10 border border-primary/25 text-primary
                         text-xs sm:text-[13px] font-bold mb-7"
            >
              <Sparkles size={13} />
              {"Oraliqli takrorlash · O'yinlar · AI suhbatdosh"}
            </div>

            <h1 className="text-[2.5rem] sm:text-5xl lg:text-[3.6rem] font-black text-text-primary
                           leading-[1.05] tracking-tight mb-6">
              {"Yapon tili so'zlarini"}
              <br className="hidden sm:block" />{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary-hover to-accent bg-clip-text text-transparent">
                  {"unutmaydigan qilib"}
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-primary/35"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 8 C 50 2, 150 2, 198 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{' '}
              {"o'rganing"}
            </h1>

            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto lg:mx-0 mb-9">
              <b className="text-text-primary font-bold">{siteName}</b>
              {" — yaponcha so'z boyligi uchun to'liq platforma: ilmiy oraliqli takrorlash (SRS) so'zni aynan unutish arafangizda qaytaradi, o'yinlar esa takrorlashni zerikarli mashqdan qiziqarli odatga aylantiradi."}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mb-7">
              <Link
                href="/auth/register"
                className="btn-primary inline-flex items-center justify-center gap-2 text-base px-7 py-3.5
                           shadow-glow hover:-translate-y-0.5 group"
              >
                {'Bepul boshlash'}
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/dictionary"
                className="btn-ghost inline-flex items-center justify-center gap-2 text-base px-7 py-3.5"
              >
                <BookOpen size={17} />
                {"Lug'atni ko'rish"}
              </Link>
            </div>

            <ul className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-[13px] text-text-muted font-medium">
              {['Karta kerak emas', "Takrorlash abadiy bepul", "O'zbek tilida"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-success" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Product preview ──────────────────────────────────── */}
          <HeroPreview />
        </div>

        {/* ── Facts strip ───────────────────────────────────────── */}
        <div className="mt-16 md:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { value: '10 000+', label: "Lug'atdagi so'zlar" },
            { value: '6', label: "O'yin rejimi" },
            { value: 'N5–N1', label: 'JLPT darajalari' },
            { value: '5', label: "O'zlashtirish bosqichi" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="card-glass px-4 py-5 text-center border-border/50"
            >
              <p className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">{value}</p>
              <p className="text-[11px] md:text-xs text-text-muted mt-1.5 font-semibold uppercase tracking-wider">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A static mock of a review card — what the learner actually sees inside. */
function HeroPreview() {
  return (
    <div className="relative animate-in">
      {/* Glow behind the card */}
      <div className="absolute inset-6 bg-primary/15 blur-3xl rounded-full pointer-events-none" aria-hidden="true" />

      <div className="relative card-glass p-6 sm:p-7 border-border/70 shadow-glass">
        {/* Card header */}
        <div className="flex items-center justify-between mb-6">
          <span className="badge-chip bg-primary/12 text-primary border border-primary/25">
            <Repeat size={11} /> {"Bugungi takrorlash"}
          </span>
          <span className="text-xs font-bold text-text-muted">3 / 12</span>
        </div>

        {/* Word */}
        <div className="text-center py-4">
          <p className="text-xs text-primary font-bold tracking-widest mb-2">にほんご</p>
          <p className="text-5xl sm:text-6xl font-black text-text-primary tracking-wider mb-3">
            日本語
          </p>
          <div className="inline-flex items-center gap-2 text-text-secondary">
            <span className="text-base font-semibold">yapon tili</span>
            <span className="p-1.5 rounded-lg bg-surface-2 border border-border/60 text-primary">
              <Volume2 size={13} />
            </span>
          </div>
        </div>

        {/* SRS levels */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              {"O'zlashtirish darajasi"}
            </span>
            <span className="text-[10px] font-bold text-primary">3 / 5</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <span
                key={lvl}
                className={cn(
                  'h-2 flex-1 rounded-full',
                  lvl <= 3 ? 'bg-primary' : 'bg-surface-2 border border-border/50',
                )}
              />
            ))}
          </div>
        </div>

        {/* Answer buttons */}
        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <span className="rounded-xl border border-border/60 bg-surface-2/50 py-2.5 text-center text-sm font-bold text-text-secondary">
            {"Qiyin"}
          </span>
          <span className="rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-white shadow-glow-sm">
            {"Bildim"}
          </span>
        </div>
      </div>

      {/* Floating chips */}
      <div
        className="absolute -top-4 -left-3 sm:-left-6 card-glass px-3.5 py-2.5 flex items-center gap-2
                   border-border/70 animate-float"
      >
        <Flame size={16} className="text-orange-400" />
        <span className="text-sm font-black text-text-primary">12</span>
        <span className="text-[11px] text-text-muted font-semibold">kunlik seriya</span>
      </div>

      <div
        className="absolute -bottom-5 -right-2 sm:-right-6 card-glass px-3.5 py-2.5 flex items-center gap-2
                   border-accent/40 animate-float"
        style={{ animationDelay: '1.2s' }}
      >
        <Zap size={16} className="text-accent" />
        <span className="text-sm font-black text-text-primary">+250</span>
        <span className="text-[11px] text-text-muted font-semibold">XP</span>
      </div>
    </div>
  );
}

// ─── 2. Problem → solution ────────────────────────────────────────────────────

const PAINS = [
  {
    pain: "Bugun yodladingiz — bir haftadan keyin unutdingiz.",
    fix: "SRS har bir so'zni shaxsiy unutish egri chizig'ingiz bo'yicha qaytaradi.",
  },
  {
    pain: "Kartochkalar zerikarli, bir necha kundan keyin tashlab yuboriladi.",
    fix: "6 xil o'yin rejimi: takrorlash mashq emas, o'yinga aylanadi.",
  },
  {
    pain: "So'zni bilasiz-u, gapda ishlata olmaysiz.",
    fix: "AI suhbatdosh o'sha so'zlar bilan jonli dialog quradi.",
  },
];

function WhySection() {
  return (
    <section className="py-20 md:py-24 border-t border-border/40 scroll-mt-20">
      <div className="page-container">
        <SectionHeading
          eyebrow="Muammo"
          title={"Yodlash emas — esda qolish"}
          subtitle={"Ko'pchilik yaponcha so'zlarni o'rganishni tashlab yuborishining uchta sababi bor. Ilova uchalasini ham hal qiladi."}
        />

        <div className="grid md:grid-cols-3 gap-4 mt-12">
          {PAINS.map(({ pain, fix }, i) => (
            <div
              key={pain}
              className="card-glass p-6 border-border/50 hover:border-primary/40 transition-colors duration-200"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg
                               bg-surface-2 border border-border/60 text-xs font-black text-text-muted mb-5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="flex items-start gap-2.5 text-sm text-text-muted leading-relaxed mb-4">
                <Minus size={15} className="text-danger shrink-0 mt-0.5" />
                <span>{pain}</span>
              </p>
              <p className="flex items-start gap-2.5 text-sm text-text-primary font-semibold leading-relaxed">
                <Check size={15} className="text-success shrink-0 mt-0.5" strokeWidth={3} />
                <span>{fix}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 3. Features (bento) ──────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section id="imkoniyatlar" className="py-20 md:py-24 border-t border-border/40 scroll-mt-20">
      <div className="page-container">
        <SectionHeading
          eyebrow="Imkoniyatlar"
          title={"Bitta platforma — butun o'rganish yo'li"}
          subtitle={"So'zni topishdan tortib, uni suhbatda ishlatishgacha. Hammasi bir joyda, bir-biriga ulangan holda."}
        />

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-12">

          {/* Big tile — SRS */}
          <div className="md:col-span-4 card-glass p-7 border-border/50 relative overflow-hidden group
                          hover:border-primary/40 transition-colors">
            <div className="absolute -right-10 -top-10 w-52 h-52 bg-primary/10 blur-3xl rounded-full
                            group-hover:bg-primary/15 transition-colors" aria-hidden="true" />
            <div className="relative">
              <span className="inline-flex w-11 h-11 rounded-xl bg-primary/12 border border-primary/25
                               items-center justify-center text-primary mb-5">
                <Brain size={20} />
              </span>
              <h3 className="text-xl font-black text-text-primary mb-2.5">{"Aqlli SRS tizimi"}</h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-lg mb-6">
                {"Har bir so'z 5 bosqichdan o'tadi. To'g'ri javob bersangiz oraliq uzayadi, adashsangiz qisqaradi — shuning uchun vaqtingiz aynan qiynalayotgan so'zlarga sarflanadi."}
              </p>
              <div className="flex items-end gap-1.5 h-16">
                {[38, 55, 72, 88, 100].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all duration-500',
                        i === 4 ? 'bg-accent' : 'bg-primary/70',
                      )}
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[10px] font-bold text-text-muted">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Games */}
          <FeatureTile
            className="md:col-span-2"
            icon={Gamepad2}
            title={"6 o'yin rejimi"}
            desc={"Test, yozish, juftlik moslash, bloklar, Space Shooter va aralash rejim."}
          />

          {/* AI */}
          <FeatureTile
            className="md:col-span-3"
            icon={Sparkles}
            title={"AI Suhbatdosh"}
            desc={"Sun'iy idrok bilan yaponcha yozishmalar. O'zingiz saqlagan so'zlar suhbatga o'zi qo'shiladi, xatolaringiz tushuntiriladi."}
          />

          {/* JLPT */}
          <FeatureTile
            className="md:col-span-3"
            icon={GraduationCap}
            title={"JLPT N5 → N1"}
            desc={"So'zlar imtihon darajalari bo'yicha ajratilgan, bo'limlar kesimida tayyorgarlik ko'rasiz."}
          />

          {/* Audio */}
          <FeatureTile
            className="md:col-span-2"
            icon={Headphones}
            title={"Tabiiy talaffuz"}
            desc={"Har bir so'z neyron ovoz bilan aytiladi — noto'g'ri talaffuz o'rganilmaydi."}
          />

          {/* Leagues */}
          <FeatureTile
            className="md:col-span-2"
            icon={Trophy}
            title={"Haftalik ligalar"}
            desc={"Bronzadan Olmosgacha ko'tariling. Raqobat — eng kuchli motivatsiya."}
          />

          {/* Own library */}
          <FeatureTile
            className="md:col-span-2"
            icon={Layers}
            title={"Shaxsiy lug'at"}
            desc={"O'z kitob va mavzularingizni yarating, so'zlarni o'zingizga moslab guruhlang."}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureTile({
  icon: Icon,
  title,
  desc,
  className,
}: {
  icon: typeof Brain;
  title: string;
  desc: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'card-glass p-6 border-border/50 hover:border-primary/40 transition-all duration-200 group',
        className,
      )}
    >
      <span className="inline-flex w-10 h-10 rounded-xl bg-surface-2 border border-border/60
                       items-center justify-center text-primary mb-4 group-hover:scale-105 transition-transform">
        <Icon size={18} />
      </span>
      <h3 className="font-black text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── 4. How it works ──────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: BookOpen,
    title: "So'zlarni saqlang",
    desc: "Lug'atdan, JLPT darajasidan yoki Minna no Nihongo darsligidan kerakli so'zlarni tanlab, shaxsiy to'plamingizga qo'shing.",
  },
  {
    icon: Gamepad2,
    title: "O'ynab takrorlang",
    desc: "Har kuni bir necha daqiqa. Tizim bugun qaysi so'zlar takrorlashga tayyorligini o'zi hisoblab, o'yinni o'sha so'zlardan tuzadi.",
  },
  {
    icon: LineChart,
    title: "O'sishni kuzating",
    desc: "Seriya, XP, o'zlashtirish darajalari va haftalik liga — natijangiz ko'rinib turadi, shuning uchun tashlab yuborish qiyinlashadi.",
  },
];

function HowItWorksSection() {
  return (
    <section id="qanday-ishlaydi" className="py-20 md:py-24 border-t border-border/40 scroll-mt-20">
      <div className="page-container">
        <SectionHeading
          eyebrow="Qanday ishlaydi"
          title={"Kuniga 10 daqiqa — uchta oddiy qadam"}
        />

        <div className="relative grid md:grid-cols-3 gap-5 mt-14">
          {/* Connector line on desktop */}
          <div
            className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px
                       bg-gradient-to-r from-transparent via-border to-transparent"
            aria-hidden="true"
          />

          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="relative text-center px-2">
              <span className="relative z-10 inline-flex w-14 h-14 rounded-2xl mb-6
                               bg-surface border border-border/70 shadow-glass
                               items-center justify-center text-primary">
                <Icon size={22} />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white
                                 text-[11px] font-black flex items-center justify-center border-2 border-background">
                  {i + 1}
                </span>
              </span>
              <h3 className="text-lg font-black text-text-primary mb-2.5">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 5. Games showcase ────────────────────────────────────────────────────────

const GAMES = [
  { emoji: '📝', name: 'Test', desc: "To'rt variantli tezkor savol" },
  { emoji: '✍️', name: 'Yozish', desc: "So'zni o'zingiz yozib tekshirasiz" },
  { emoji: '🔗', name: 'Juftlik', desc: "So'z va tarjimani moslashtirish" },
  { emoji: '🧩', name: 'Bloklar', desc: "Bo'g'inlardan so'z yig'ish" },
  { emoji: '🚀', name: 'Shooter', desc: "To'g'ri javobni otib tushiring" },
  { emoji: '🎯', name: 'Aralash', desc: "Barcha rejimlar bitta seansda" },
];

function GamesSection() {
  return (
    <section className="py-20 md:py-24 border-t border-border/40 scroll-mt-20">
      <div className="page-container">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 items-center">
          <div>
            <SectionHeading
              align="left"
              eyebrow="O'yinlar"
              title={"Takrorlash majburiyat emas, o'yin"}
              subtitle={"Bir xil kartochkani ag'darish zerikarli. Shuning uchun har bir takrorlash olti rejimdan biriga aylanadi — miya bir xil so'zni har safar boshqacha yo'l bilan eslab qoladi va bog'lanish mustahkamlanadi."}
            />
            <Link
              href="/auth/register"
              className="btn-primary inline-flex items-center gap-2 text-sm mt-8 group"
            >
              {"O'ynab ko'rish"}
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {GAMES.map(({ emoji, name, desc }) => (
              <div
                key={name}
                className="card-glass p-5 border-border/50 text-center hover:border-primary/40
                           hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="text-3xl block mb-3">{emoji}</span>
                <p className="font-black text-sm text-text-primary">{name}</p>
                <p className="text-[11px] text-text-muted mt-1 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 6. JLPT ──────────────────────────────────────────────────────────────────

const JLPT_ROW = [
  { id: 'N5', label: "Boshlang'ich", words: "~800 so'z" },
  { id: 'N4', label: 'Elementar', words: "~1500 so'z" },
  { id: 'N3', label: "O'rta", words: "~3750 so'z" },
  { id: 'N2', label: "O'rtadan yuqori", words: "~6000 so'z" },
  { id: 'N1', label: 'Yuqori', words: "~10000 so'z" },
];

function JlptSection() {
  return (
    <section className="py-20 md:py-24 border-t border-border/40 scroll-mt-20">
      <div className="page-container">
        <SectionHeading
          eyebrow="JLPT"
          title={"Imtihonga aniq maqsad bilan tayyorlaning"}
          subtitle={"So'zlar N5 dan N1 gacha darajalarga ajratilgan. Qaysi darajada turganingizni bilasiz va keyingi qadam nima ekani doim ko'rinib turadi."}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-12">
          {JLPT_ROW.map(({ id, label, words }, i) => (
            <div
              key={id}
              className="card-glass p-5 border-border/50 text-center relative overflow-hidden
                         hover:border-primary/40 transition-colors"
            >
              <div
                className="absolute inset-x-0 top-0 h-1 bg-primary"
                style={{ opacity: 0.35 + i * 0.16 }}
                aria-hidden="true"
              />
              <p className="text-2xl font-black text-text-primary tracking-tight">{id}</p>
              <p className="text-[11px] font-bold text-text-secondary mt-1.5">{label}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{words}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 7. Motivation ────────────────────────────────────────────────────────────

function MotivationSection() {
  return (
    <section className="py-20 md:py-24 border-t border-border/40 scroll-mt-20">
      <div className="page-container">
        <div className="card-glass relative overflow-hidden p-8 md:p-12 border-border/60">
          <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-accent/10 blur-3xl rounded-full" aria-hidden="true" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Motivatsiya"
                title={"Eng qiyini — davom etish"}
                subtitle={"Til o'rganishda bilim emas, izchillik yutqaziladi. Shuning uchun ilova har kuni qaytishingiz uchun sabab beradi: seriya uzilmasligi kerak, XP to'planadi, liga esa har hafta yangilanadi."}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: Flame, title: 'Kunlik seriya', desc: "Uzluksiz kunlar hisoblanadi — uzilishga achinasiz.", tone: 'text-orange-400' },
                { icon: Zap, title: 'XP va darajalar', desc: "Har bir to'g'ri javob o'lchanadigan natijaga aylanadi.", tone: 'text-primary' },
                { icon: Trophy, title: 'Haftalik liga', desc: "Boshqa o'quvchilar bilan raqobat, har dushanba yangi start.", tone: 'text-accent' },
                { icon: Target, title: 'Kunlik maqsadlar', desc: "Uchta kichik vazifa — bugun nima qilish kerakligi aniq.", tone: 'text-success' },
              ].map(({ icon: Icon, title, desc, tone }) => (
                <div key={title} className="rounded-xl bg-surface-2/40 border border-border/50 p-5">
                  <Icon size={19} className={cn('mb-3', tone)} />
                  <p className="font-black text-sm text-text-primary mb-1.5">{title}</p>
                  <p className="text-[12px] text-text-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 8. Pricing ───────────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section id="tariflar" className="py-20 md:py-24 border-t border-border/40 scroll-mt-20">
      <div className="page-container">
        <SectionHeading
          eyebrow="Tariflar"
          title={"Takrorlash har doim bepul"}
          subtitle={"Ro'yxatdan o'tish uchun karta so'ralmaydi. Premium — cheklovlarni olib tashlaydi, asosiy o'rganish esa bepul tarifda ham to'liq ishlaydi."}
        />

        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-12">
          {/* Free */}
          <div className="card-glass p-7 border-border/60 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Bepul</p>
            <p className="text-3xl font-black text-text-primary mb-1">0 so&rsquo;m</p>
            <p className="text-[13px] text-text-muted mb-6">{"Boshlash uchun yetarli"}</p>
            <ul className="space-y-2.5 flex-1">
              {[
                "Cheksiz SRS takrorlash",
                "10 000+ so'zlik lug'at",
                "Kunlik o'yin limiti bilan barcha rejimlar",
                "JLPT bo'limlari va reyting",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <Check size={15} className="text-success shrink-0 mt-0.5" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" className="btn-ghost text-sm text-center mt-7">
              {"Bepul ro'yxatdan o'tish"}
            </Link>
          </div>

          {/* Premium */}
          <div className="card-glass p-7 border-accent/40 flex flex-col relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-44 h-44 bg-accent/12 blur-3xl rounded-full" aria-hidden="true" />
            <div className="relative flex items-center gap-2 mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Premium</p>
              <Crown size={13} className="text-accent" />
            </div>
            <p className="relative text-3xl font-black text-text-primary mb-1">{"Cheklovsiz"}</p>
            <p className="relative text-[13px] text-text-muted mb-6">{"Oylik, yillik yoki umrbod"}</p>
            <ul className="relative space-y-2.5 flex-1">
              {[
                "Kunlik o'yin limiti yo'q",
                "AI suhbatdosh bilan kengaytirilgan muloqot",
                "Kattaroq shaxsiy lug'at va kitoblar",
                "Lug'atingizni boshqalar bilan ulashish",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <Check size={15} className="text-accent shrink-0 mt-0.5" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/premium"
              className="relative text-sm text-center mt-7 rounded-lg py-2.5 px-5 font-bold
                         bg-accent-gradient text-white hover:shadow-glow-accent active:scale-95 transition-all"
            >
              {"Tariflarni ko'rish"}
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6 inline-flex items-center gap-1.5 w-full justify-center">
          <Shield size={13} /> {"Hisobingizni istalgan vaqtda o'chirib tashlashingiz mumkin."}
        </p>
      </div>
    </section>
  );
}

// ─── 9. FAQ ───────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Ushbu platforma kimlar uchun?",
    a: "Yapon tilini noldan boshlayotganlar ham, JLPT ga tayyorlanayotganlar ham foydalanishi mumkin. Interfeys va barcha izohlar o'zbek tilida.",
  },
  {
    q: "Ro'yxatdan o'tish pullikmi?",
    a: "Yo'q. Ro'yxatdan o'tish bepul va karta ma'lumotlari so'ralmaydi. Oraliqli takrorlash (SRS) bepul tarifda cheksiz ishlaydi.",
  },
  {
    q: "Oraliqli takrorlash (SRS) nima?",
    a: "Bu — so'zni aynan unutish arafangizda qayta ko'rsatadigan usul. Yaxshi bilgan so'zlaringiz kamroq, qiynalayotganlaringiz ko'proq chiqadi, shuning uchun bir xil vaqtda ancha ko'p so'z esda qoladi.",
  },
  {
    q: "Kuniga qancha vaqt kerak?",
    a: "10-15 daqiqa yetarli. Muhimi — davomiylik: har kuni oz-ozdan takrorlash haftada bir marta uzoq o'tirishdan samaraliroq.",
  },
  {
    q: "O'z so'zlarimni qo'sha olamanmi?",
    a: "Ha. Shaxsiy lug'at bo'limida o'z kitob va mavzularingizni yaratib, istalgan so'zni qo'shishingiz va ular bilan o'ynashingiz mumkin.",
  },
  {
    q: "Telefonda ishlaydimi?",
    a: "Ha, sayt telefon, planshet va kompyuterga moslashgan. Brauzerdan ochsangiz kifoya, hech narsa o'rnatish shart emas.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="savollar" className="py-20 md:py-24 border-t border-border/40 scroll-mt-20">
      <div className="page-container">
        <SectionHeading eyebrow="Savollar" title={"Ko'p so'raladigan savollar"} />

        <div className="max-w-2xl mx-auto mt-12 space-y-2.5">
          {FAQ.map(({ q, a }, i) => {
            const isOpen = open === i;
            return (
              <div
                key={q}
                className={cn(
                  'card-glass overflow-hidden transition-colors',
                  isOpen ? 'border-primary/35' : 'border-border/50',
                )}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-bold text-text-primary">{q}</span>
                  <span
                    className={cn(
                      'shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-all',
                      isOpen
                        ? 'bg-primary/12 border-primary/30 text-primary rotate-180'
                        : 'bg-surface-2 border-border/60 text-text-muted',
                    )}
                  >
                    <ChevronDown size={15} />
                  </span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 -mt-1 text-sm text-text-secondary leading-relaxed animate-slide-in">
                    {a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── 10. Final CTA ────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="py-20 md:py-28 border-t border-border/40">
      <div className="page-container">
        <div className="relative card-glass overflow-hidden text-center px-6 py-14 md:py-20 border-primary/30">
          <div className="absolute inset-0 bg-primary-gradient opacity-[0.07]" aria-hidden="true" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/15 blur-3xl rounded-full" aria-hidden="true" />

          <div className="relative">
            <span className="text-4xl block mb-5">🎌</span>
            <h2 className="text-3xl md:text-[2.6rem] font-black text-text-primary leading-tight tracking-tight mb-4">
              {"Birinchi 10 ta so'zingizni bugun yodlang"}
            </h2>
            <p className="text-text-secondary max-w-lg mx-auto mb-9 leading-relaxed">
              {"Ro'yxatdan o'tish bir daqiqa vaqt oladi. Ertaga tizim o'zi qaysi so'zlarni takrorlash kerakligini aytib turadi."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/register"
                className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5 shadow-glow
                           hover:-translate-y-0.5 group"
              >
                {'Bepul boshlash'}
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/auth/login" className="btn-ghost text-base px-8 py-3.5">
                {'Hisobim bor — kirish'}
              </Link>
            </div>
            <p className="text-xs text-text-muted mt-6 inline-flex items-center gap-1.5">
              <Star size={12} className="fill-accent text-accent" />
              {"Karta kerak emas · Takrorlash abadiy bepul"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="animate-fade-in">
      <Hero />
      <WhySection />
      <FeaturesSection />
      <HowItWorksSection />
      <GamesSection />
      <JlptSection />
      <MotivationSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </div>
  );
}
