'use client';

import { useState, useCallback } from 'react';
import api, { errorMessage, isQuotaError } from '@/lib/api';
import type { GameSession, GameType } from '@/lib/types';

interface UseGameSessionResult {
  session:     GameSession | null;
  isLoading:   boolean;
  error:       string | null;
  /** True when the failure was a spent daily allowance (HTTP 402), not a real error. */
  quotaExceeded: boolean;
  fetchSession: (opts: {
    gameType: GameType;
    topicId?: string;
    bookId?: string;
    limit?: number;
    dueOnly?: boolean;
  }) => Promise<GameSession | null>;
  reset: () => void;
}

export function useGameSession(): UseGameSessionResult {
  const [session,   setSession]   = useState<GameSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const fetchSession = useCallback(async (opts: {
    gameType: GameType;
    topicId?: string;
    bookId?: string;
    limit?: number;
    dueOnly?: boolean;
  }): Promise<GameSession | null> => {
    setIsLoading(true);
    setError(null);
    setQuotaExceeded(false);
    try {
      const { data } = await api.get<GameSession>('/games/session', {
        params: {
          type:    opts.gameType,
          limit:   opts.limit ?? 15,
          ...(opts.topicId && { topicId: opts.topicId }),
          ...(opts.bookId  && { bookId:  opts.bookId  }),
          ...(opts.dueOnly && { dueOnly: true          }),
        },
      });
      setSession(data);
      return data;
    } catch (err: unknown) {
      setQuotaExceeded(isQuotaError(err));
      setError(
        errorMessage(err, "Sessiyani boshlab bo'lmadi. Saqlangan so'zlaringiz borligini tekshiring."),
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSession(null);
    setError(null);
    setQuotaExceeded(false);
  }, []);

  return { session, isLoading, error, quotaExceeded, fetchSession, reset };
}
