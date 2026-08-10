'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * `setTimeout` that cancels itself when the component goes away.
 *
 * The games use a short delay to let the answer feedback land before moving to
 * the next round. If the player leaves during that pause — taps "back", or the
 * run finishes and the results screen replaces the board — the plain timer
 * still fires and calls `setState` on a component that no longer exists.
 *
 * Every pending timer is tracked and cleared on unmount, so callers can keep
 * writing `delay(() => ..., 900)` without thinking about it.
 */
export function useSafeTimeout() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);
}
