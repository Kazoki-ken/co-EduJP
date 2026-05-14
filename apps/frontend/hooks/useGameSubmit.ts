'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { GameAnswer, GameResult } from '@/lib/types';

interface UseGameSubmitResult {
  result:     GameResult | null;
  isLoading:  boolean;
  error:      string | null;
  submit:     (sessionId: string, answers: GameAnswer[]) => Promise<GameResult | null>;
  reset:      () => void;
}

export function useGameSubmit(): UseGameSubmitResult {
  const [result,    setResult]    = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const submit = useCallback(
    async (sessionId: string, answers: GameAnswer[]): Promise<GameResult | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Backend only needs wordId + answer (timeMs is frontend-only for now)
        const payload = {
          sessionId,
          answers: answers.map(({ wordId, answer }) => ({ wordId, answer })),
        };
        const { data } = await api.post<GameResult>('/games/submit', payload);
        setResult(data);
        return data;
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })
            ?.response?.data?.error ?? 'Failed to submit session.';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, submit, reset };
}
