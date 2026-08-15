'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, Loader2, Play, Volume2 } from 'lucide-react';
import { speak } from '@/lib/speak';
import { mediaUrl } from '@/lib/jlptApi';
import { cn } from '@/lib/utils';

/**
 * The listening item's player.
 *
 * A real recording is used whenever one has been uploaded. Only when there is
 * none does the script get read aloud by the app's Japanese voice — that was
 * always the stand-in, not the intent.
 *
 * The script itself is never printed here: showing it would turn a listening
 * question into a reading one. It appears in the review afterwards.
 *
 * `once` mirrors the real exam, where a clip plays a single time. Section
 * practice relaxes it; the full exam does not.
 */
export function ListenPlayer({
  text,
  audioUrl,
  once = false,
  autoPlay = true,
}: {
  /** Script, used when there is no recording. */
  text?: string | null;
  /** Uploaded recording. Takes precedence over the script. */
  audioUrl?: string | null;
  once?: boolean;
  autoPlay?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'done'>('idle');
  const [plays, setPlays] = useState(0);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  // Guards the autoplay effect against React's double-invoke in development,
  // which would otherwise start the clip twice and burn the single listen.
  const started = useRef(false);

  const src = mediaUrl(audioUrl);

  // Tear the element down when the question changes, so the previous clip
  // cannot keep playing over the next one.
  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  const play = useCallback(async () => {
    if (state === 'loading' || state === 'playing') return;
    if (once && plays >= 1) return;
    setState('loading');
    setPlays((n) => n + 1);

    if (src) {
      try {
        if (!audio.current) {
          audio.current = new Audio(src);
          audio.current.addEventListener('ended', () => setState('done'));
          audio.current.addEventListener('error', () => {
            setFailed(true);
            setState('idle');
          });
        }
        audio.current.currentTime = 0;
        await audio.current.play();
        setState('playing');
      } catch {
        setFailed(true);
        setState('idle');
      }
      return;
    }

    if (!text) {
      setState('done');
      return;
    }

    await speak(text, {
      onStart: () => setState('playing'),
      onEnd: () => setState('done'),
    });
    setState((s) => (s === 'playing' ? 'done' : s));
  }, [once, plays, src, state, text]);

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
            {failed
              ? 'Audioni ochib boʻlmadi — tugmani qayta bosing.'
              : once
                ? 'Audio bir marta eshitiladi — haqiqiy imtihondagidek.'
                : 'Kerak boʻlsa qayta eshitishingiz mumkin.'}
          </p>
        </div>
      </div>
    </div>
  );
}
