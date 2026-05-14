'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { Topic } from '@/lib/types';

interface UseTopicsResult {
  topics: Topic[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Fetches topics for a specific book (or all topics if bookId is undefined). */
export function useTopics(bookId?: string): UseTopicsResult {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTopics = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    try {
      const url = bookId ? `/books/${bookId}/topics` : '/topics';
      const { data } = await api.get<Topic[]>(url, {
        signal: abortRef.current.signal,
      });
      setTopics(data);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'CanceledError') {
        setError('Failed to load topics.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return { topics, isLoading, error, refresh: fetchTopics };
}
