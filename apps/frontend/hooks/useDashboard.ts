'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Word, WordProgress } from '@/lib/types';

interface ProgressResponse {
  dueToday: WordProgress[];
  levelBreakdown: { level: number; count: number }[];
  totalSaved: number;
  dueTodayCount: number;
}

export interface DashboardData {
  /** How many saved words the SRS says are due for review right now. */
  dueTodayCount: number;
  /** Saved words per mastery level (1–5), always five entries. */
  levels: { level: number; count: number }[];
  totalSaved: number;
  /** A real dictionary word, stable for the whole day. */
  wordOfTheDay: Word | null;
}

/**
 * Everything the dashboard needs that isn't already on the user object.
 *
 * The two calls are independent, so a failing word-of-the-day never blocks the
 * SRS numbers — the card just doesn't render.
 */
export function useDashboard(enabled: boolean) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  const load = useCallback(async () => {
    setIsLoading(true);

    const progressPromise = api
      .get<ProgressResponse>('/users/me/progress')
      .then((r) => r.data)
      .catch(() => null);

    const wordPromise = fetchWordOfTheDay();

    const [progress, wordOfTheDay] = await Promise.all([progressPromise, wordPromise]);

    // Always emit all five levels so the bars don't jump around as words move.
    const byLevel = new Map((progress?.levelBreakdown ?? []).map((l) => [l.level, l.count]));
    const levels = [1, 2, 3, 4, 5].map((level) => ({
      level,
      count: byLevel.get(level) ?? 0,
    }));

    setData({
      dueTodayCount: progress?.dueTodayCount ?? 0,
      levels,
      totalSaved: progress?.totalSaved ?? 0,
      wordOfTheDay,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) load();
    else setIsLoading(false);
  }, [enabled, load]);

  return { data, isLoading, refresh: load };
}

/**
 * Picks one dictionary word that stays the same all day for a given learner's
 * timezone, rather than the hardcoded 木漏れ日 the dashboard used to show.
 *
 * The day number seeds the page offset, so it rotates at local midnight and
 * everyone browsing on the same date sees the same word — no extra API or
 * storage needed.
 */
async function fetchWordOfTheDay(): Promise<Word | null> {
  try {
    const { data: probe } = await api.get<{ meta: { total: number } }>('/words', {
      params: { limit: 1 },
    });
    const total = probe.meta.total;
    if (!total) return null;

    const dayNumber = Math.floor(
      (Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000,
    );
    const page = (dayNumber % total) + 1;

    const { data } = await api.get<{ data: Word[] }>('/words', {
      params: { limit: 1, page },
    });
    return data.data[0] ?? null;
  } catch {
    return null;
  }
}
