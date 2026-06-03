'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const GAMES = [
  {
    href:  '/games/test',
    icon:  '🧠',
    title: 'Variantli test',
    desc:  "Har bir savolda to'rtta variant. Vaqt tugashidan oldin to'g'ri ma'noni tanlang.",
    gradient: 'from-violet-600 to-purple-800',
    border:   'hover:border-violet-500/60',
    glow:     'hover:shadow-[0_0_24px_rgba(124,58,237,0.4)]',
    tag:      'Eng mashhur',
    tagColor: 'bg-violet-500/20 text-violet-300',
  },
  {
    href:  '/games/match',
    icon:  '🔗',
    title: 'Mos juftliklar',
    desc:  "Ikki ustun — yapon tili va o'zbek tili. Doskani tozalash uchun har bir juftlikni moslang.",
    gradient: 'from-emerald-600 to-teal-800',
    border:   'hover:border-emerald-500/60',
    glow:     'hover:shadow-[0_0_24px_rgba(16,185,129,0.4)]',
    tag:      null,
    tagColor: '',
  },
  {
    href:  '/games/write',
    icon:  '⌨️',
    title: 'Yozish amaliyoti',
    desc:  "Yaponcha so'zni ko'ring, ma'nosini yozing. Tezkor teskari aloqa orqali to'liq xotirani sinash.",
    gradient: 'from-sky-600 to-blue-800',
    border:   'hover:border-sky-500/60',
    glow:     'hover:shadow-[0_0_24px_rgba(14,165,233,0.4)]',
    tag:      'SRS uchun eng yaxshisi',
    tagColor: 'bg-sky-500/20 text-sky-300',
  },
  {
    href:  '/games/shooter',
    icon:  '🚀',
    title: 'Kosmik otishma',
    desc:  "So'zlar kosmosda asteroidlar bo'lib suzib yuradi. Vaqt tugashidan oldin to'g'risini bosing!",
    gradient: 'from-amber-600 to-orange-800',
    border:   'hover:border-amber-500/60',
    glow:     'hover:shadow-[0_0_24px_rgba(245,158,11,0.4)]',
    tag:      "🔥 Sevimli o'yin",
    tagColor: 'bg-amber-500/20 text-amber-300',
  },
];

const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function GamesPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20
                        border border-primary/30 text-primary text-sm font-medium mb-5">
          {"🎮 O'yinlar markazi"}
        </div>
        <h1 className="text-4xl font-extrabold text-text-primary mb-3">
          {"O'yiningizni tanlang"}
        </h1>
        <p className="text-text-secondary max-w-md mx-auto">
          {"So'zlarni takrorlash uchun to'rtta usul. Har bir o'yin XP va tangalar bilan mukofotlaydi hamda SRS taraqqiyotingizni avtomatik yangilaydi."}
        </p>
        {!isAuthenticated && (
          <p className="mt-4 text-sm text-text-muted">
            <Link href="/auth/login" className="text-primary hover:underline">{"Tizimga kiring"}</Link>
            {' '}{"taraqqiyotni saqlash, XP to'plash va reytingda ko'tarilish uchun."}
          </p>
        )}
      </div>

      {/* Game cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-5"
      >
        {GAMES.map((game) => (
          <motion.div key={game.href} variants={item}>
            <Link
              href={isAuthenticated ? game.href : '/auth/login'}
              className={cn(
                'group relative card-glass p-7 flex flex-col gap-5',
                'transition-all duration-200 hover:-translate-y-1',
                game.border, game.glow,
              )}
            >
              {/* Tag */}
              {game.tag && (
                <span className={cn('absolute top-4 right-4 badge-chip text-xs', game.tagColor)}>
                  {game.tag}
                </span>
              )}
              {!isAuthenticated && (
                <span className="absolute top-4 right-4 text-text-muted">
                  <Lock size={14} />
                </span>
              )}

              {/* Icon */}
              <div className={cn(
                'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-3xl',
                'shadow-lg group-hover:scale-110 transition-transform duration-200',
                game.gradient,
              )}>
                {game.icon}
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-text-primary group-hover:text-white
                               transition-colors mb-2">
                  {game.title}
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">{game.desc}</p>
              </div>

              <div className="flex items-center gap-1.5 text-sm font-medium text-primary
                              group-hover:gap-2.5 transition-all">
                {isAuthenticated ? "Hozir o'ynash" : "O'ynash uchun tizimga kiring"}
                <ArrowRight size={14} />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom tip */}
      <div className="mt-10 card-glass p-5 flex items-start gap-3 max-w-2xl mx-auto">
        <span className="text-2xl shrink-0">💡</span>
        <div>
          <p className="text-sm font-semibold text-text-primary mb-1">{"O'yinlarda SRS qanday ishlaydi"}</p>
          <p className="text-sm text-text-muted">
            {"Har bir to'g'ri javob so'zni 1-darajadan (1 daqiqa) 5-darajagacha (14 kun) ko'taradi. Noto'g'ri javoblar so'zlarni ortga qaytaradi, shunda siz ularni tezroq ko'rasiz. Tizim aynan esdan chiqish arafasida takrorlashingizni ta'minlaydi."}
          </p>
        </div>
      </div>
    </div>
  );
}
