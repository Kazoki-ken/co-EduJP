'use client';

/**
 * One exam section: what it contains, how long it runs, and the way in.
 *
 * The layout mirrors the rest of the app's card language — a coloured band
 * naming the section, stat tiles, then the format breakdown. The start button
 * is the shared StartAction, so the premium rule is defined in exactly one
 * place for the whole JLPT area.
 */

import { useSearchParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Globe } from 'lucide-react';
import { LEVELS, SECTIONS, getSection, type LevelId } from '@/lib/jlpt';
import { PremiumGateNotice, StartAction } from '@/components/jlpt/StartAction';
import { cn } from '@/lib/utils';

export default function JlptSectionPage({ params }: { params: { section: string } }) {
  const searchParams = useSearchParams();
  const section = getSection(params.section);
  if (!section) notFound();

  const levelParam = searchParams.get('level');
  const level: LevelId = (LEVELS.find((l) => l.id === levelParam)?.id ?? 'N5') as LevelId;
  const stats = section.byLevel[level];

  return (
    <div className="page-container py-8 animate-fade-in max-w-3xl">

      <Link
        href="/jlpt"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary
                   hover:text-text-primary transition-colors mb-5"
      >
        <ArrowLeft size={15} />
        JLPT bo&rsquo;limlari
      </Link>

      <div className="card-glass overflow-hidden">

        {/* ── Coloured band ──────────────────────────────────────────────
            The kanji sits behind the title as a watermark — it fills the
            empty right side and makes each section recognisable at a glance. */}
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
              JLPT {level}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {section.title} <span className="font-bold opacity-75">{section.jp}</span>
            </h1>
            <p className="mt-1.5 max-w-sm text-sm text-white/85">{section.subtitle}</p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">

          {/* ── Stat tiles ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <Stat value={`${stats.minutes} daq`} label="Vaqt" tile={section.tile} text={section.text} />
            <Stat value={`~${stats.questions}`} label="Savol" tile={section.tile} text={section.text} />
            <Stat value={String(stats.tests)} label="Test" tile={section.tile} text={section.text} />
          </div>

          {/* ── Format ─────────────────────────────────────────────────── */}
          <div>
            <h2 className="font-extrabold text-text-primary mb-3">Test formati</h2>
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

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2/60
                          px-4 py-3 text-sm text-text-secondary">
            <Globe size={15} className={cn('mt-0.5 shrink-0', section.text)} />
            Savollar yapon tilida, izohlar o&rsquo;zbek tilida beriladi.
          </div>

          <PremiumGateNotice />

          <StartAction label={`${section.title} testini boshlash`} />

          {/* ── Level switcher ─────────────────────────────────────────── */}
          <div>
            <p className="text-center text-xs font-semibold text-text-muted mb-2.5">
              Yoki boshqa daraja
            </p>
            <div className="grid grid-cols-5 gap-2">
              {LEVELS.map((l) => (
                <Link
                  key={l.id}
                  href={`/jlpt/${section.id}?level=${l.id}`}
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
      </div>

      {/* ── Other sections ───────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SECTIONS.filter((s) => s.id !== section.id).map((s) => (
          <Link
            key={s.id}
            href={`/jlpt/${s.id}?level=${level}`}
            className={cn(
              'card-glass p-4 flex items-center gap-3 transition-all duration-200',
              'hover:-translate-y-0.5 hover:border-primary/40',
              s.glow,
            )}
          >
            <span
              className={cn(
                'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-white',
                'ring-1 ring-inset ring-white/20',
                s.solid,
              )}
            >
              <s.Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-text-primary truncate">{s.label}</span>
              <span className="block text-xs text-text-muted">{s.byLevel[level].tests} ta test</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tile,
  text,
}: {
  value: string;
  label: string;
  tile: string;
  text: string;
}) {
  return (
    <div className={cn('rounded-2xl border px-3 py-5 text-center transition-transform hover:-translate-y-0.5', tile)}>
      <p className={cn('text-2xl font-black leading-none tracking-tight', text)}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-2">{label}</p>
    </div>
  );
}
