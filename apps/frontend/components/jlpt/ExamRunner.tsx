'use client';

/**
 * The exam runner — one section drill or the full four-part exam.
 *
 * One question fills the screen at a time. Everything else — the app sidebar,
 * the header, the bottom bar — is gone, both because a test paper deserves the
 * whole page and because there should be nothing to click your way out with.
 *
 * The two modes differ in three places and nowhere else: what is fetched, how
 * long the clock runs, and whether leaving is treated as strict. Keeping them
 * in one component is what stops the full exam quietly drifting away from the
 * drill it is supposed to be made of.
 *
 * Answers are held locally and flushed to the server in batches; see FLUSH_MS.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flag,
  Loader2,
  LogOut,
  Timer,
} from 'lucide-react';
import {
  fetchPaper,
  fetchSetPaper,
  finishAttempt,
  saveAnswers,
  startAttempt,
  startSetAttempt,
  type JlptGroup,
  type JlptQuestion,
} from '@/lib/jlptApi';
import { SECTION_LABELS } from '@/lib/jlpt';
import { mediaUrl } from '@/lib/jlptApi';
import { ExamGuard } from '@/components/jlpt/ExamGuard';
import { ListenPlayer } from '@/components/jlpt/ListenPlayer';
import { cn } from '@/lib/utils';

/** How often unsaved answers are pushed. Batching keeps write load low. */
const FLUSH_MS = 12_000;

interface Flat {
  q: JlptQuestion;
  groupNumber: number;
  groupType: string;
  instruction: string;
  instructionUz: string | null;
  passage: string | null;
  /** Diagram or notice shared by the whole もんだい. */
  groupImage: string | null;
  /** Only set in full-exam mode, where the paper crosses section boundaries. */
  section: string | null;
}

/** Listening items get a player instead of a printed text. */
const isListening = (type: string) => type.startsWith('LISTEN_');

interface Loaded {
  title: string;
  level: string;
  minutes: number;
  /** Groups in order, each tagged with the section it came from. */
  groups: (JlptGroup & { section: string | null })[];
}

