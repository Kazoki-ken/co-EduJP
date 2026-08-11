'use client';

import { useMemo } from 'react';

/**
 * Sakura drifting behind the conversation.
 *
 * CSS transforms only — no per-frame JavaScript — so it costs nothing while the
 * page is busy streaming a reply, and `prefers-reduced-motion` removes it
 * entirely for anyone who asked the OS for calm.
 */

interface Petal {
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  opacity: number;
}

export function SakuraPetals({ count = 14 }: { count?: number }) {
  // Positions are randomised once per mount; regenerating them on re-render
  // would make the petals jump every time a chunk of the reply arrives.
  const petals = useMemo<Petal[]>(
    () =>
      Array.from({ length: count }, () => ({
        left:     Math.random() * 100,
        delay:    Math.random() * 12,
        duration: 11 + Math.random() * 12,
        size:     7 + Math.random() * 9,
        drift:    (Math.random() - 0.5) * 140,
        opacity:  0.18 + Math.random() * 0.35,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {petals.map((p, i) => (
        <span
          key={i}
          className="sakura-petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.85,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
