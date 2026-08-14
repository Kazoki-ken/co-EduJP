'use client';

/**
 * The marked paper.
 *
 * Every question the learner answered, with their pick and the right answer
 * side by side. The colour does the talking: red is what they chose and got
 * wrong, green is what was correct. A wrong answer is only useful if you can
 * see what should have been there instead, so both are always shown together
 * rather than one replacing the other.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Filter, Loader2, Minus, X } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Choice {
  id: string;
  number: number;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  number: number;
  stem: string;
  focus: string | null;
  explanationUz: string | null;
  transcript: string | null;
  chosen: number | null;
  isCorrect: boolean;
  choices: Choice[];
}

interface Group {
  id: string;
  number: number;
  instruction: string;
  instructionUz: string | null;
  passage: string | null;
  questions: Question[];
}

interface Review {
  attempt: { id: string; score: number | null; maxScore: number | null };
  groups: Group[];
}

export default function JlptReviewPage({ params }: { params: { attemptId: string } }) {
  const [data, setData] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);

  useEffect(() => {
    api
      .get<Review>(`/jlpt/attempts/${params.attemptId}/review`)
      .then((r) => setData(r.data))
      .catch((e) =>
        setError(
          e?.response?.status === 409
            ? 'Imtihon hali tugallanmagan.'
            : 'Javoblarni ochib boʻlmadi.',
        ),
      );
  }, [params.attemptId]);

  const stats = useMemo(() => {
    if (!data) return { right: 0, wrong: 0, blank: 0 };
    let right = 0;
    let wrong = 0;
    let blank = 0;
    for (const g of data.groups)
      for (const q of g.questions) {
        if (q.chosen === null) blank++;
        else if (q.isCorrect) right++;
        else wrong++;
      }
    return { right, wrong, blank };
  }, [data]);

  if (error) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-text-secondary">{error}</p>
        <Link href="/jlpt" className="btn-ghost mt-4 inline-block text-sm">
          JLPT boʻlimiga qaytish
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl animate-fade-in py-8">
      <Link
        href={`/jlpt/result/${params.attemptId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary
                   transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={15} />
        Natijaga qaytish
      </Link>

      <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
        Javoblar tahlili
      </h1>

      {/* ── Tally ────────────────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <Tally n={stats.right} label="Toʻgʻri" tone="right" />
        <Tally n={stats.wrong} label="Xato" tone="wrong" />
        <Tally n={stats.blank} label="Belgilanmagan" tone="blank" glow={stats.blank > 0} />
      </div>

      {stats.wrong + stats.blank > 0 && (
        <button
          onClick={() => setOnlyWrong((v) => !v)}
          className={cn(
            'mt-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors',
            onlyWrong
              ? 'border-danger/50 bg-danger/10 text-danger'
              : 'border-border text-text-secondary hover:border-primary/40 hover:text-text-primary',
          )}
        >
          <Filter size={15} />
          {onlyWrong ? 'Hammasini koʻrsatish' : 'Faqat xatolarni koʻrsatish'}
        </button>
      )}

      {/* ── Questions ────────────────────────────────────────────────── */}
      <div className="mt-7 space-y-8">
        {data.groups.map((g) => {
          const shown = onlyWrong
            ? g.questions.filter((q) => !q.isCorrect)
            : g.questions;
          if (shown.length === 0) return null;

          return (
            <section key={g.id}>
              <div className="mb-4 border-b border-border pb-2">
                <p className="text-xs font-black text-primary">もんだい {g.number}</p>
                <p className="mt-0.5 text-sm text-text-muted">
                  {g.instructionUz ?? g.instruction}
                </p>
              </div>

              {g.passage && (
                <div className="mb-4 whitespace-pre-line rounded-xl border border-border bg-surface-2/50 p-4
                                text-[15px] leading-loose text-text-primary">
                  {g.passage}
                </div>
              )}

              <div className="space-y-4">
                {shown.map((q) => (
                  <QuestionCard key={q.id} q={q} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Link href="/jlpt" className="btn-ghost mt-10 block py-3 text-center text-sm">
        JLPT boʻlimiga qaytish
      </Link>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function Tally({
  n,
  label,
  tone,
  glow,
}: {
  n: number;
  label: string;
  tone: 'right' | 'wrong' | 'blank';
  /** Left-blank questions are the most costly kind, so they are lit up. */
  glow?: boolean;
}) {
  const tones = {
    right: 'border-success/30 bg-success/10 text-success',
    wrong: 'border-danger/30 bg-danger/10 text-danger',
    blank: glow
      ? 'border-danger/50 bg-danger/10 text-danger shadow-[0_0_20px_rgba(232,57,41,0.35)]'
      : 'border-border bg-surface-2 text-text-muted',
  };
  return (
    <div className={cn('rounded-2xl border px-3 py-4 text-center transition-shadow', tones[tone])}>
      <p className="text-2xl font-black leading-none tabular-nums">{n}</p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </p>
    </div>
  );
}

function QuestionCard({ q }: { q: Question }) {
  const correct = q.choices.find((c) => c.isCorrect)?.number ?? null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border',
        q.isCorrect
          ? 'border-success/25 bg-success/[0.04]'
          : q.chosen === null
            ? // Skipped outright — the one outcome worth making impossible to miss.
              'border-danger/50 bg-danger/[0.06] shadow-[0_0_22px_rgba(232,57,41,0.3)]'
            : 'border-danger/25 bg-danger/[0.04]',
      )}
    >
      {/* Question */}
      <div className="flex items-start gap-3 px-4 pt-4">
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white',
            q.isCorrect ? 'bg-success' : 'bg-danger',
          )}
        >
          {q.number}
        </span>
        <p className="whitespace-pre-line text-lg font-medium leading-relaxed text-text-primary">
          {renderStem(q.stem, q.focus)}
        </p>
      </div>

      {/* The script, now that listening is over — this is where a learner
          finds out what they actually missed. */}
      {q.transcript && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Audio matni
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
            {q.transcript}
          </p>
        </div>
      )}

      {/* Choices */}
      <div className="mt-3 space-y-1.5 px-4 pb-4">
        {q.choices.map((c) => {
          const isRight = c.isCorrect;
          const isPicked = q.chosen === c.number;
          const pickedWrong = isPicked && !isRight;

          return (
            <div
              key={c.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                isRight
                  ? 'border-success/40 bg-success/10'
                  : pickedWrong
                    ? 'border-danger/40 bg-danger/10'
                    : 'border-transparent',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold',
                  isRight
                    ? 'bg-success text-white'
                    : pickedWrong
                      ? 'bg-danger text-white'
                      : 'bg-surface-2 text-text-muted',
                )}
              >
                {isRight ? (
                  <Check size={13} strokeWidth={3} />
                ) : pickedWrong ? (
                  <X size={13} strokeWidth={3} />
                ) : (
                  c.number
                )}
              </span>

              <span
                className={cn(
                  'flex-1 text-base',
                  isRight
                    ? 'font-bold text-success'
                    : pickedWrong
                      ? 'font-semibold text-danger line-through decoration-danger/50'
                      : 'text-text-secondary',
                )}
              >
                {c.text}
              </span>

              {isPicked && (
                <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-text-muted">
                  siz
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Verdict strip */}
      <div
        className={cn(
          'flex items-center gap-2 border-t px-4 py-2.5 text-xs font-semibold',
          q.isCorrect
            ? 'border-success/20 bg-success/[0.06] text-success'
            : 'border-danger/20 bg-danger/[0.06] text-danger',
        )}
      >
        {q.isCorrect ? (
          <>
            <Check size={13} strokeWidth={3} /> Toʻgʻri
          </>
        ) : q.chosen === null ? (
          <>
            <Minus size={13} strokeWidth={3} /> Belgilanmagan — toʻgʻrisi {correct}-variant
          </>
        ) : (
          <>
            <X size={13} strokeWidth={3} /> Xato — toʻgʻrisi {correct}-variant
          </>
        )}
      </div>

      {/* Why */}
      {q.explanationUz && !q.isCorrect && (
        <p className="border-t border-border bg-surface/60 px-4 py-3 text-sm leading-relaxed text-text-secondary">
          {q.explanationUz}
        </p>
      )}
    </div>
  );
}

function renderStem(stem: string, focus: string | null) {
  if (!focus || !stem.includes(focus)) return stem;
  const [before, ...rest] = stem.split(focus);
  return (
    <>
      {before}
      <span className="underline decoration-primary decoration-2 underline-offset-4">
        {focus}
      </span>
      {rest.join(focus)}
    </>
  );
}
