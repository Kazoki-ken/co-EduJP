/**
 * useVocabulary — lightweight data-fetching hooks for the Dictionary tab.
 * Uses apiClient so auth headers / token-refresh work automatically.
 */
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import type { Book, Topic, Word, PaginatedResponse } from '@vocabjp/shared';

// ─── Generic fetch state ──────────────────────────────────────────
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useFetch<T>(url: string, params?: Record<string, unknown>): FetchState<T> {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<T>(url, { params })
      .then(res  => { if (!cancelled) { setData(res.data); setLoading(false); } })
      .catch(err => {
        if (!cancelled) {
          setError(err?.response?.data?.error ?? 'Failed to load data.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, error, refetch };
}

// ─── Books ────────────────────────────────────────────────────────
export function useBooks(page = 1, limit = 20) {
  return useFetch<PaginatedResponse<Book>>('/books', { page, limit });
}

// ─── Topics for a book ────────────────────────────────────────────
export function useBookTopics(bookId: string) {
  return useFetch<Topic[]>(`/books/${bookId}/topics`);
}

// ─── Words for a topic (paginated) ───────────────────────────────
export function useTopicWords(topicId: string, page = 1, limit = 30) {
  return useFetch<PaginatedResponse<Word>>('/words', { topicId, page, limit });
}
