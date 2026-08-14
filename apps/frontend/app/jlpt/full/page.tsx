'use client';

/**
 * Full mock exam — all four sections back to back.
 *
 * A briefing screen rather than a test: it lists the parts in exam order with
 * their real timings and question counts, sets expectations, and then hands off
 * to the runner. Everything here comes from the API, so a section that has no
 * questions yet shows as empty instead of pretending otherwise.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Timer, Trophy } from 'lucide-react';
import api from '@/lib/api';
import { LEVELS, SECTIONS, SECTION_LABELS, type LevelId } from '@/lib/jlpt';
import { PremiumGateNotice } from '@/components/jlpt/StartAction';
import { StartExamButton } from '@/components/jlpt/StartTestButton';
import { cn } from '@/lib/utils';

interface SetInfo {
  id: string;
  level: string;
  title: string;
  description: string | null;
  tests: {
    id: string;
    section: string;
    minutes: number;
    questionCount: number;
  }[];
  totalMinutes: number;
  totalQuestions: number;
  best: { score: number; maxScore: number } | null;
}

/** Design metadata is keyed lowercase; the API speaks the enum. */
const DESIGN_BY_ENUM: Record<string, string> = {
  MOJI_GOI: 'moji',
  BUNPOU: 'bunpou',
  DOKKAI: 'dokkai',
  CHOUKAI: 'choukai',
};

export default function JlptFullExamPage() {
  const searchParams = useSearchParams();
  const levelParam = searchParams.get('level');
  const level: LevelId = (LEVELS.find((l) => l.id === levelParam)?.id ?? 'N5') as LevelId;

  const [set, setSet] = useState<SetInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    api
      .get<{ sets: { id: string }[] }>(`/jlpt/levels/${level}`)
      .then(async (r) => {
        const first = r.data.sets[0];
        if (!first) throw new Error('none');
        const info = await api.get<SetInfo>(`/jlpt/sets/${first.id}/info`);
        if (cancelled) return;
        setSet(info.data);
        setState('ready');
      })
      .catch(() => !cancelled && setState('none'));
    return () => {
      cancelled = true;
    };
  }, [level]);

  const hours = set ? Math.round((set.totalMinutes / 60) * 10) / 10 : 0;

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

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-7 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full
                         border border-primary/25 bg-primary/12 text-primary">
          <Timer size={24} />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
          Toʻliq imtihon — JLPT {level}
        </h1>
        <p className="mt-2 leading-relaxed text-text-secondary">
          {state === 'ready'
            ? `Toʻrt boʻlim ketma-ket, imtihon kunidagi sharoitda. ${set!.totalQuestions} ta savol, ~${hours} soat.`
            : 'Toʻrt boʻlim ketma-ket, imtihon kunidagi sharoitda.'}
        </p>
      </div>

      {state === 'loading' && (
        <div className="flex justify-center py-12">
          <Loader2 size={26} className="animate-spin text-primary" />
        </div>
      )}

      {state === 'none' && (
        <div className="rounded-xl border border-border bg-surface-2/60 px-4 py-6 text-center text-sm text-text-secondary">
          Bu daraja uchun toʻliq imtihon hali tayyorlanmagan.
          <Link href="/jlpt" className="mt-3 block font-bold text-primary hover:underline">
            Boʻlimlar boʻyicha mashq qilish
          </Link>
        </div>
      )}

      {state === 'ready' && set && (
        <>
          {/* ── Parts, in exam order ─────────────────────────────────── */}
          <div className="mb-6 space-y-2.5">
            {set.tests.map((t, i) => {
              const design = SECTIONS.find((s) => s.id === DESIGN_BY_ENUM[t.section]);
              return (
                <div
                  key={t.id}
                  className={cn(
                    'card-glass flex items-center gap-3.5 border-border px-4 py-3.5',
                    'transition-all duration-200 hover:-translate-y-0.5',
                    design?.glow,
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white',
                      'ring-1 ring-inset ring-white/20',
                      design?.solid,
                    )}
                  >
                    {design ? <design.Icon size={17} /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-primary">
                      <span className="text-text-muted">{i + 1}.</span>{' '}
                      {SECTION_LABELS[t.section] ?? t.section}{' '}
                      <span className="font-semibold text-text-muted">{design?.jp}</span>
                    </p>
                    <p className="text-xs text-text-muted">{t.questionCount} ta savol</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold',
                      design?.tile,
                      design?.text,
                    )}
                  >
                    {t.minutes} daq
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Rules ─────────────────────────────────────────────────── */}
          <div className="mb-6 rounded-xl border border-border bg-surface-2/60 px-4 py-4">
            <p className="mb-2.5 text-sm font-bold text-text-primary">Boshlashdan oldin</p>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              <li>• Quloqchin taqing va tinch joyni tanlang — tinglash qismi bir marta eshitiladi.</li>
              <li>• ~{hours} soat vaqt ajrating. Soat toʻxtamaydi va chiqib ketsangiz ham yurib turadi.</li>
              <li>• Toʻrt boʻlim bitta taymerda ketma-ket oʻtadi.</li>
              <li>• Belgilanmagan savollar xato hisoblanadi.</li>
            </ul>
          </div>

          {set.best && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-accent/30
                            bg-accent/10 px-4 py-3 text-sm">
              <Trophy size={15} className="shrink-0 text-accent" />
              <span className="text-text-secondary">
                Avvalgi eng yaxshi natijangiz —{' '}
                <span className="font-bold text-accent">
                  {set.best.score}/{set.best.maxScore}
                </span>
              </span>
            </div>
          )}

          <PremiumGateNotice className="mb-4" />

          <StartExamButton setId={set.id} />

          <p className="mt-3 text-center text-xs text-text-muted">
            Boshlagandan keyin shartlar qatʼiy boʻladi.
          </p>
        </>
      )}

      {/* ── Level switcher ─────────────────────────────────────────────── */}
      <div className="mt-8">
        <p className="mb-2.5 text-center text-xs font-semibold text-text-muted">Darajani tanlang</p>
        <div className="grid grid-cols-5 gap-2">
          {LEVELS.map((l) => (
            <Link
              key={l.id}
              href={`/jlpt/full?level=${l.id}`}
              className={cn(
                'rounded-lg border py-2 text-center text-sm font-bold transition-colors',
                l.id === level
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-secondary hover:border-primary/40 hover:text-text-primary',
              )}
            >
              {l.id}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
