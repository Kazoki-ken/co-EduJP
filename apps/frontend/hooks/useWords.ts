'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { PaginatedResponse, Word, WordListParams } from '@/lib/types';

interface TopicCompletion {
  topicId: string;
  allSaved: boolean;
}

interface UseWordsResult {
  words: Word[];
  meta: PaginatedResponse<Word>['meta'] | null;
  isLoading: boolean;
  error: string | null;
  toggleSave: (wordId: string) => Promise<void>;
  refresh: () => void;
  /** Latest topic completion status from the most recent toggleSave call */
  lastTopicCompletions: TopicCompletion[];
}

export function useWords(params: WordListParams): UseWordsResult {
  const [words, setWords] = useState<Word[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Word>['meta'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTopicCompletions, setLastTopicCompletions] = useState<TopicCompletion[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const fetchWords = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PaginatedResponse<Word>>('/words', {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          ...(params.search   && { search:  params.search   }),
          ...(params.topicId  && { topicId: params.topicId  }),
          ...(params.bookId   && { bookId:  params.bookId   }),
        },
        signal: abortRef.current.signal,
      });
      setWords(data.data);
      setMeta(data.meta);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'CanceledError') {
        setError('Failed to load words. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [params.page, params.limit, params.search, params.topicId, params.bookId]); // eslint-disable-line

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  /** Optimistically toggles save state, then calls the API. */
  const toggleSave = useCallback(async (wordId: string) => {
    // Optimistic update
    setWords((prev) =>
      prev.map((w) => (w.id === wordId ? { ...w, isSaved: !w.isSaved } : w)),
    );
    try {
      const { data } = await api.post<{
        saved: boolean;
        topicCompletions: TopicCompletion[];
      }>(`/words/${wordId}/save`);
      // Expose topic completions so parent components can sync topic-level icons
      setLastTopicCompletions(data.topicCompletions ?? []);
    } catch {
      // Revert on failure
      setWords((prev) =>
        prev.map((w) => (w.id === wordId ? { ...w, isSaved: !w.isSaved } : w)),
      );
    }
  }, []);

  return { words, meta, isLoading, error, toggleSave, refresh: fetchWords, lastTopicCompletions };
}
