'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  Target,
  CalendarDays,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pre-registration onboarding.
 *
 * IMPORTANT: nothing collected here is stored. The answers live in this
 * component's state, are used only to render the summary on the last screen,
 * and are dropped the moment the component unmounts — no API call carries
 * them anywhere, by design. They exist to give the visitor a sense of a
 * personalised plan before being asked to create an account.
 *
 * If a real personalisation feature is ever built, it should re-ask these
 * questions after signup rather than smuggling the answers through here.
 */

// ─── Questions ────────────────────────────────────────────────────────────────

interface Option {
  id: string;
  emoji: string;
  label: string;
  hint?: string;
  /** Marks the socially "safe" middle choice — most people pick it. */
  recommended?: boolean;
}

interface Question {
  id: 'goal' | 'level' | 'time' | 'blocker' | 'style';
  title: string;
  subtitle?: string;
  multi?: boolean;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: 'goal',
    title: "Yapon tilini nima uchun o'rganyapsiz?",
    subtitle: 'Maqsad aniq bo‘lsa, yo‘l ham qisqaradi.',
    options: [
      { id: 'anime', emoji: '🎬', label: 'Anime va manga', hint: "Tarjimasiz tushunish" },
      { id: 'jlpt', emoji: '🎓', label: 'JLPT imtihoni', hint: 'Sertifikat olish' },
      { id: 'work', emoji: '💼', label: 'Ish va karyera', hint: 'Yapon kompaniyasi' },
      { id: 'travel', emoji: '✈️', label: 'Yaponiyaga borish', hint: "Sayohat yoki o'qish" },
      { id: 'fun', emoji: '🌸', label: 'Shunchaki qiziqish', hint: 'Yangi til, yangi dunyo' },
    ],
  },
  {
    id: 'level',
    title: 'Hozirgi darajangiz qanday?',
    subtitle: "Xavotir olmang — ko'pchilik noldan boshlaydi.",
    options: [
      { id: 'zero', emoji: '🌱', label: 'Mutlaqo noldan', hint: 'Hiragana ham tanish emas' },
      { id: 'kana', emoji: '🍃', label: 'Alifboni bilaman', hint: "Hiragana / katakana o'qiyman" },
      { id: 'n5', emoji: '🌿', label: 'N5–N4 atrofida', hint: "Bir necha yuz so'z bilaman" },
      { id: 'n3', emoji: '🌳', label: 'N3 va undan yuqori', hint: "So'z boyligini kengaytirmoqchiman" },
    ],
  },
  {
    id: 'time',
    title: 'Kuniga qancha vaqt ajrata olasiz?',
    subtitle: "Ko'p emas — muntazam bo'lgani muhimroq.",
    options: [
      { id: '5', emoji: '⏱️', label: '5 daqiqa', hint: 'Yengil sur’at' },
      { id: '10', emoji: '⏰', label: '10 daqiqa', hint: 'Eng ko‘p tanlanadi', recommended: true },
      { id: '20', emoji: '🔥', label: '20 daqiqa', hint: 'Jadal sur’at' },
      { id: '30', emoji: '🚀', label: '30+ daqiqa', hint: 'Maksimal tezlik' },
    ],
  },
  {
    id: 'blocker',
    title: 'Ilgari nima xalaqit bergan?',
    subtitle: "Ko'pchilik shu joyda to'xtab qoladi.",
    options: [
      { id: 'forget', emoji: '🧠', label: 'Tez unutib qo‘yaman', hint: "Yodlagan so'zlar esdan chiqadi" },
      { id: 'boring', emoji: '😴', label: 'Zerikarli bo‘lgan', hint: 'Kartochkalar bir xil' },
      { id: 'time', emoji: '🕰️', label: 'Vaqt topolmaganman', hint: 'Muntazamlik yo‘q edi' },
      { id: 'start', emoji: '🧭', label: 'Qayerdan boshlashni bilmaganman', hint: 'Tizim yo‘q edi' },
    ],
  },
  {
    id: 'style',
    title: 'Qanday o‘rganish sizga yoqadi?',
    subtitle: 'Bir nechtasini tanlashingiz mumkin.',
    multi: true,
    options: [
      { id: 'games', emoji: '🎮', label: "O'yin orqali" },
      { id: 'test', emoji: '📝', label: 'Test yechib' },
      { id: 'write', emoji: '✍️', label: 'Yozib mashq qilib' },
      { id: 'ai', emoji: '🤖', label: 'AI bilan suhbatlashib' },
      { id: 'audio', emoji: '🎧', label: 'Eshitib, talaffuz bilan' },
    ],
  },
];

