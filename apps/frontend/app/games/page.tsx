'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, Lock, Swords, Sparkles, Shuffle, ListChecks, Link2, PenLine,
  Rocket, Blocks, Timer, Users, Gamepad2, Star, Flame, Lightbulb, User,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { QuotaBar } from '@/components/premium/UpgradeNotice';
import { cn } from '@/lib/utils';

interface GameTag {
  label: string;
  Icon?: LucideIcon;
  className: string;
}

interface GameCard {
  href: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
  /** Tailwind gradient stops for the icon tile. */
  gradient: string;
  border: string;
  glow: string;
  tag?: GameTag;
}

const SOLO_GAMES: GameCard[] = [
  {
    href:  '/games/mixed',
    Icon:  Shuffle,
    title: 'Aralash mashq',
    desc:  "20 ta raund — har raundda test, juftlik moslash yoki yozish tasodifiy tushadi. Sozlash yo'q, shunchaki boshlang.",
    gradient: 'from-indigo-500 to-violet-700',
    border:   'hover:border-indigo-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]',
    tag: { label: 'Asosiy mashq', Icon: Star, className: 'bg-indigo-500/20 text-indigo-300' },
  },
  {
    href:  '/games/test',
    Icon:  ListChecks,
    title: 'Variantli test',
    desc:  "Savoldagi yaponcha so'zga to'rtta variantdan to'g'ri ma'noni tanlang. Tezkor va qulay takrorlash usuli.",
    gradient: 'from-emerald-500 to-emerald-800',
    border:   'hover:border-emerald-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(45,122,71,0.35)]',
    tag: { label: 'Eng mashhur', className: 'bg-emerald-500/20 text-emerald-300' },
  },
  {
    href:  '/games/match',
    Icon:  Link2,
    title: 'Mos juftliklar',
    desc:  "Yaponcha so'zlar va ularning o'zbekcha tarjimalarini bir-biriga moslab doskani tozalang.",
    gradient: 'from-stone-500 to-stone-800',
    border:   'hover:border-stone-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(115,108,100,0.3)]',
    tag: {
      label: "SRS'ga ta'sir qilmaydi",
      className: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    },
  },
  {
    href:  '/games/write',
    Icon:  PenLine,
    title: 'Yozish amaliyoti',
    desc:  "O'zbekcha ma'nosini ko'rib, yaponchasini yozing — kanji, hiragana yoki katakana. Xotirani eng chuqur sinaydi.",
    gradient: 'from-red-500 to-red-900',
    border:   'hover:border-red-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(232,57,41,0.35)]',
    tag: { label: 'SRS uchun eng yaxshisi', className: 'bg-red-500/20 text-red-300' },
  },
  {
    href:  '/games/shooter',
    Icon:  Rocket,
    title: 'Kosmik otishma',
    desc:  "Asteroid bo'lib suzib yurgan to'g'ri javoblarni vaqt tugashidan oldin otib portlating!",
    gradient: 'from-amber-400 to-yellow-700',
    border:   'hover:border-amber-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(242,169,0,0.35)]',
    tag: { label: "Sevimli o'yin", Icon: Flame, className: 'bg-amber-500/20 text-amber-300' },
  },
  {
    href:  '/games/blocks',
    Icon:  Blocks,
    title: 'Blok jumboq',
    desc:  "Shakllarni tarmoqqa joylab qatorlarni tozalang. Har yangi to'plam uchun so'z savoliga javob berasiz.",
    gradient: 'from-emerald-500 to-teal-800',
    border:   'hover:border-emerald-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(45,122,71,0.35)]',
    tag: { label: 'Yangi', Icon: Sparkles, className: 'bg-emerald-500/20 text-emerald-300' },
  },
];

const LOCKED_GAMES: { Icon: LucideIcon; title: string; desc: string; gradient: string }[] = [
  {
    Icon:  Swords,
    title: 'Dual jangi (Online)',
    desc:  "Do'stlaringiz yoki tasodifiy raqiblar bilan real vaqtda so'z boyligi bo'yicha kurashing.",
    gradient: 'from-purple-500 to-indigo-800',
  },
  {
    Icon:  Timer,
    title: 'Kanji poygasi',
    desc:  "Tezkor vaqt ichida kanjilarning to'g'ri o'qilishi va yozilishini aniqlash poygasi.",
    gradient: 'from-fuchsia-500 to-pink-800',
  },
  {
    Icon:  Users,
    title: 'Guruhli viktorina',
    desc:  "Bir vaqtning o'zida ko'plab o'yinchilar ishtirokidagi jonli, qiziqarli so'z turnirlari.",
    gradient: 'from-cyan-500 to-blue-800',
  },
];

const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

/**
 * The gradient tile every card leads with.
 *
 * `muted` is for cards that cannot be opened (admin-only, or not built yet) —
 * same shape and colour, just drained, so the grid still reads as one set.
 */
