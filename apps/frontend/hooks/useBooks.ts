'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { Book, PaginatedResponse } from '@/lib/types';

interface UseBooksResult {
  books: Book[];
  meta: PaginatedResponse<Book>['meta'] | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  setPage: (p: number) => void;
  refresh: () => void;
}

export function useBooks(limit = 20): UseBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Book>['meta'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  const fetchBooks = useCallback(async (currentPage: number) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PaginatedResponse<Book>>('/books', {
        params: { page: currentPage, limit },
        signal: abortRef.current.signal,
      });
      setBooks(data.data);
      setMeta(data.meta);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'CanceledError') {
        setError('Failed to load books. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchBooks(page);
  }, [fetchBooks, page]);

  return { books, meta, isLoading, error, page, setPage, refresh: () => fetchBooks(page) };
}