// ─── Plan (derived on the client, from the answers, for display only) ─────────

const WORDS_PER_DAY: Record<string, number> = { '5': 5, '10': 10, '20': 20, '30': 30 };

/** Where each starting level is heading next, and how big that step is. */
const NEXT_TARGET: Record<string, { level: string; words: number }> = {
  zero: { level: 'N5', words: 800 },
  kana: { level: 'N5', words: 800 },
  n5: { level: 'N4', words: 1500 },
  n3: { level: 'N2', words: 6000 },
};

interface Plan {
  perDay: number;
  targetLevel: string;
  targetWords: number;
  months: number;
}

function buildPlan(answers: Record<string, string[]>): Plan {
  const perDay = WORDS_PER_DAY[answers.time?.[0] ?? '10'] ?? 10;
  const target = NEXT_TARGET[answers.level?.[0] ?? 'zero'] ?? NEXT_TARGET.zero;
  const months = Math.max(1, Math.round(target.words / (perDay * 30)));
  return { perDay, targetLevel: target.level, targetWords: target.words, months };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingQuiz({ onFinish, onSkip }: { onFinish: () => void; onSkip: () => void }) {
  /** `step` walks the questions; then 'BUILDING', then 'PLAN'. */
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'QUESTIONS' | 'BUILDING' | 'PLAN'>('QUESTIONS');
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const question = QUESTIONS[step];
  const selected = answers[question?.id ?? ''] ?? [];
  const total = QUESTIONS.length;
  const progress = phase === 'QUESTIONS' ? (step / total) * 100 : 100;

  const choose = (optionId: string) => {
    if (!question) return;

    if (question.multi) {
      setAnswers((a) => {
        const cur = a[question.id] ?? [];
        return {
          ...a,
          [question.id]: cur.includes(optionId)
            ? cur.filter((x) => x !== optionId)
            : [...cur, optionId],
        };
      });
      return;
    }

    setAnswers((a) => ({ ...a, [question.id]: [optionId] }));
    // A short beat so the tick is visible before the card slides away.
    setTimeout(() => advance(), 260);
  };

  const advance = () => {
    setStep((s) => {
      if (s + 1 >= total) {
        setPhase('BUILDING');
        return s;
      }
      return s + 1;
    });
  };

  const back = () => {
    if (step === 0) {
      onSkip();
      return;
    }
    setStep((s) => s - 1);
  };

  return (
    <div className="w-full max-w-xl">
      {/* ── Progress header ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={back}
          disabled={phase !== 'QUESTIONS'}
          className="p-2 rounded-xl border border-border/60 bg-surface/60 text-text-muted
                     hover:text-text-primary hover:border-primary/40 transition-colors
                     disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Orqaga"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        <span className="text-xs font-bold text-text-muted tabular-nums w-9 text-right">
          {phase === 'QUESTIONS' ? `${step + 1}/${total}` : `${total}/${total}`}
        </span>
      </div>

      {/* No exit animations here on purpose: `AnimatePresence mode="wait"`
          holds the next screen back until the previous one finishes animating,
          and rAF is paused while a tab is in the background — a backgrounded
          quiz could come back stuck on the old question. Keying the entry
          animation gives the same feel with nothing to wait on. */}
      <div>
        {phase === 'QUESTIONS' && question && (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="text-2xl sm:text-[1.75rem] font-black text-text-primary leading-tight tracking-tight mb-2">
              {question.title}
            </h1>
            {question.subtitle && (
              <p className="text-sm text-text-muted mb-7">{question.subtitle}</p>
            )}

            <div className="space-y-2.5">
              {question.options.map((opt) => {
                const active = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => choose(opt.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-150',
                      active
                        ? 'bg-primary/10 border-primary/50 shadow-glow-sm'
                        : 'bg-surface/70 border-border/60 hover:border-primary/40 hover:bg-surface',
                    )}
                  >
                    <span className="text-2xl shrink-0">{opt.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className={cn('font-bold text-sm', active ? 'text-primary' : 'text-text-primary')}>
                          {opt.label}
                        </span>
                        {opt.recommended && (
                          <span className="badge-chip bg-accent/15 text-accent border border-accent/30 text-[10px]">
                            Tavsiya
                          </span>
                        )}
                      </span>
                      {opt.hint && (
                        <span className="block text-[12px] text-text-muted mt-0.5">{opt.hint}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        active ? 'bg-primary border-primary text-white' : 'border-border',
                      )}
                    >
                      {active && <Check size={13} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Multi-select needs an explicit continue; single-select auto-advances. */}
            {question.multi && (
              <button
                onClick={advance}
                disabled={selected.length === 0}
                className="btn-primary w-full mt-6 py-3.5 flex items-center justify-center gap-2 group
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Davom etish
                <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <button
              onClick={onSkip}
              className="block mx-auto mt-6 text-xs text-text-muted hover:text-primary transition-colors"
            >
              {"Savollarni o'tkazib yuborish"}
            </button>
          </motion.div>
        )}

        {phase === 'BUILDING' && (
          <BuildingStep key="building" onDone={() => setPhase('PLAN')} />
        )}

        {phase === 'PLAN' && (
          <PlanStep key="plan" plan={buildPlan(answers)} onFinish={onFinish} />
        )}
      </div>
    </div>
  );
}

// ─── "Building your plan" beat ────────────────────────────────────────────────

const BUILD_LINES = [
  'Javoblaringiz tahlil qilinmoqda',
  "Takrorlash oralig'i sozlanmoqda",
  "Boshlang'ich so'zlar tanlanmoqda",
  'Kunlik maqsad hisoblanmoqda',
];

function BuildingStep({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    // Purely a pacing device: four short beats, then the summary. Nothing is
    // being computed on a server here.
    const timers = BUILD_LINES.map((_, i) =>
      setTimeout(() => setDone(i + 1), 420 * (i + 1)),
    );
    const finish = setTimeout(onDone, 420 * BUILD_LINES.length + 500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 mx-auto mb-6
                      flex items-center justify-center shadow-glow-sm">
        <Sparkles size={26} className="text-primary" />
      </div>
      <h1 className="text-2xl font-black text-text-primary mb-8">
        {"Shaxsiy rejangiz tuzilmoqda"}
      </h1>

      <div className="space-y-3 max-w-xs mx-auto text-left">
        {BUILD_LINES.map((line, i) => (
          <div key={line} className="flex items-center gap-3">
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors',
                i < done ? 'bg-success text-white' : 'bg-surface-2 border border-border/60',
              )}
            >
              {i < done ? (
                <Check size={11} strokeWidth={3} />
              ) : (
                <Loader2 size={11} className="animate-spin text-text-muted" />
              )}
            </span>
            <span className={cn('text-sm', i < done ? 'text-text-primary font-semibold' : 'text-text-muted')}>
              {line}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Plan summary ─────────────────────────────────────────────────────────────

function PlanStep({ plan, onFinish }: { plan: Plan; onFinish: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.45, delay: 0.05 }}
        className="w-16 h-16 rounded-2xl bg-success/15 border border-success/30 mx-auto mb-6
                   flex items-center justify-center"
      >
        <Check size={28} className="text-success" strokeWidth={3} />
      </motion.div>

      <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-3">
        {'Rejangiz tayyor'}
      </h1>
      <p className="text-sm text-text-secondary max-w-sm mx-auto mb-8">
        {"Javoblaringizga qarab tuzilgan taxminiy hisob — hisob yaratganingizdan keyin darhol shu sur'atda boshlaysiz."}
      </p>

      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { icon: Target, value: `${plan.perDay}`, label: "kunlik so'z" },
          { icon: Layers, value: plan.targetLevel, label: 'keyingi daraja' },
          { icon: CalendarDays, value: `~${plan.months}`, label: 'oyda' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="card-glass p-4 border-border/60">
            <Icon size={16} className="text-primary mx-auto mb-2" />
            <p className="text-xl font-black text-text-primary leading-none">{value}</p>
            <p className="text-[10px] text-text-muted mt-1.5 font-semibold uppercase tracking-wider">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="card-glass p-5 border-border/60 text-left mb-7">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
          {'Reja nimadan iborat'}
        </p>
        <ul className="space-y-2.5">
          {[
            `Kuniga ${plan.perDay} ta yangi so'z va tizim tanlagan takrorlashlar`,
            `${plan.targetLevel} darajasi uchun ~${plan.targetWords.toLocaleString('uz-UZ').replace(/,/g, ' ')} ta so'z`,
            "Har kuni seriya, XP va kunlik maqsadlar bilan nazorat",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-sm text-text-secondary">
              <Check size={15} className="text-success shrink-0 mt-0.5" strokeWidth={3} />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onFinish}
        className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 group shadow-glow"
      >
        {"Shu sur'atda boshlash"}
        <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
      <p className="text-[11px] text-text-muted mt-3">
        {"Keyingi qadam — bir daqiqalik ro'yxatdan o'tish"}
      </p>
    </motion.div>
  );
}
