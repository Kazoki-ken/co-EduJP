'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { GameSession, GameType } from '@/lib/types';

interface UseGameSessionResult {
  session:     GameSession | null;
  isLoading:   boolean;
  error:       string | null;
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

  const fetchSession = useCallback(async (opts: {
    gameType: GameType;
    topicId?: string;
    bookId?: string;
    limit?: number;
    dueOnly?: boolean;
  }): Promise<GameSession | null> => {
    setIsLoading(true);
    setError(null);
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
      const msg =
        (err as { response?: { data?: { error?: string } } })
          ?.response?.data?.error ??
        'Failed to start session. Make sure there are words available.';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  return { session, isLoading, error, fetchSession, reset };
}
