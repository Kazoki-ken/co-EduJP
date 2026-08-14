'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, BookMarked, Check, Crown, Gamepad2,
  Infinity as InfinityIcon, Library, Loader2, MessageCircle, Minus, Send,
  Share2, ChevronLeft, ChevronRight,
  GraduationCap, Sparkles, Volume2,
} from 'lucide-react';
import api, { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { CheckoutResponse, PlanId, PremiumPlans, TierLimits } from '@/lib/types';

/** Formats a so'm amount with thin spaces: 30000 → "30 000". */
const som = (value: number) => value.toLocaleString('uz-UZ').replace(/,/g, ' ');

/** A numeric limit, or the infinity mark when it is uncapped. */
function LimitValue({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-primary">
        <InfinityIcon size={15} /> Cheksiz
      </span>
    );
  }
  return <span className="font-bold text-text-primary">{value}{suffix ? ` ${suffix}` : ''}</span>;
}

export default function PremiumPage() {
  const { isAuthenticated, entitlements } = useAuth();
  const [plans, setPlans] = useState<PremiumPlans | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<PremiumPlans>('/premium/plans')
      .then(({ data }) => setPlans(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!plans) {
    return (
      <div className="page-container py-24 text-center text-text-muted">
        {"Tarif ma'lumotlarini yuklab bo'lmadi."}
      </div>
    );
  }

  const free = plans.tiers.FREE.limits;
  const premium = plans.tiers.PREMIUM.limits;
  const { monthly, yearly, lifetime } = plans.prices;
  // A price of 0 means it has not been set in the admin panel yet.
  const anyPrice = monthly > 0 || yearly > 0 || lifetime > 0;

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10
                        border border-accent/25 text-accent text-sm font-semibold mb-5">
          <Crown size={15} />
          Premium
        </div>
        <h1 className="text-4xl font-extrabold text-text-primary mb-3">Tarifni tanlang</h1>
        <p className="text-text-secondary max-w-lg mx-auto font-medium">
          {"Takrorlash (SRS) har doim bepul va cheksiz. Premium — ko'proq o'yin, kengroq shaxsiy lug'at va AI suhbatdosh uchun."}
        </p>
      </div>

      {/* Current status */}
      {isAuthenticated && entitlements && (
        <div className={cn(
          'card-glass p-4 mb-8 max-w-3xl mx-auto flex flex-wrap items-center gap-3',
          entitlements.isPremium ? 'border-accent/40' : 'border-border/60',
        )}>
          <span className={cn(
            'badge-chip border font-bold',
            entitlements.isPremium
              ? 'bg-accent/15 text-accent border-accent/30'
              : 'bg-surface-2 text-text-muted border-border',
          )}>
            {entitlements.isPremium ? <Crown size={12} /> : <Sparkles size={12} />}
            {entitlements.isPremium ? 'Premium' : 'Bepul tarif'}
          </span>

          {entitlements.isPremium ? (
            <span className="text-sm text-text-secondary">
              {entitlements.premiumUntil
                ? `${new Date(entitlements.premiumUntil).toLocaleDateString('uz-UZ')} gacha amal qiladi`
                : 'Umrbod — muddati cheklanmagan'}
            </span>
          ) : (
            <span className="text-sm text-text-secondary">
              {'Bugun: '}
              <b className="text-text-primary">{entitlements.usage.gamesToday}</b>
              {free.dailyGames !== null && `/${free.dailyGames}`} o&rsquo;yin ·{' '}
              <b className="text-text-primary">{entitlements.usage.aiMessagesToday}</b>
              {free.dailyAiMessages !== null && `/${free.dailyAiMessages}`} AI xabar
            </span>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        <PlanCard
          title="Bepul"
          subtitle="Boshlash uchun yetarli"
          price={0}
          limits={free}
          highlight={false}
        />
        <PlanCard
          title="Premium"
          subtitle="Jiddiy o'rganuvchilar uchun"
          price={monthly}
          priceNote={monthly > 0 ? 'oyiga' : undefined}
          limits={premium}
          highlight
          extraPrices={[
            yearly > 0 ? { label: 'Yillik', value: yearly } : null,
            lifetime > 0 ? { label: 'Umrbod', value: lifetime } : null,
          ].filter(Boolean) as { label: string; value: number }[]}
        />
      </div>

      {/* What the sections actually contain — shown to everyone, subscriber
          or not, because this is the part a price list cannot explain. */}
      <FeatureCarousel free={free} premium={premium} />

      {/* Buy — only when there is something to buy and someone to buy it. */}
      {anyPrice && !entitlements?.isPremium && (
        <BuyPanel prices={plans.prices} isAuthenticated={isAuthenticated} />
      )}

      {/* Comparison */}
      <div className="card-glass p-0 mt-10 max-w-3xl mx-auto overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left font-semibold text-text-muted px-5 py-3">Imkoniyat</th>
                <th className="text-center font-semibold text-text-muted px-4 py-3 w-32">Bepul</th>
                <th className="text-center font-semibold text-accent px-4 py-3 w-32">Premium</th>
              </tr>
            </thead>
            <tbody>
              <Row icon={Sparkles} label="Takrorlash (SRS)">
                {{ free: <Unlimited />, premium: <Unlimited /> }}
              </Row>
              <Row icon={Gamepad2} label="Kunlik o'yin">
                {{
                  free: <LimitValue value={free.dailyGames} suffix="ta" />,
                  premium: <LimitValue value={premium.dailyGames} suffix="ta" />,
                }}
              </Row>
              <Row icon={Gamepad2} label="Barcha o'yin turlari">
                {{ free: <Yes />, premium: <Yes /> }}
              </Row>
              <Row icon={MessageCircle} label="AI suhbatdosh (kuniga)">
                {{
                  free: <LimitValue value={free.dailyAiMessages} suffix="ta" />,
                  premium: <LimitValue value={premium.dailyAiMessages} suffix="ta" />,
                }}
              </Row>
              <Row icon={Library} label="Shaxsiy mavzular">
                {{
                  free: <LimitValue value={free.maxTopics} suffix="ta" />,
                  premium: <LimitValue value={premium.maxTopics} suffix="ta" />,
                }}
              </Row>
              <Row icon={Library} label="Mavzudagi so'zlar">
                {{
                  free: <LimitValue value={free.maxWordsPerTopic} suffix="ta" />,
                  premium: <LimitValue value={premium.maxWordsPerTopic} suffix="ta" />,
                }}
              </Row>
              <Row icon={BookMarked} label="Saqlangan so'zlar">
                {{
                  free: <LimitValue value={free.maxSavedWords} suffix="ta" />,
                  premium: <LimitValue value={premium.maxSavedWords} suffix="ta" />,
                }}
              </Row>
              <Row icon={Volume2} label="Talaffuz (kuniga)">
                {{
                  free: <LimitValue value={free.dailyTts} suffix="ta" />,
                  premium: <LimitValue value={premium.dailyTts} suffix="ta" />,
                }}
              </Row>
              <Row icon={Share2} label="Ommaga ulashish">
                {{
                  free: free.canShare ? <Yes /> : <No />,
                  premium: premium.canShare ? <Yes /> : <No />,
                }}
              </Row>
              <Row icon={GraduationCap} label="JLPT sinov imtihonlari" last>
                {{ free: <No />, premium: <Yes /> }}
              </Row>
            </tbody>
          </table>
        </div>
      </div>

      {/* How to buy */}
      <div className="card-glass p-6 mt-8 max-w-3xl mx-auto">
        <h2 className="font-bold text-text-primary mb-2 flex items-center gap-2">
          <Crown size={16} className="text-accent" /> Qanday sotib olinadi?
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {anyPrice
            ? "Yuqoridagi tarifni tanlang — Telegram boti karta raqamini va aniq summani beradi. Pulni o'tkazib, chek rasmini botga yuborasiz; administrator tasdiqlagach Premium avtomatik ulanadi. Onlayn to'lov (Payme / Click) keyinroq qo'shiladi."
            : "Tariflar narxi hali belgilanmagan. Administrator narxlarni kiritgach shu yerda ko'rinadi."}
        </p>
        {!isAuthenticated && (
          <Link href="/auth/login" className="btn-primary text-sm mt-4 inline-flex items-center gap-2">
            Tizimga kirish
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Buying ───────────────────────────────────────────────────────────────────

const PLAN_META: { id: PlanId; label: string; note?: string }[] = [
  { id: 'monthly', label: '1 oy' },
  { id: 'yearly', label: '1 yil', note: '2 oydan ko‘p tejaysiz' },
  { id: 'lifetime', label: 'Umrbod', note: 'Bir marta to‘lang' },
];

/**
 * Checkout hand-off.
 *
 * The purchase is created server-side (which freezes the price) and the reply
 * carries a Telegram deep link. Payment itself happens in the bot: card
 * transfer, receipt photo, admin approval. Nothing sensitive passes through
 * this page.
 */
function BuyPanel({
  prices, isAuthenticated,
}: {
  prices: PremiumPlans['prices'];
  isAuthenticated: boolean;
}) {
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<CheckoutResponse | null>(null);

  const buy = async (plan: PlanId) => {
    setBusy(plan);
    setErr(null);
    try {
      const { data } = await api.post<CheckoutResponse>('/premium/checkout', { plan });
      setLink(data);
      // Open the bot straight away; the card below stays as a fallback for
      // pop-up blockers and for anyone who closes the tab by accident.
      window.open(data.deepLink, '_blank', 'noopener');
    } catch (e) {
      setErr(errorMessage(e, "To'lovni boshlab bo'lmadi."));
    } finally {
      setBusy(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="card-glass p-6 mt-8 max-w-3xl mx-auto text-center">
        <p className="text-sm text-text-secondary mb-4">
          {'Premium sotib olish uchun avval tizimga kiring.'}
        </p>
        <Link href="/auth/login" className="btn-primary text-sm inline-flex items-center gap-2">
          Tizimga kirish <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="card-glass mt-8 max-w-3xl mx-auto overflow-hidden p-6">
      <h2 className="mb-1 flex items-center gap-2.5 font-bold text-text-primary">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15
                         text-primary ring-1 ring-inset ring-primary/25">
          <Send size={16} />
        </span>
        Telegram orqali to&rsquo;lash
      </h2>
      <p className="mb-5 pl-[3rem] text-sm text-text-muted">
        {"Tarifni tanlang — bot kartani va summani ko'rsatadi. To'lab, chek rasmini botga yuborasiz."}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PLAN_META.filter((p) => prices[p.id] > 0).map((p) => {
          const best = p.id === 'yearly';
          const off =
            p.id === 'yearly' && prices.monthly > 0
              ? Math.round((1 - prices.yearly / (prices.monthly * 12)) * 100)
              : 0;

          return (
            <button
              key={p.id}
              onClick={() => buy(p.id)}
              disabled={busy !== null}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border p-4 text-left',
                'transition-all duration-200 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0',
                best
                  ? 'border-accent/50 bg-accent/[0.06] hover:border-accent hover:shadow-glow-accent'
                  : 'border-border bg-surface-2/40 hover:border-primary/50 hover:shadow-glow-sm',
              )}
            >
              {/* A tinted bar along the top, the same device the level cards
                  in the JLPT section use to separate options at a glance. */}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 top-0 h-1 bg-gradient-to-r transition-opacity',
                  best
                    ? 'from-accent to-orange-600 opacity-100'
                    : 'from-primary to-red-700 opacity-40 group-hover:opacity-90',
                )}
              />

              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {p.label}
                </p>
                {best && (
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-black
                                   uppercase tracking-wider text-accent">
                    {off > 0 ? `−${off}%` : 'Foydali'}
                  </span>
                )}
              </div>

              <p className="text-2xl font-black leading-none tracking-tight text-text-primary">
                {som(prices[p.id])}
                <span className="ml-1 text-xs font-bold text-text-muted">so&rsquo;m</span>
              </p>

              {p.note && (
                <p
                  className={cn(
                    'mt-1.5 text-[11px] font-semibold',
                    best ? 'text-accent' : 'text-text-muted',
                  )}
                >
                  {p.note}
                </p>
              )}

              <span
                className={cn(
                  'mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold',
                  'transition-colors',
                  best
                    ? 'bg-accent-gradient text-white'
                    : 'border border-border text-text-secondary group-hover:border-primary/50 group-hover:text-primary',
                )}
              >
                {busy === p.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Sotib olish
              </span>
            </button>
          );
        })}
      </div>

      {err && (
        <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {err}
        </div>
      )}

      {link && (
        <div className="mt-5 p-4 rounded-xl bg-primary/[0.07] border border-primary/30">
          <p className="text-sm font-semibold text-text-primary mb-1">
            {'Telegram ochilmadimi?'}
          </p>
          <p className="text-xs text-text-muted mb-3">
            {"Quyidagi tugmani bosing. Havola 1 soat amal qiladi."}
          </p>
          <a
            href={link.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm inline-flex items-center gap-2"
          >
            <Send size={15} /> Botni ochish
          </a>
        </div>
      )}

      {/* Four steps, numbered in their own chips — a plain list read as fine
          print, and this is the part a first-time buyer actually needs. */}
      <ol className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {[
          'Bot karta raqamini va aniq summani koʻrsatadi',
          'Kartaga pul oʻtkazasiz',
          'Chek rasmini botga yuborasiz',
          'Admin tasdiqlagach Premium avtomatik ulanadi',
        ].map((t, i) => (
          <li key={t} className="flex items-start gap-2.5 text-xs text-text-secondary">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                             bg-surface-2 text-[10px] font-black text-text-muted">
              {i + 1}
            </span>
            {t}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function Unlimited() {
  return (
    <span className="inline-flex items-center gap-1 font-bold text-primary">
      <InfinityIcon size={15} />
    </span>
  );
}

function Yes() {
  return <Check size={16} className="text-success mx-auto" strokeWidth={2.5} />;
}

function No() {
  return <Minus size={16} className="text-text-muted/50 mx-auto" />;
}

function Row({
  icon: Icon, label, children, last,
}: {
  icon: typeof Check;
  label: string;
  children: { free: React.ReactNode; premium: React.ReactNode };
  last?: boolean;
}) {
  return (
    <tr className={cn(!last && 'border-b border-border/40')}>
      <td className="px-5 py-3">
        <span className="flex items-center gap-2.5 text-text-secondary font-medium">
          <Icon size={14} className="text-text-muted shrink-0" />
          {label}
        </span>
      </td>
      <td className="px-4 py-3 text-center">{children.free}</td>
      <td className="px-4 py-3 text-center bg-accent/[0.04]">{children.premium}</td>
    </tr>
  );
}

/**
 * What a subscription actually opens, one section at a time.
 *
 * A price list says "100 AI messages" and a learner still does not know what
 * the app feels like. These cards show the sections themselves — what is in
 * them, and what the free tier runs out of — which is the part a number cannot
 * carry.
 *
 * Three things make it feel like a carousel rather than a row of boxes:
 *
 *   - the rail is wider than the card by a quarter of a card on each side, so
 *     the previous and next ones are always in view, blurred and dimmed;
 *   - a mask fades those edges out instead of slicing them, so nothing ends in
 *     a hard vertical cut;
 *   - the list is fenced by a copy of the last card at the front and a copy of
 *     the first at the back. Sliding past either end lands on a copy that
 *     already looks like the far side, and the scroll position is reset
 *     without animation while it is on screen. The seam is invisible, and the
 *     first and last cards get neighbours like every other one.
 */
const SLIDE_MS = 6000;
const SETTLE_MS = 650;

function FeatureCarousel({ free, premium }: { free: TierLimits; premium: TierLimits }) {
  const scroller = useRef<HTMLDivElement>(null);
  /** Index into `slides`, which is fenced by clones — the first real card is 1. */
  const [page, setPage] = useState(1);
  const [paused, setPaused] = useState(false);

  const cap = (value: number | null, suffix: string) =>
    value === null ? 'Cheksiz' : `${value} ${suffix}`;

  const cards: ShowcaseCard[] = [
    {
      id: 'jlpt',
      badge: 'Faqat Premium',
      title: 'JLPT sinov imtihonlari',
      subtitle:
        "Haqiqiy imtihon tuzilishida: to'rt bo'lim, taymer, avtomatik baholash va xatolar ustida ishlash.",
      band: 'bg-gradient-to-br from-primary via-red-600 to-red-800',
      edge: 'border-primary/35',
      ink: 'text-primary',
      soft: 'border-primary/40 bg-primary/10 hover:border-primary hover:bg-primary/15',
      watermark: '日本',
      href: '/jlpt',
      linkLabel: "Bo'limni ko'rish",
      tiles: [
        { top: '文字・語彙', bottom: "Iyerogliflar & So'z", tint: 'from-emerald-500 to-teal-700' },
        { top: '文法', bottom: 'Grammatika', tint: 'from-sky-500 to-indigo-700' },
        { top: '読解', bottom: "O'qish", tint: 'from-rose-500 to-red-700' },
        { top: '聴解', bottom: 'Tinglash', tint: 'from-amber-400 to-orange-600' },
      ],
      points: [
        "Bo'limlarni alohida mashq qilish yoki to'liq imtihon",
        "Taymer serverda — chiqib ketib vaqt yutib bo'lmaydi",
        "Har savolning to'g'ri javobi va o'zbekcha izohi",
        "Bo'limlar bo'yicha ball va JLPT o'tish qoidasi",
      ],
    },
    {
      id: 'games',
      badge: `Bepulda kuniga ${free.dailyGames ?? '∞'} ta`,
      title: "Mashg'ulot va o'yinlar",
      subtitle:
        "Olti xil o'yin: so'zni tanish, juftlash, yozish va tezlik. Har g'alaba XP va tanga olib keladi.",
      band: 'bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-800',
      edge: 'border-violet-500/35',
      ink: 'text-violet-600 dark:text-violet-400',
      soft: 'border-violet-500/40 bg-violet-500/10 hover:border-violet-500 hover:bg-violet-500/15',
      watermark: '遊',
      href: '/games',
      linkLabel: "O'yinlarni ko'rish",
      tiles: [
        { top: 'テスト', bottom: 'Variantli test', tint: 'from-emerald-500 to-emerald-700' },
        { top: 'ペア', bottom: 'Mos juftliklar', tint: 'from-stone-500 to-stone-700' },
        { top: '書き', bottom: 'Yozish', tint: 'from-sky-500 to-blue-700' },
        { top: 'ミックス', bottom: 'Aralash mashq', tint: 'from-indigo-500 to-violet-700' },
      ],
      points: [
        `Kunlik chek: ${cap(free.dailyGames, 'ta')} → ${cap(premium.dailyGames, 'ta')}`,
        "Barcha o'yin turlari ikkala tarifda ham ochiq",
        'Natijalar SRS takrorlash navbatini yangilaydi',
        'Haftalik reyting va liga uchun XP',
      ],
    },
    {
      id: 'ai',
      badge: `Bepulda kuniga ${free.dailyAiMessages ?? '∞'} ta xabar`,
      title: 'AI suhbatdosh',
      subtitle:
        'Yapon tilida yozishmoq va gapirmoq uchun sabrli suhbatdosh — xatolaringizni tushuntirib boradi.',
      band: 'bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-800',
      edge: 'border-cyan-500/35',
      ink: 'text-cyan-600 dark:text-cyan-400',
      soft: 'border-cyan-500/40 bg-cyan-500/10 hover:border-cyan-500 hover:bg-cyan-500/15',
      watermark: '会話',
      href: '/chat',
      linkLabel: 'Suhbatni ochish',
      tiles: [
        { top: '会話', bottom: 'Matnli suhbat', tint: 'from-teal-500 to-cyan-700' },
        { top: '音声', bottom: 'Ovozli javob', tint: 'from-amber-400 to-orange-600' },
        { top: '先生', bottom: 'Sensei tanlash', tint: 'from-rose-500 to-pink-700' },
        { top: '訂正', bottom: 'Xatoni tuzatish', tint: 'from-violet-500 to-purple-700' },
      ],
      points: [
        `Kunlik xabar: ${cap(free.dailyAiMessages, 'ta')} → ${cap(premium.dailyAiMessages, 'ta')}`,
        `Talaffuz tinglash: ${cap(free.dailyTts, 'ta')} → ${cap(premium.dailyTts, 'ta')}`,
        'Darajangizga qarab soddalashtirilgan yapon tili',
        "O'zbekcha izoh bilan xatolarni ko'rsatadi",
      ],
    },
    {
      id: 'dict',
      badge: 'Takrorlash har doim bepul',
      title: "Lug'at va takrorlash",
      subtitle:
        "Oraliqli takrorlash (SRS) hech qachon cheklanmaydi. Premium shaxsiy lug'atingiz hajmini ochadi.",
      band: 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-700',
      edge: 'border-amber-500/35',
      ink: 'text-amber-600 dark:text-amber-400',
      soft: 'border-amber-500/40 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/15',
      watermark: '辞書',
      href: '/dictionary',
      linkLabel: "Lug'atni ochish",
      tiles: [
        { top: 'SRS', bottom: 'Oraliqli takror', tint: 'from-emerald-500 to-teal-700' },
        { top: '単語', bottom: "Saqlangan so'z", tint: 'from-sky-500 to-blue-700' },
        { top: '話題', bottom: 'Shaxsiy mavzu', tint: 'from-amber-400 to-orange-600' },
        { top: '発音', bottom: 'Talaffuz', tint: 'from-rose-500 to-pink-700' },
      ],
      points: [
        `Shaxsiy mavzu: ${cap(free.maxTopics, 'ta')} → ${cap(premium.maxTopics, 'ta')}`,
        `Mavzudagi so'z: ${cap(free.maxWordsPerTopic, 'ta')} → ${cap(premium.maxWordsPerTopic, 'ta')}`,
        `Saqlangan so'z: ${cap(free.maxSavedWords, 'ta')} → ${cap(premium.maxSavedWords, 'ta')}`,
        'Takrorlash (SRS) ikkala tarifda ham cheksiz',
      ],
    },
  ];

  /** Last card, the real ones, then the first card again. */
  const slides = [cards[cards.length - 1], ...cards, cards[0]];
  const firstReal = 1;
  const lastReal = cards.length;

  /** One page = a slide plus the gap after it. */
  const step = () => {
    const el = scroller.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    return first.offsetWidth + gap;
  };

  const scrollTo = (p: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: p * step(), behavior: smooth ? 'smooth' : 'auto' });
    setPage(p);
  };

  // Start on the first real card, past the leading clone.
  useEffect(() => {
    scrollTo(firstReal, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    const p = page + 1;
    scrollTo(p);
    if (p > lastReal) window.setTimeout(() => scrollTo(firstReal, false), SETTLE_MS);
  };

  const prev = () => {
    const p = page - 1;
    scrollTo(p);
    if (p < firstReal) window.setTimeout(() => scrollTo(lastReal, false), SETTLE_MS);
  };

  // ── Auto-advance ──
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(next, SLIDE_MS);
    return () => window.clearTimeout(t);
    // Re-armed after every move, so the timer measures from the last change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, paused]);

  // Keep the dots honest when the learner swipes instead of using the arrows.
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const w = step();
    if (!w) return;
    const p = Math.round(el.scrollLeft / w);
    if (p !== page) setPage(p);
  };

  const activeDot = (page - 1 + cards.length) % cards.length;

  return (
    <section
      className="mt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="mb-3 flex items-end justify-between gap-3 max-w-3xl mx-auto px-1">
        <div>
          <h2 className="text-lg font-extrabold text-text-primary">Nimalar ochiladi</h2>
          <p className="text-sm text-text-muted">Yon tomonga suring</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={prev}
            aria-label="Oldingi"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border
                       text-text-secondary transition-colors hover:border-primary/50 hover:text-primary"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={next}
            aria-label="Keyingi"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border
                       text-text-secondary transition-colors hover:border-primary/50 hover:text-primary"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* The rail is one card (48rem) plus a quarter of a card and a gap on
          each side — 74.5rem — so exactly 25% of the neighbours shows. The
          mask dissolves those quarters instead of cutting them. */}
      <div
        className="relative left-1/2 w-[min(74.5rem,100vw)] -translate-x-1/2
                   [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"
      >
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2
                     px-[max(1rem,calc((100%-48rem)/2))]
                     [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((c, i) => (
            <ShowcaseSlide key={`${c.id}-${i}`} card={c} active={i === page} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => scrollTo(i + firstReal)}
            aria-label={c.title}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === activeDot ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-text-muted',
            )}
          />
        ))}
      </div>
    </section>
  );
}

interface ShowcaseCard {
  id: string;
  badge: string;
  /** Border and glow — the card wears its own colour, not the gold accent. */
  edge: string;
  /** Accent text and tint for the checks and the link. */
  ink: string;
  soft: string;
  title: string;
  subtitle: string;
  band: string;
  watermark: string;
  href: string;
  linkLabel: string;
  tiles: { top: string; bottom: string; tint: string }[];
  points: string[];
}

function ShowcaseSlide({ card, active }: { card: ShowcaseCard; active: boolean }) {
  return (
    <div className="w-[min(48rem,86vw)] shrink-0 snap-center">
      <div
        className={cn(
          'card-glass overflow-hidden transition-all duration-500',
          card.edge,
          active ? 'opacity-100 blur-0' : 'scale-[0.96] opacity-50 blur-[2px]',
        )}
      >
        <div className={cn('relative overflow-hidden px-6 py-7 text-white', card.band)}>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-6 select-none text-[7rem]
                       font-black leading-none text-white/10"
          >
            {card.watermark}
          </span>
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5
                             text-[11px] font-bold ring-1 ring-inset ring-white/25">
              <Crown size={12} /> {card.badge}
            </span>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{card.title}</h3>
            <p className="mt-1.5 max-w-md text-sm text-white/85">{card.subtitle}</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {card.tiles.map((t) => (
              <div
                key={t.bottom}
                className="rounded-2xl border border-border bg-surface-2/50 p-3 text-center"
              >
                <span
                  className={cn('mx-auto mb-2 block h-1.5 w-10 rounded-full bg-gradient-to-r', t.tint)}
                />
                <p className="text-sm font-bold text-text-primary">{t.top}</p>
                <p className="text-[11px] text-text-muted">{t.bottom}</p>
              </div>
            ))}
          </div>

          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {card.points.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-text-secondary">
                <Check size={15} className={cn('mt-0.5 shrink-0', card.ink)} strokeWidth={2.5} />
                {t}
              </li>
            ))}
          </ul>

          <Link
            href={card.href}
            className={cn(
              'mt-5 flex items-center justify-center gap-2 rounded-xl border py-3',
              'text-sm font-bold transition-colors',
              card.soft,
              card.ink,
            )}
          >
            <ArrowRight size={16} />
            {card.linkLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * One tier, priced.
 *
 * The premium card carries a gradient band and a watermark so it reads as the
 * headline offer at a glance, while the free card stays deliberately quiet —
 * a pricing table where both options shout equally loudly makes the choice
 * harder, not fairer. The free card is still complete and honest: every line
 * it cannot do is shown struck through rather than hidden.
 *
 * The yearly and lifetime prices are shown as what they save against paying
 * monthly, because "249 000" means nothing on its own.
 */
function PlanCard({
  title, subtitle, price, priceNote, limits, highlight, extraPrices = [],
}: {
  title: string;
  subtitle: string;
  price: number;
  priceNote?: string;
  limits: TierLimits;
  highlight: boolean;
  extraPrices?: { label: string; value: number }[];
}) {
  /**
   * How much the yearly price saves against twelve monthly payments.
   *
   * Only the yearly plan gets one: a lifetime licence has no fixed number of
   * months to compare against, so any percentage printed on it would be a
   * figure we invented.
   */
  const yearlySaving = (value: number) =>
    price > 0 && value > 0 ? Math.round((1 - value / (price * 12)) * 100) : 0;

  return (
    <div
      className={cn(
        'card-glass relative flex flex-col overflow-hidden p-0 transition-shadow duration-300',
        highlight
          ? 'border-accent/50 shadow-glow-accent'
          : 'border-border/60 hover:border-border',
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          // Both headers share a height so the two feature lists start on the
          // same line — the premium one is taller by a price and two chips.
          'relative flex min-h-[12.5rem] flex-col overflow-hidden px-6 pb-5 pt-6',
          highlight ? 'bg-gradient-to-br from-accent via-amber-500 to-orange-700 text-white' : '',
        )}
      >
        {highlight && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute -right-3 -top-5 select-none text-[5.5rem]
                         font-black leading-none text-white/10"
            >
              匠
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
            />
          </>
        )}

        <div className="relative flex flex-1 flex-col">
          <div className="mb-1 flex items-center gap-2">
            {highlight && <Crown size={16} />}
            <h2
              className={cn(
                'text-xl font-extrabold',
                highlight ? 'text-white' : 'text-text-primary',
              )}
            >
              {title}
            </h2>
            {highlight && (
              <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-[10px]
                               font-bold uppercase tracking-wider ring-1 ring-inset ring-white/25">
                Tavsiya
              </span>
            )}
          </div>
          <p className={cn('text-xs', highlight ? 'text-white/80' : 'text-text-muted')}>
            {subtitle}
          </p>

          {/* Fixed offset rather than pushed down: with the header height
              already equal, this puts both price lines on the same baseline
              too, and the free card simply has room to spare beneath it. */}
          <div className="mt-5">
            {price > 0 ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black tracking-tight">{som(price)}</span>
                <span
                  className={cn(
                    'text-sm font-bold',
                    highlight ? 'text-white/80' : 'text-text-muted',
                  )}
                >
                  so&rsquo;m{priceNote ? ` / ${priceNote}` : ''}
                </span>
              </p>
            ) : (
              <p
                className={cn(
                  'text-4xl font-black tracking-tight',
                  highlight ? 'text-white' : 'text-text-primary',
                )}
              >
                {highlight ? '—' : 'Bepul'}
              </p>
            )}

            {extraPrices.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {extraPrices.map((p) => {
                  const off = p.label === 'Yillik' ? yearlySaving(p.value) : 0;
                  return (
                    <span
                      key={p.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1
                                 text-[11px] font-bold ring-1 ring-inset ring-white/25"
                    >
                      {p.label}: {som(p.value)}
                      {off > 0 && (
                        <span className="rounded-full bg-white/25 px-1.5 py-px text-[10px]">
                          −{off}%
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── What is included ───────────────────────────────────────── */}
      <ul className="flex-1 space-y-2.5 px-6 pb-6 pt-5 text-sm">
        <Feature ok>Takrorlash (SRS) — cheksiz</Feature>
        <Feature ok>
          {limits.dailyGames === null ? "Cheksiz o'yin" : `Kuniga ${limits.dailyGames} ta o'yin`}
        </Feature>
        <Feature ok>Barcha o&rsquo;yin turlari</Feature>
        <Feature ok>
          {limits.dailyAiMessages === null
            ? 'Cheksiz AI suhbat'
            : `Kuniga ${limits.dailyAiMessages} ta AI xabar`}
        </Feature>
        <Feature ok>
          {limits.maxTopics === null ? 'Cheksiz mavzu' : `${limits.maxTopics} ta shaxsiy mavzu`}
          {limits.maxWordsPerTopic !== null && ` · mavzuga ${limits.maxWordsPerTopic} so'z`}
        </Feature>
        <Feature ok>
          {limits.maxSavedWords === null
            ? "Cheksiz saqlangan so'z"
            : `${limits.maxSavedWords} ta saqlangan so'z`}
        </Feature>
        <Feature ok>
          {limits.dailyTts === null ? 'Cheksiz talaffuz' : `Kuniga ${limits.dailyTts} ta talaffuz`}
        </Feature>
        <Feature ok={limits.canShare}>Materialni ommaga ulashish</Feature>
        {/* The only outright-closed feature, so it is stated plainly rather
            than as a number. */}
        <Feature ok={highlight}>JLPT sinov imtihonlari (N5–N1)</Feature>
      </ul>
    </div>
  );
}

function Feature({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn('flex items-start gap-2.5', ok ? 'text-text-secondary' : 'text-text-muted/60')}>
      {ok
        ? <Check size={15} className="text-success shrink-0 mt-0.5" strokeWidth={2.5} />
        : <Minus size={15} className="shrink-0 mt-0.5" />}
      <span>{children}</span>
    </li>
  );
}
