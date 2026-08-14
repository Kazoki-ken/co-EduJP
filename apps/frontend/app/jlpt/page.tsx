'use client';

/**
 * JLPT overview — DESIGN PREVIEW.
 *
 * Level picker, the four exam sections, and the list of mock tests inside the
 * selected section. Counts come from lib/jlpt.ts and are illustrative; the
 * only behaviour that is real here is the premium gate, which genuinely sends
 * non-subscribers to /premium.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Shuffle, Sparkles, Timer, Trophy } from 'lucide-react';
import { LEVELS, SECTIONS, fullExamMinutes, type LevelId, type Section } from '@/lib/jlpt';
import { PremiumGateNotice, StartAction } from '@/components/jlpt/StartAction';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function JlptPage() {
  const [level, setLevel] = useState<LevelId>('N5');
  const [sectionId, setSectionId] = useState(SECTIONS[0].id);

  // Real tests from the API. The sample counts in lib/jlpt.ts stay as the
  // fallback for sections nobody has written questions for yet.
  const [live, setLive] = useState<LiveTest[]>([]);
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ tests: LiveTest[] }>(`/jlpt/levels/${level}`)
      .then((r) => !cancelled && setLive(r.data.tests))
      .catch(() => !cancelled && setLive([]));
    return () => {
      cancelled = true;
    };
  }, [level]);

  const activeLevel = LEVELS.find((l) => l.id === level)!;
  const section = SECTIONS.find((s) => s.id === sectionId)!;
  const stats = section.byLevel[level];
  const sectionTests = live.filter(
    (t) => t.section === SECTION_KEYS[section.id] && t.questionCount > 0,
  );

  return (
    <div className="page-container py-8 animate-fade-in">

      {/* Shown only for sections nobody has written questions for yet — once a
          section has real tests, saying it is a mock-up would be a lie. */}
      {sectionTests.length === 0 && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-border bg-surface-2/60
                        px-4 py-3 text-sm text-text-secondary">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-text-muted" />
          <p>
            <span className="font-bold text-text-primary">Namuna ko&rsquo;rinish.</span>{' '}
            Bu boʻlimga savollar hali qoʻshilmagan — testlar soni namunaviy.
          </p>
        </div>
      )}

      <PremiumGateNotice className="mb-6" />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="mb-7">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          JLPT sinov imtihonlari
        </h1>
        <p className="text-text-secondary font-medium mt-1.5">
          Darajani tanlang va imtihonga tayyorgarlikni boshlang
        </p>
      </header>

      {/* ── Full exam banner ───────────────────────────────────────────── */}
      <Link
        href={`/jlpt/full?level=${level}`}
        className="group mb-8 block rounded-2xl border border-primary/25 bg-primary/[0.07] p-4 sm:p-5
                   transition-colors hover:border-primary/50 hover:bg-primary/[0.1]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/15 border border-primary/25
                          flex items-center justify-center text-primary">
            <Timer size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-text-primary">
              To&rsquo;liq imtihon — {level}
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              To&rsquo;rt bo&rsquo;lim ketma-ket, imtihon kunidagi sharoitda. ~
              {Math.round(fullExamMinutes(level) / 60 * 10) / 10} soat.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
            Batafsil
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>

      {/* ── Level tabs ─────────────────────────────────────────────────── */}
      {/* overflow-x-auto also clips vertically, so the row needs padding for the
          hover lift and the glow to live in — without it the card's top edge is
          shaved off mid-animation. Negative margins keep the layout unchanged. */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 -mt-3 pt-3 pb-3 mb-5">
        {LEVELS.map((l) => {
          const active = l.id === level;
          return (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={cn(
                // Fixed width so the five cards read as one row of equal tiles —
                // sizing to the label would make "O'rtadan yuqori" twice N5's width.
                'group relative w-36 shrink-0 overflow-hidden rounded-2xl border px-4 pb-3 pt-5 text-left',
                'transition-all duration-200 hover:-translate-y-0.5',
                active
                  ? 'border-primary bg-primary/10 shadow-glow-sm'
                  : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-2',
              )}
            >
              {/* Level-tinted stripe — colour carries the difficulty ramp.
                  Inset on all sides so it floats as an island rather than
                  sitting flush against the card edge. */}
              <span
                aria-hidden
                className={cn(
                  'absolute left-4 right-4 top-2.5 h-1 rounded-full bg-gradient-to-r transition-opacity',
                  l.accent,
                  active ? 'opacity-100' : 'opacity-40 group-hover:opacity-80',
                )}
              />
              <span className={cn('block text-lg font-black leading-none', active ? 'text-primary' : 'text-text-primary')}>
                {l.id}
              </span>
              <span className="block text-[11px] font-medium text-text-muted mt-1.5">{l.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Section tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border pb-px mb-7">
        {SECTIONS.map((s) => {
          const active = s.id === sectionId;
          return (
            <button
              key={s.id}
              onClick={() => setSectionId(s.id)}
              className={cn(
                'shrink-0 flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                active ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              <s.Icon size={15} />
              {s.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  active ? 'bg-primary/15 text-primary' : 'bg-surface-2 text-text-muted',
                )}
              >
                {live.filter((t) => t.section === SECTION_KEYS[s.id] && t.questionCount > 0)
                  .length || s.byLevel[level].tests}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Section heading + link to the format page ──────────────────── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">
            {level} · {section.label}{' '}
            <span className="text-text-muted font-bold text-lg">{section.jp}</span>
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {sectionTests.length || stats.tests} ta test · {activeLevel.words}
            {sectionTests.length === 0 && ' · namunaviy'}
          </p>
        </div>
        <Link
          href={`/jlpt/${section.id}?level=${level}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          Bo&rsquo;lim formati
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* ── Random test ────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-border bg-surface-2/50 p-4
                      flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-accent/15 border border-accent/25
                        flex items-center justify-center text-accent">
          <Shuffle size={19} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text-primary">Tasodifiy test</h3>
          <p className="text-sm text-text-secondary">
            Avval tugallanmaganlari, so&rsquo;ng eng eski ishlanganlari
          </p>
        </div>
        <StartAction full={false} className="shrink-0 py-2.5 px-4" />
      </div>

      {/* ── Test grid ──────────────────────────────────────────────────── */}
      <motion.div
        key={`${level}-${sectionId}`}
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {sectionTests.length > 0
          ? sectionTests.map((t) => (
              <motion.div key={t.id} variants={item}>
                <TestCard
                  index={t.number}
                  level={level}
                  section={section}
                  href={`/jlpt/test/${t.id}`}
                  questionCount={t.questionCount}
                  best={t.best}
                />
              </motion.div>
            ))
          : Array.from({ length: stats.tests }, (_, i) => (
              <motion.div key={i} variants={item}>
                <TestCard index={i + 1} level={level} section={section} />
              </motion.div>
            ))}
      </motion.div>
    </div>
  );
}

// ─── Test card ────────────────────────────────────────────────────────────────

interface LiveTest {
  id: string;
  section: string;
  number: number;
  title: string | null;
  minutes: number;
  questionCount: number;
  /** The learner's own best result, once they have sat this test. */
  best: { score: number; maxScore: number } | null;
}

/** lib/jlpt.ts ids are lowercase; the API speaks the enum. */
const SECTION_KEYS: Record<string, string> = {
  moji: 'MOJI_GOI',
  bunpou: 'BUNPOU',
  dokkai: 'DOKKAI',
  choukai: 'CHOUKAI',
};

function TestCard({
  index,
  level,
  section,
  href,
  questionCount,
  best,
}: {
  index: number;
  level: LevelId;
  section: Section;
  href?: string;
  questionCount?: number;
  best?: { score: number; maxScore: number } | null;
}) {
  return (
    <Link
      href={href ?? `/jlpt/${section.id}?level=${level}&test=${index}`}
      className={cn(
        'group card-glass p-4 flex flex-col gap-3 h-full border-border',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40',
        section.glow,
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white ring-1 ring-inset ring-white/20', section.solid)}>
          <section.Icon size={17} strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-text-primary truncate">
            {section.title} — {index}-test
          </p>
          <p className="text-xs text-text-muted">
            {level} · {section.jp}
          </p>
        </div>

        <span className="w-8 h-8 shrink-0 rounded-full bg-primary/15 text-primary flex items-center
                         justify-center transition-transform group-hover:scale-110">
          <Play size={14} className="ml-0.5" />
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 mt-auto">
        <span className="text-xs font-semibold text-text-muted">
          {best
            ? 'Ishlangan'
            : questionCount
              ? `${questionCount} ta savol`
              : 'Boshlanmagan'}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-xs font-bold tabular-nums',
            best ? 'text-accent' : 'text-text-muted',
          )}
        >
          <Trophy size={12} />
          {best ? `${best.score}/${best.maxScore}` : '—'}
        </span>
      </div>
    </Link>
  );
}
