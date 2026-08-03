'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Swords, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const SOLO_GAMES = [
  {
    href:  '/games/test',
    icon:  '🧠',
    title: 'Variantli test',
    desc:  "Savoldagi yaponcha so'zga to'rtta variantdan to'g'ri ma'noni tanlang. Tezkor va qulay takrorlash usuli.",
    gradient: 'from-emerald-700 to-emerald-900',
    border:   'hover:border-emerald-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(45,122,71,0.35)]',
    tag:      'Eng mashhur',
    tagColor: 'bg-emerald-500/20 text-emerald-300',
  },
  {
    href:  '/games/match',
    icon:  '🔗',
    title: 'Mos juftliklar',
    desc:  "Yaponcha so'zlar va ularning o'zbekcha tarjimalarini bir-biriga moslab doskani tozalang.",
    gradient: 'from-stone-700 to-stone-900',
    border:   'hover:border-stone-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(115,108,100,0.3)]',
    tag:      'no SRS Progress',
    tagColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  },
  {
    href:  '/games/write',
    icon:  '⌨️',
    title: 'Yozish amaliyoti',
    desc:  "O'zbekcha ma'nosini ko'rib, yaponchasini yozing — kanji, hiragana yoki katakana. Xotirani eng chuqur sinaydi.",
    gradient: 'from-red-700 to-red-950',
    border:   'hover:border-red-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(232,57,41,0.35)]',
    tag:      'SRS uchun eng yaxshisi',
    tagColor: 'bg-red-500/20 text-red-300',
  },
  {
    href:  '/games/shooter',
    icon:  '🚀',
    title: 'Kosmik otishma',
    desc:  "Asteroid bo'lib suzib yurgan to'g'ri javoblarni vaqt tugashidan oldin otib portlating!",
    gradient: 'from-amber-600 to-yellow-800',
    border:   'hover:border-amber-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(242,169,0,0.35)]',
    tag:      "🔥 Sevimli o'yin",
    tagColor: 'bg-amber-500/20 text-amber-300',
  },
  {
    href:  '/games/blocks',
    icon:  '🧱',
    title: 'Blok jumboq',
    desc:  "Shakllarni tarmoqqa joylab qatorlarni tozalang. Har yangi to'plam uchun so'z savoliga javob berasiz.",
    gradient: 'from-emerald-700 to-teal-900',
    border:   'hover:border-emerald-500/60',
    glow:     'hover:shadow-[0_0_20px_rgba(45,122,71,0.35)]',
    tag:      '🆕 Yangi',
    tagColor: 'bg-emerald-500/20 text-emerald-300',
  },
];

const LOCKED_GAMES = [
  {
    icon:  '⚔️',
    title: 'Dual jangi (Online)',
    desc:  "Do'stlaringiz yoki tasodifiy raqiblar bilan real vaqtda so'z boyligi bo'yicha kurashing.",
    gradient: 'from-purple-950/30 to-indigo-950/30',
  },
  {
    icon:  '🏎️',
    title: 'Kanji poygasi',
    desc:  "Tezkor vaqt ichida kanjilarning to'g'ri o'qilishi va yozilishini aniqlash poygasi.",
    gradient: 'from-fuchsia-950/30 to-pink-950/30',
  },
  {
    icon:  '👥',
    title: 'Guruhli viktorina',
    desc:  "Bir vaqtning o'zida ko'plab o'yinchilar ishtirokidagi jonli, qiziqarli so'z turnirlari.",
    gradient: 'from-cyan-950/30 to-blue-950/30',
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

export default function GamesPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10
                        border border-primary/20 text-primary text-sm font-medium mb-5">
          <Sparkles size={14} className="animate-pulse" />
          {"🎮 O'yinlar markazi"}
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

      {/* SECTION 1: YAKKA O'YINCHI (SOLO MODE) */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-6 border-b border-border/40 pb-2">
          <span className="text-xl">👤</span>
          <h2 className="text-2xl font-bold text-text-primary">Yakka o'yinchi rejimi</h2>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {SOLO_GAMES.map((game) => {
            const { user } = useAuth();
            const isGameLocked = (game.href === '/games/write' || game.href === '/games/shooter') && user?.role !== 'ADMIN';

            return (
              <motion.div key={game.href} variants={item}>
                {isGameLocked ? (
                  <div
                    className={cn(
                      'group relative card-glass p-6 flex flex-col gap-4 h-full opacity-65 cursor-not-allowed',
                      'border-dashed border-border bg-surface/20'
                    )}
                  >
                    {/* Locked Badge */}
                    <span className="absolute top-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Lock size={10} />
                      Faqat Adminlar
                    </span>

                    {/* Icon */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl grayscale opacity-40',
                      game.gradient,
                    )}>
                      {game.icon}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text-muted mb-1.5">
                        {game.title}
                      </h3>
                      <p className="text-xs text-text-muted leading-relaxed font-medium">{game.desc}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mt-2">
                      Faqat adminlar uchun ochiq
                    </div>
                  </div>
                ) : (
                  <Link
                    href={isAuthenticated ? game.href : '/auth/login'}
                    className={cn(
                      'group relative card-glass p-6 flex flex-col gap-4 h-full',
                      'transition-all duration-200 hover:-translate-y-1',
                      game.border, game.glow,
                    )}
                  >
                    {/* Tag */}
                    {game.tag && (
                      <span className={cn('absolute top-4 right-4 badge-chip text-[10px] font-bold px-2 py-0.5', game.tagColor)}>
                        {game.tag}
                      </span>
                    )}
                    {!isAuthenticated && (
                      <span className="absolute top-4 right-4 text-text-muted">
                        <Lock size={13} />
                      </span>
                    )}

                    {/* Icon */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl',
                      'shadow-md group-hover:scale-105 transition-transform duration-200',
                      game.gradient,
                    )}>
                      {game.icon}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text-primary group-hover:text-white
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
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* SECTION 2: KO'P O'YINCHILI VA ONLINE (MULTIPLAYER & ONLINE) */}
      <div>
        <div className="flex items-center gap-2 mb-6 border-b border-border/40 pb-2">
          <Swords size={20} className="text-text-muted" />
          <h2 className="text-2xl font-bold text-text-primary">Do'stlar bilan o'ynash</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {LOCKED_GAMES.map((game, idx) => (
            <div
              key={idx}
              className="relative card-glass p-6 flex flex-col gap-4 border-dashed border-border bg-surface/20 opacity-60 select-none h-full overflow-hidden"
            >
              {/* Badge */}
              <span className="absolute top-4 right-4 bg-surface-2 border border-border/40 text-text-muted text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={10} />
                Tez orada
              </span>

              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl grayscale opacity-40',
                game.gradient,
              )}>
                {game.icon}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-muted mb-1.5">
                  {game.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed font-medium">{game.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tip */}
      <div className="mt-14 card-glass p-5 flex items-start gap-3 max-w-2xl mx-auto">
        <span className="text-2xl shrink-0">💡</span>
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
