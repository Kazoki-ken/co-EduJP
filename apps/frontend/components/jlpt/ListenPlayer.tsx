'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, Loader2, Play, Volume2 } from 'lucide-react';
import { speak } from '@/lib/speak';
import { cn } from '@/lib/utils';

/**
 * The listening item's player.
 *
 * There is no recorded audio yet, so the script is read aloud by the same
 * Japanese voice the rest of the app uses. The script itself is never printed
 * here — showing it would turn a listening question into a reading one.
 *
 * `once` mirrors the real exam, where a clip plays a single time. Section
 * practice relaxes it; the full exam does not.
 */
export function ListenPlayer({
  text,
  once = false,
  autoPlay = true,
}: {
  text: string;
  once?: boolean;
  autoPlay?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'done'>('idle');
  const [plays, setPlays] = useState(0);
  // Guards the autoplay effect against React's double-invoke in development,
  // which would otherwise start the clip twice and burn the single listen.
  const started = useRef(false);

  const play = useCallback(async () => {
    if (state === 'loading' || state === 'playing') return;
    if (once && plays >= 1) return;
    setState('loading');
    setPlays((n) => n + 1);
    await speak(text, {
      onStart: () => setState('playing'),
      onEnd: () => setState('done'),
    });
    setState((s) => (s === 'playing' ? 'done' : s));
  }, [once, plays, state, text]);

  useEffect(() => {
    if (!autoPlay || started.current) return;
    started.current = true;
    void play();
    // Intentionally runs once per question — `play` changes with state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  const exhausted = once && plays >= 1 && state !== 'playing' && state !== 'loading';

  return (
    <div className="mb-7 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={play}
          disabled={exhausted}
          aria-label="Audioni eshitish"
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white transition-all',
            exhausted
              ? 'cursor-not-allowed bg-text-muted/40'
              : 'bg-gradient-to-br from-amber-400 to-orange-600 hover:scale-105 active:scale-95',
            state === 'playing' && 'animate-pulse-glow',
          )}
        >
          {state === 'loading' ? (
            <Loader2 size={24} className="animate-spin" />
          ) : state === 'playing' ? (
            <Volume2 size={24} />
          ) : (
            <Play size={24} className="ml-1" />
          )}
        </button>

        <div className="min-w-0">
          <p className="flex items-center gap-2 font-bold text-text-primary">
            <Headphones size={15} className="text-amber-600 dark:text-amber-400" />
            {state === 'playing'
              ? 'Eshitilmoqda…'
              : state === 'loading'
                ? 'Tayyorlanmoqda…'
                : exhausted
                  ? 'Audio tugadi'
                  : 'Audioni eshitish'}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {once
              ? 'Audio bir marta eshitiladi — haqiqiy imtihondagidek.'
              : 'Kerak boʻlsa qayta eshitishingiz mumkin.'}
          </p>
        </div>
      </div>
    </div>
  );
}
