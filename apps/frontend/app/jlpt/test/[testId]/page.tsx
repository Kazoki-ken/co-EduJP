'use client';

/**
 * The cover page a learner sees before the clock starts.
 *
 * Same layout as the section overview it grew out of, but every number is now
 * this test's own, and the button starts this test rather than describing the
 * section. Nothing below the button: once you are here the only sensible moves
 * are start or go back, and a row of level shortcuts invited neither.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Globe, Loader2, Trophy } from 'lucide-react';
import api from '@/lib/api';
import { SECTIONS, type Section } from '@/lib/jlpt';
import { PremiumGateNotice } from '@/components/jlpt/StartAction';
import { StartTestButton } from '@/components/jlpt/StartTestButton';
import { cn } from '@/lib/utils';

interface TestInfo {
  id: string;
  level: string;
  section: string;
  number: number;
  title: string | null;
  minutes: number;
  questionCount: number;
  best: { score: number; maxScore: number } | null;
}

/** The API speaks the enum; lib/jlpt.ts keys its design data lowercase. */
const SECTION_BY_ENUM: Record<string, string> = {
  MOJI_GOI: 'moji',
  BUNPOU: 'bunpou',
  DOKKAI: 'dokkai',
  CHOUKAI: 'choukai',
};

export default function JlptTestBriefingPage({
  params,
}: {
  params: { testId: string };
}) {
  const [info, setInfo] = useState<TestInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .get<TestInfo>(`/jlpt/tests/${params.testId}/info`)
      .then((r) => setInfo(r.data))
      .catch(() => setFailed(true));
  }, [params.testId]);

  if (failed) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-text-secondary">Testni ochib boʻlmadi.</p>
        <Link href="/jlpt" className="btn-ghost mt-4 inline-block text-sm">
          JLPT boʻlimiga qaytish
        </Link>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="page-container flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const section: Section =
    SECTIONS.find((s) => s.id === SECTION_BY_ENUM[info.section]) ?? SECTIONS[0];

  return (
    <div className="page-container max-w-3xl animate-fade-in py-8">
      <Link
        href="/jlpt"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary
                   transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={15} />
        JLPT boʻlimlari
      </Link>

      <div className="card-glass overflow-hidden">
        {/* ── Coloured band ─────────────────────────────────────────────── */}
        <div className={cn('relative overflow-hidden px-6 py-8 text-white', section.band)}>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-6 select-none text-[7rem]
                       font-black leading-none text-white/10"
          >
            {section.jp.slice(0, 2)}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          />

          <div className="relative">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20
                            ring-1 ring-inset ring-white/30 backdrop-blur-sm">
              <section.Icon size={23} strokeWidth={2.2} />
            </div>
            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5
                             text-[11px] font-bold tracking-wide ring-1 ring-inset ring-white/25">
              JLPT {info.level}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {info.title ?? `${section.title} — ${info.number}-test`}
            </h1>
            <p className="mt-1.5 max-w-sm text-sm text-white/85">{section.subtitle}</p>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          {/* ── This test's own numbers ─────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <Stat value={`${info.minutes} daq`} label="Vaqt" section={section} />
            <Stat value={String(info.questionCount)} label="Savol" section={section} />
            <Stat
              value={info.best ? `${info.best.score}/${info.best.maxScore}` : '—'}
              label="Eng yaxshi"
              section={section}
            />
          </div>

          {/* ── What is in it ───────────────────────────────────────────── */}
          <div>
            <h2 className="mb-3 font-extrabold text-text-primary">Testda nima boʻladi</h2>
            <ul className="space-y-1">
              {section.format.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm text-text-secondary
                             transition-colors hover:bg-surface-2/70"
                >
                  <span
                    className={cn(
                      'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                      section.tile,
                    )}
                  >
                    <Check size={12} strokeWidth={3} className={section.text} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Rules, so nothing is a surprise once the clock starts ───── */}
          <div className="rounded-xl border border-border bg-surface-2/60 px-4 py-4">
            <p className="mb-2.5 text-sm font-bold text-text-primary">Boshlashdan oldin</p>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              <li>
                • Boshlaganingizdan soʻng vaqt <span className="font-bold text-text-primary">toʻxtamaydi</span> —
                sahifadan chiqib ketsangiz ham soat yurib turadi.
              </li>
              <li>• Vaqt tugaganda javoblaringiz avtomatik yuboriladi.</li>
              <li>• Belgilanmagan savollar xato hisoblanadi.</li>
              <li>• Yakunlaganingizdan keyin har bir savolning toʻgʻri javobini koʻrasiz.</li>
            </ul>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2/60
                          px-4 py-3 text-sm text-text-secondary">
            <Globe size={15} className={cn('mt-0.5 shrink-0', section.text)} />
            Savollar yapon tilida, izohlar oʻzbek tilida beriladi.
          </div>

          {info.best && (
            <div className="flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/10
                            px-4 py-3 text-sm">
              <Trophy size={15} className="shrink-0 text-accent" />
              <span className="text-text-secondary">
                Avvalgi eng yaxshi natijangiz —{' '}
                <span className="font-bold text-accent">
                  {info.best.score}/{info.best.maxScore}
                </span>
                . Qayta ishlasangiz yuqorisi saqlanadi.
              </span>
            </div>
          )}

          <PremiumGateNotice />

          <StartTestButton testId={info.id} />
        </div>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  section,
}: {
  value: string;
  label: string;
  section: Section;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-3 py-5 text-center transition-transform hover:-translate-y-0.5',
        section.tile,
      )}
    >
      <p className={cn('text-2xl font-black leading-none tracking-tight', section.text)}>
        {value}
      </p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </p>
    </div>
  );
}
