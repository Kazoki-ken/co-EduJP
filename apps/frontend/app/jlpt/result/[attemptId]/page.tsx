'use client';

/**
 * What the learner sees the moment the paper is submitted.
 *
 * The score is deliberately labelled approximate: the real JLPT scales raw
 * answers with item response theory, which cannot be reproduced from outside,
 * so quoting "80/180" here would be a fiction. The pass rule, on the other
 * hand, is modelled honestly — a total threshold plus a floor in every
 * section — and that is the part worth teaching.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, ListChecks, Loader2, Target, TrendingUp } from 'lucide-react';
import { SECTION_LABELS } from '@/lib/jlpt';
import { cn } from '@/lib/utils';

interface Attempt {
  id: string;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  sectionScores: Record<string, { score: number; max: number }> | null;
}

export default function JlptResultPage({ params }: { params: { attemptId: string } }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [failed, setFailed] = useState(false);

  /**
   * Back from here goes to the JLPT section, never to the paper.
   *
   * The runner leaves a spare history entry behind (the exam guard pushes one
   * to trap the back button), so an unguarded Back would land on the run URL
   * and silently start the test over. A spare entry of our own absorbs the
   * press and redirects instead.
   */
  useEffect(() => {
    window.history.pushState({ jlptResult: true }, '');
    const onPop = () => router.replace('/jlpt');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [router]);

  useEffect(() => {
    api
      .get<{ attempt: Attempt }>(`/jlpt/attempts/${params.attemptId}`)
      .then((r) => setAttempt(r.data.attempt))
      .catch(() => setFailed(true));
  }, [params.attemptId]);

  if (failed) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-text-secondary">Natijani ochib boʻlmadi.</p>
        <Link href="/jlpt" className="btn-ghost mt-4 inline-block text-sm">
          JLPT boʻlimiga qaytish
        </Link>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="page-container flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const score = attempt.score ?? 0;
  const max = attempt.maxScore ?? 0;
  const pct = max ? Math.round((score / max) * 100) : 0;
  const passed = attempt.passed === true;

  return (
    <div className="page-container max-w-2xl animate-fade-in py-8">
      <Link
        href="/jlpt"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary
                   transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={15} />
        JLPT boʻlimlari
      </Link>

      {/* ── Headline ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'overflow-hidden rounded-2xl border p-7 text-center',
          passed ? 'border-success/30 bg-success/[0.07]' : 'border-warning/30 bg-warning/[0.07]',
        )}
      >
        <span
          className={cn(
            'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full',
            passed ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
          )}
        >
          {passed ? <TrendingUp size={24} /> : <Target size={24} />}
        </span>

        <p className="text-sm font-bold uppercase tracking-wider text-text-muted">Natija</p>
        <p className="mt-1 text-5xl font-black tracking-tight text-text-primary">
          {score}
          <span className="text-2xl font-bold text-text-muted"> / {max}</span>
        </p>
        <p
          className={cn(
            'mt-2 text-base font-extrabold',
            passed ? 'text-success' : 'text-warning',
          )}
        >
          {pct}% — {passed ? 'oʻtdingiz' : 'oʻtolmadingiz'}
        </p>
      </div>

      {/* ── Per section ──────────────────────────────────────────────── */}
      {attempt.sectionScores && Object.keys(attempt.sectionScores).length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-extrabold text-text-primary">Boʻlimlar boʻyicha</h2>
          <div className="space-y-2.5">
            {Object.entries(attempt.sectionScores).map(([section, s]) => {
              const p = s.max ? Math.round((s.score / s.max) * 100) : 0;
              // The section floor mirrors the backend's 32% rule.
              const low = s.max > 0 && s.score / s.max < 0.32;
              return (
                <div key={section} className="card-glass p-4">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-text-primary">
                      {SECTION_LABELS[section] ?? section}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-text-secondary">
                      {s.score} / {s.max}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        low ? 'bg-danger' : 'bg-gradient-to-r from-primary to-accent',
                      )}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  {low && (
                    <p className="mt-2 text-xs font-semibold text-danger">
                      Bu boʻlim eng past chegaradan pastda — JLPTda shu holat yiqilishga olib keladi.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-6 rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-xs leading-relaxed text-text-muted">
        Ball taxminiy. Haqiqiy JLPTda ballar maxsus shkala bilan hisoblanadi va uni tashqaridan
        aniq takrorlab boʻlmaydi. Bu yerdagi oʻtish qoidasi esa haqiqiysiga mos: umumiy chegara
        va har boʻlimdan minimal ball.
      </p>

      {/* The review is the point of the whole screen — a score alone teaches
          nothing, so it leads and "pick another test" follows. */}
      <Link
        href={`/jlpt/review/${attempt.id}`}
        className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-primary/40
                   bg-primary/10 py-3.5 text-sm font-bold text-primary transition-colors
                   hover:border-primary hover:bg-primary/15"
      >
        <ListChecks size={16} />
        Javoblarni koʻrish
      </Link>

      <Link href="/jlpt" className="btn-primary mt-2.5 block py-3 text-center text-sm">
        Boshqa test tanlash
      </Link>
    </div>
  );
}
