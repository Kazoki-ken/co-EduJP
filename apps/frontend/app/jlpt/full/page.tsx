'use client';

/**
 * Full mock exam — all four sections back to back.
 *
 * A briefing screen rather than a test: it lists the parts in exam order with
 * their timings, sets expectations, and then hands off to StartAction, which
 * is where the premium rule lives.
 */

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Timer } from 'lucide-react';
import { LEVELS, SECTIONS, fullExamMinutes, type LevelId } from '@/lib/jlpt';
import { PremiumGateNotice, StartAction } from '@/components/jlpt/StartAction';
import { cn } from '@/lib/utils';

export default function JlptFullExamPage() {
  const searchParams = useSearchParams();
  const levelParam = searchParams.get('level');
  const level: LevelId = (LEVELS.find((l) => l.id === levelParam)?.id ?? 'N5') as LevelId;

  const total = fullExamMinutes(level);
  const hours = Math.round((total / 60) * 10) / 10;

  return (
    <div className="page-container py-8 animate-fade-in max-w-2xl">

      <Link
        href="/jlpt"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary
                   hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        JLPT bo&rsquo;limlari
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="text-center mb-7">
        <span className="inline-flex w-14 h-14 rounded-full bg-primary/12 border border-primary/25
                         items-center justify-center text-primary mb-4">
          <Timer size={24} />
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          To&rsquo;liq imtihon — JLPT {level}
        </h1>
        <p className="text-text-secondary mt-2 leading-relaxed">
          To&rsquo;rt bo&rsquo;lim ketma-ket, imtihon kunidagi sharoitda o&rsquo;tadi.
          Jami ~{hours} soat.
        </p>
      </div>

      {/* ── Parts, in exam order ───────────────────────────────────────── */}
      <div className="space-y-2.5 mb-6">
        {SECTIONS.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              'card-glass flex items-center gap-3.5 px-4 py-3.5 border-border',
              'transition-all duration-200 hover:-translate-y-0.5',
              s.glow,
            )}
          >
            <span
              className={cn(
                'w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white',
                'ring-1 ring-inset ring-white/20',
                s.solid,
              )}
            >
              <s.Icon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-text-primary text-sm">
                <span className="text-text-muted">{i + 1}.</span> {s.title}{' '}
                <span className="text-text-muted font-semibold">{s.jp}</span>
              </p>
              <p className="text-xs text-text-muted">~{s.byLevel[level].questions} savol</p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold',
                s.tile,
                s.text,
              )}
            >
              {s.byLevel[level].minutes} daq
            </span>
          </div>
        ))}
      </div>

      {/* ── Rules ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-2/60 px-4 py-4 mb-6">
        <p className="font-bold text-text-primary text-sm mb-2.5">Boshlashdan oldin</p>
        <ul className="space-y-1.5 text-sm text-text-secondary">
          <li>• Quloqchin taqing va tinch joyni tanlang — tinglash qismi bir marta eshitiladi.</li>
          <li>• ~{hours} soat vaqt ajrating. Tugagan bo&rsquo;limga qaytib bo&rsquo;lmaydi.</li>
          <li>• Bir marta tanaffus olish mumkin — u faqat o&rsquo;qish va grammatika qismida vaqtni to&rsquo;xtatadi.</li>
        </ul>
      </div>

      <PremiumGateNotice className="mb-4" />

      <StartAction label="Imtihonni boshlash" />

      <p className="text-center text-xs text-text-muted mt-3">
        Boshlagandan keyin shartlar qat&rsquo;iy bo&rsquo;ladi.
      </p>

      {/* ── Level switcher ─────────────────────────────────────────────── */}
      <div className="mt-7">
        <p className="text-center text-xs font-semibold text-text-muted mb-2.5">Darajani tanlang</p>
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
