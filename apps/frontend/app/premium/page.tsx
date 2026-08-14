'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, BookMarked, Check, Crown, Gamepad2,
  Infinity as InfinityIcon, Library, Loader2, MessageCircle, Minus, Send,
  Share2,
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

      {/* JLPT — the newest thing behind the paywall, and the one a price list
          cannot explain on its own. Shown to everyone, subscriber or not. */}
      <JlptShowcase />

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
    <div className="card-glass p-6 mt-8 max-w-3xl mx-auto">
      <h2 className="font-bold text-text-primary mb-1 flex items-center gap-2">
        <Send size={16} className="text-primary" /> Telegram orqali to&rsquo;lash
      </h2>
      <p className="text-sm text-text-muted mb-5">
        {"Tarifni tanlang — bot kartani va summani ko'rsatadi. To'lab, chek rasmini botga yuborasiz."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLAN_META.filter((p) => prices[p.id] > 0).map((p) => (
          <button
            key={p.id}
            onClick={() => buy(p.id)}
            disabled={busy !== null}
            className={cn(
              'card-glass p-4 text-left transition-all hover:-translate-y-0.5 disabled:opacity-50',
              p.id === 'yearly'
                ? 'border-accent/50 hover:border-accent'
                : 'border-border/60 hover:border-primary/50',
            )}
          >
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{p.label}</p>
            <p className="text-xl font-black text-text-primary mt-1">
              {som(prices[p.id])}
              <span className="text-xs font-semibold text-text-muted ml-1">so&rsquo;m</span>
            </p>
            {p.note && <p className="text-[11px] text-accent font-semibold mt-1">{p.note}</p>}
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary mt-3">
              {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Sotib olish
            </span>
          </button>
        ))}
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

      <ol className="mt-5 space-y-1.5 text-xs text-text-muted list-decimal list-inside">
        <li>Bot karta raqamini va aniq summani ko&rsquo;rsatadi</li>
        <li>Kartaga pul o&rsquo;tkazasiz</li>
        <li>Chek rasmini botga yuborasiz</li>
        <li>Admin tasdiqlagach Premium avtomatik ulanadi</li>
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
 * What a subscription actually opens in the JLPT section.
 *
 * Deliberately concrete — the four parts, their timings, how a result is
 * reported — because "JLPT mock exams" as a bullet point tells a learner
 * nothing about whether it is worth paying for.
 */
function JlptShowcase() {
  const parts = [
    { jp: '文字・語彙', uz: "Iyerogliflar & So'z", min: 20, tint: 'from-emerald-500 to-teal-700' },
    { jp: '文法',       uz: 'Grammatika',          min: 20, tint: 'from-sky-500 to-indigo-700' },
    { jp: '読解',       uz: "O'qish",              min: 20, tint: 'from-rose-500 to-red-700' },
    { jp: '聴解',       uz: 'Tinglash',            min: 30, tint: 'from-amber-400 to-orange-600' },
  ];

  return (
    <div className="card-glass mt-10 max-w-3xl mx-auto overflow-hidden border-accent/30">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-red-600 to-red-800 px-6 py-7 text-white">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-6 select-none text-[7rem] font-black leading-none text-white/10"
        >
          日本
        </span>
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5
                           text-[11px] font-bold ring-1 ring-inset ring-white/25">
            <Crown size={12} /> Faqat Premium
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">JLPT sinov imtihonlari</h2>
          <p className="mt-1.5 max-w-md text-sm text-white/85">
            Haqiqiy imtihon tuzilishida: to&rsquo;rt bo&rsquo;lim, taymer, avtomatik baholash va
            xatolar ustida ishlash.
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {parts.map((p) => (
            <div key={p.jp} className="rounded-2xl border border-border bg-surface-2/50 p-3 text-center">
              <span
                className={cn(
                  'mx-auto mb-2 block h-1.5 w-10 rounded-full bg-gradient-to-r',
                  p.tint,
                )}
              />
              <p className="text-sm font-bold text-text-primary">{p.jp}</p>
              <p className="text-[11px] text-text-muted">{p.uz}</p>
              <p className="mt-1 text-[11px] font-bold text-text-secondary">{p.min} daq</p>
            </div>
          ))}
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            "Bo'limlarni alohida mashq qilish yoki to'liq imtihon (90 daq)",
            "Taymer serverda — chiqib ketib vaqt yutib bo'lmaydi",
            "Har savolning to'g'ri javobi va o'zbekcha izohi",
            "Bo'limlar bo'yicha ball va JLPT o'tish qoidasi",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-sm text-text-secondary">
              <Check size={15} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
              {t}
            </li>
          ))}
        </ul>

        <Link
          href="/jlpt"
          className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-accent/40
                     bg-accent/10 py-3 text-sm font-bold text-accent transition-colors
                     hover:border-accent hover:bg-accent/15"
        >
          <GraduationCap size={16} />
          Bo&rsquo;limni ko&rsquo;rish
        </Link>
      </div>
    </div>
  );
}

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
  return (
    <div className={cn(
      'card-glass p-6 flex flex-col',
      highlight ? 'border-accent/50 shadow-glow-accent' : 'border-border/60',
    )}>
      <div className="flex items-center gap-2 mb-1">
        {highlight && <Crown size={16} className="text-accent" />}
        <h2 className={cn('text-xl font-extrabold', highlight ? 'text-accent' : 'text-text-primary')}>
          {title}
        </h2>
      </div>
      <p className="text-xs text-text-muted mb-4">{subtitle}</p>

      <div className="mb-5">
        {price > 0 ? (
          <p className="text-3xl font-black text-text-primary">
            {som(price)}
            <span className="text-sm font-semibold text-text-muted ml-1.5">
              so&rsquo;m{priceNote ? ` / ${priceNote}` : ''}
            </span>
          </p>
        ) : (
          <p className="text-3xl font-black text-text-primary">
            {highlight ? '—' : 'Bepul'}
          </p>
        )}
        {extraPrices.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {extraPrices.map((p) => (
              <span key={p.label} className="badge-chip bg-surface-2 text-text-secondary border border-border text-[11px]">
                {p.label}: {som(p.value)} so&rsquo;m
              </span>
            ))}
          </div>
        )}
      </div>

      <ul className="space-y-2.5 text-sm flex-1">
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