function GameIcon({
  Icon, gradient, muted = false,
}: {
  Icon: LucideIcon;
  gradient: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center',
        'bg-gradient-to-br ring-1 ring-inset ring-white/20',
        gradient,
        muted
          ? 'grayscale opacity-40'
          : 'shadow-lg group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-200',
      )}
    >
      <Icon size={22} strokeWidth={2} className="text-white drop-shadow-sm" />
    </div>
  );
}

function TagChip({ tag }: { tag: GameTag }) {
  return (
    <span
      className={cn(
        'absolute top-4 right-4 badge-chip text-[10px] font-bold px-2 py-0.5',
        'inline-flex items-center gap-1',
        tag.className,
      )}
    >
      {tag.Icon && <tag.Icon size={11} strokeWidth={2.5} />}
      {tag.label}
    </span>
  );
}

export default function GamesPage() {
  // Hooks stay at the top level — this used to be called inside the .map()
  // callback below, which only worked because the list length never changes.
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10
                        border border-primary/20 text-primary text-sm font-medium mb-5">
          <Gamepad2 size={15} />
          {"O'yinlar markazi"}
          <Sparkles size={13} className="animate-pulse" />
        </div>
        <h1 className="text-4xl font-extrabold text-text-primary mb-3">
          {"O'yiningizni tanlang"}
        </h1>
        <p className="text-text-secondary max-w-md mx-auto font-medium">
          {"So'zlarni o'yinlar orqali eslab qoling. Har bir g'alaba tanga va tajriba (XP) olib keladi hamda SRS taraqqiyotingizni yangilaydi."}
        </p>
        {!isAuthenticated && (
          <p className="mt-4 text-sm text-text-muted">
            <Link href="/auth/login" className="text-primary hover:underline">{"Tizimga kiring"}</Link>
            {' '}{"taraqqiyotni saqlash va reytingda ko'tarilish uchun."}
          </p>
        )}
      </div>

      {/* Free accounts see what is left of today before picking a game. */}
      {isAuthenticated && <QuotaBar kind="games" className="max-w-md mx-auto mb-10" />}

      {/* SECTION 1: YAKKA O'YINCHI (SOLO MODE) */}
      <div className="mb-14">
        <div className="flex items-center gap-2.5 mb-6 border-b border-border/40 pb-2">
          <User size={20} className="text-primary" />
          <h2 className="text-2xl font-bold text-text-primary">Yakka o&rsquo;yinchi rejimi</h2>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {/* Every mode is open to every signed-in learner. The free tier caps
              how MANY sessions a day, not which games — see /premium. */}
          {SOLO_GAMES.map((game) => (
            <motion.div key={game.href} variants={item}>
              <Link
                href={isAuthenticated ? game.href : '/auth/login'}
                className={cn(
                  'group relative card-glass p-6 flex flex-col gap-4 h-full',
                  'transition-all duration-200 hover:-translate-y-1',
                  game.border, game.glow,
                )}
              >
                {isAuthenticated ? (
                  game.tag && <TagChip tag={game.tag} />
                ) : (
                  <span className="absolute top-4 right-4 text-text-muted">
                    <Lock size={13} />
                  </span>
                )}

                <GameIcon Icon={game.Icon} gradient={game.gradient} />

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-primary
                                 transition-colors mb-1.5">
                    {game.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed font-medium">{game.desc}</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary
                                group-hover:gap-2.5 transition-all mt-2">
                  {isAuthenticated ? "Hozir o'ynash" : "O'ynash uchun tizimga kiring"}
                  <ArrowRight size={12} />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* SECTION 2: KO'P O'YINCHILI VA ONLINE (MULTIPLAYER & ONLINE) */}
      <div>
        <div className="flex items-center gap-2.5 mb-6 border-b border-border/40 pb-2">
          <Swords size={20} className="text-text-muted" />
          <h2 className="text-2xl font-bold text-text-primary">Do&rsquo;stlar bilan o&rsquo;ynash</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {LOCKED_GAMES.map((game) => (
            <div
              key={game.title}
              className="relative card-glass p-6 flex flex-col gap-4 border-dashed border-border bg-surface/20 opacity-60 select-none h-full overflow-hidden"
            >
              <span className="absolute top-4 right-4 bg-surface-2 border border-border/40 text-text-muted text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={10} />
                Tez orada
              </span>

              <GameIcon Icon={game.Icon} gradient={game.gradient} muted />

              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-muted mb-1.5">{game.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed font-medium">{game.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tip */}
      <div className="mt-14 card-glass p-5 flex items-start gap-3.5 max-w-2xl mx-auto">
        <span className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center
                         justify-center text-accent shrink-0">
          <Lightbulb size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-text-primary mb-1">{"O'yinlarda SRS qanday ishlaydi?"}</p>
          <p className="text-sm text-text-muted">
            {"Har bir to'g'ri javob so'zni 1-darajadan (1 daqiqa) 5-darajagacha (14 kun) ko'taradi. Noto'g'ri javoblar esa so'zlarni darhol takrorlash ro'yxatiga qaytaradi. Bu tizim sizga so'zlarni aynan esdan chiqarish arafasida eslatib turadi."}
          </p>
        </div>
      </div>
    </div>
  );
}