export function ExamRunner({
  mode,
  id,
}: {
  /** 'test' is one section; 'set' is the full four-part exam. */
  mode: 'test' | 'set';
  id: string;
}) {
  const router = useRouter();

  const [paper, setPaper] = useState<Loaded | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  /** Question ids answered since the last successful flush. */
  const dirty = useRef<Set<string>>(new Set());
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // ── Load paper + open attempt ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (mode === 'set') {
          const [p, a] = await Promise.all([fetchSetPaper(id), startSetAttempt(id)]);
          if (cancelled) return;
          setPaper({
            title: p.title,
            level: p.level,
            minutes: p.minutes,
            groups: p.tests.flatMap((t) =>
              t.groups.map((g) => ({ ...g, section: t.section })),
            ),
          });
          setAttemptId(a.attempt.id);
          setRemaining(a.timing?.remainingSeconds ?? p.minutes * 60);
        } else {
          const [p, a] = await Promise.all([fetchPaper(id), startAttempt(id)]);
          if (cancelled) return;
          setPaper({
            title: p.title ?? `${p.number}-test`,
            level: p.level,
            minutes: p.minutes,
            groups: p.groups.map((g) => ({ ...g, section: null })),
          });
          setAttemptId(a.attempt.id);
          setRemaining(a.timing?.remainingSeconds ?? p.minutes * 60);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(
          e?.response?.status === 402
            ? 'Bu boʻlim faqat Premium obuna bilan ochiladi.'
            : 'Imtihonni ochib boʻlmadi.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, mode]);

  const flat: Flat[] = useMemo(
    () =>
      (paper?.groups ?? []).flatMap((g) =>
        g.questions.map((q) => ({
          q,
          groupNumber: g.number,
          groupType: g.type,
          instruction: g.instruction,
          instructionUz: g.instructionUz,
          passage: g.passage,
          groupImage: g.imageUrl,
          section: g.section,
        })),
      ),
    [paper],
  );

  const current = flat[index];
  const answeredCount = Object.keys(answers).length;

  // ── Flush answers ──
  const flush = useCallback(async () => {
    if (!attemptId || dirty.current.size === 0) return;
    const batch = Array.from(dirty.current).map((questionId) => ({
      questionId,
      chosen: answersRef.current[questionId] ?? null,
    }));
    dirty.current.clear();
    try {
      await saveAnswers(attemptId, batch);
    } catch {
      // Put them back so the next tick retries rather than losing the answers.
      batch.forEach((b) => dirty.current.add(b.questionId));
    }
  }, [attemptId]);

  useEffect(() => {
    const t = setInterval(flush, FLUSH_MS);
    return () => {
      clearInterval(t);
      void flush();
    };
  }, [flush]);

  // ── Submit ──
  const submit = useCallback(async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    await flush();
    try {
      await finishAttempt(attemptId);
      router.replace(`/jlpt/result/${attemptId}`);
    } catch {
      setSubmitting(false);
      setError('Yuborib boʻlmadi. Qayta urinib koʻring.');
    }
  }, [attemptId, flush, router, submitting]);

  // ── Countdown. Runs in the browser; the server holds the real deadline. ──
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining, submit]);

  const choose = useCallback(
    (n: number) => {
      if (!current) return;
      setAnswers((a) => ({ ...a, [current.q.id]: n }));
      dirty.current.add(current.q.id);
      // Move on by itself — on a 35-question paper the extra tap is friction.
      setTimeout(() => setIndex((i) => Math.min(i + 1, flat.length - 1)), 180);
    },
    [current, flat.length],
  );

  // ── Keyboard: 1–4 to answer, arrows to move ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) choose(Number(e.key));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, flat.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, flat.length]);

  // ── States ──
  if (error) {
    return (
      <Centered>
        <p className="text-text-secondary">{error}</p>
        <button onClick={() => router.push('/jlpt')} className="btn-ghost mt-4 text-sm">
          JLPT boʻlimiga qaytish
        </button>
      </Centered>
    );
  }

  if (!paper || !current) {
    return (
      <Centered>
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="mt-3 text-sm text-text-muted">Imtihon tayyorlanmoqda…</p>
      </Centered>
    );
  }

  const mm = Math.floor((remaining ?? 0) / 60);
  const ss = (remaining ?? 0) % 60;
  const urgent = (remaining ?? 0) <= 60;
  const warning = (remaining ?? 0) <= 300 && !urgent;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <ExamGuard
        active={!submitting}
        strict={mode === 'set'}
        onLeave={() => router.push('/jlpt')}
      />

      {/* ── Top bar: progress and clock ─────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-wider text-text-muted">
              {paper.level} · {paper.title}
              {current.section && ` · ${SECTION_LABELS[current.section] ?? ''}`}
            </p>
            <p className="text-sm font-bold text-text-primary">
              {index + 1} / {flat.length}
              <span className="ml-2 font-medium text-text-muted">
                · {answeredCount} ta belgilandi
              </span>
            </p>
          </div>

          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-lg font-bold tabular-nums',
              urgent
                ? 'animate-pulse border-danger/50 bg-danger/10 text-danger'
                : warning
                  ? 'border-warning/50 bg-warning/10 text-warning'
                  : 'border-border bg-surface-2 text-text-primary',
            )}
          >
            <Timer size={16} />
            {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </div>
        </div>

        {/* Hairline progress across the whole paper */}
        <div className="h-1 w-full bg-surface-2">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${((index + 1) / flat.length) * 100}%` }}
          />
        </div>
      </header>

      {/* ── The question ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="mb-1 text-xs font-bold text-primary">
            もんだい {current.groupNumber}
          </p>
          <p className="mb-7 text-sm text-text-muted">
            {current.instructionUz ?? current.instruction}
          </p>

          {/* Listening: the script is spoken, never shown. */}
          {isListening(current.groupType) && (current.q.audioUrl || current.q.transcript) && (
            <ListenPlayer
              key={current.q.id}
              text={current.q.transcript}
              audioUrl={current.q.audioUrl}
              once={mode === 'set'}
            />
          )}

          {/* Diagrams, notices and illustrations. The group's image belongs to
              every question in it; the question's own sits just above its
              choices. Both were stored but never drawn until now. */}
          {current.groupImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaUrl(current.groupImage)}
              alt=""
              className="mb-6 max-h-[420px] w-full rounded-2xl border border-border object-contain"
            />
          )}

          {/* Reading and cloze: the shared text stays above the question.
              INFO_SEARCH holds a timetable, so it keeps its column alignment. */}
          {!isListening(current.groupType) && current.passage && (
            <div
              className={cn(
                'mb-6 whitespace-pre-line rounded-2xl border border-border bg-surface-2/50 p-5',
                'text-[15px] leading-loose text-text-primary',
                current.groupType === 'INFO_SEARCH' && 'font-mono text-[13px] leading-relaxed',
              )}
            >
              {current.passage}
            </div>
          )}

          {/* The sentence. Japanese wants air, so this is large and loose. */}
          <div className="mb-8 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center
                             rounded-lg bg-primary text-sm font-black text-white">
              {current.q.number}
            </span>
            <p className="whitespace-pre-line text-2xl font-medium leading-relaxed text-text-primary sm:text-[26px]">
              {renderStem(current.q.stem, current.q.focus)}
            </p>
          </div>

          {current.q.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaUrl(current.q.imageUrl)}
              alt=""
              className="mb-6 max-h-[360px] w-full rounded-2xl border border-border object-contain"
            />
          )}

          {/* ── Choices ── */}
          <div className="grid gap-2.5">
            {current.q.choices.map((c) => {
              const picked = answers[current.q.id] === c.number;
              return (
                <button
                  key={c.id}
                  onClick={() => choose(c.number)}
                  className={cn(
                    'group flex items-center gap-3.5 rounded-2xl border px-4 py-4 text-left',
                    'transition-all duration-150 active:scale-[0.99]',
                    picked
                      ? 'border-primary bg-primary/10 shadow-glow-sm'
                      : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-colors',
                      picked
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-text-muted group-hover:border-primary/50 group-hover:text-primary',
                    )}
                  >
                    {picked ? <Check size={15} strokeWidth={3} /> : c.number}
                  </span>
                  <span
                    className={cn(
                      'font-medium text-text-primary',
                      c.text.length > 22 ? 'text-base leading-relaxed' : 'text-lg',
                    )}
                  >
                    {c.text}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-xs text-text-muted">
            Klaviatura: <kbd className="font-bold">1–4</kbd> javob,{' '}
            <kbd className="font-bold">← →</kbd> oldinga-orqaga
          </p>
        </div>
      </main>

      {/* ── Navigator ───────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {flat.map((f, i) => {
              const done = answers[f.q.id] !== undefined;
              const here = i === index;
              return (
                <button
                  key={f.q.id}
                  onClick={() => setIndex(i)}
                  aria-label={`${f.q.number}-savol`}
                  className={cn(
                    'h-7 w-7 rounded-md text-[11px] font-bold transition-colors',
                    here
                      ? 'bg-primary text-white ring-2 ring-primary/30'
                      : done
                        ? 'bg-primary/15 text-primary'
                        : 'bg-surface-2 text-text-muted hover:bg-border',
                  )}
                >
                  {f.q.number}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={index === 0}
              className="btn-ghost flex items-center gap-1.5 px-4 py-2.5 text-sm disabled:opacity-40"
            >
              <ArrowLeft size={15} /> Oldingi
            </button>

            {index === flat.length - 1 ? (
              <button
                onClick={() => setConfirmFinish(true)}
                disabled={submitting}
                className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
                Yakunlash
              </button>
            ) : (
              <button
                onClick={() => setIndex((i) => Math.min(i + 1, flat.length - 1))}
                className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
              >
                Keyingi <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* ── Finish confirmation ─────────────────────────────────────── */}
      {confirmFinish && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-slide-in rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-extrabold text-text-primary">Imtihonni yakunlaysizmi?</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {flat.length - answeredCount > 0 ? (
                <>
                  <span className="font-bold text-warning">
                    {flat.length - answeredCount} ta savol
                  </span>{' '}
                  belgilanmagan. Ular xato hisoblanadi.
                </>
              ) : (
                'Hamma savol belgilangan.'
              )}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setConfirmFinish(false)}
                className="btn-ghost flex-1 py-3 text-sm"
              >
                Qaytish
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="btn-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                Yakunlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Underline the word the question is about, the way the paper prints it. */
function renderStem(stem: string, focus: string | null) {
  if (!focus || !stem.includes(focus)) return stem;
  const [before, ...rest] = stem.split(focus);
  return (
    <>
      {before}
      <span className="underline decoration-primary decoration-2 underline-offset-[6px]">
        {focus}
      </span>
      {rest.join(focus)}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
      {children}
    </div>
  );
}
