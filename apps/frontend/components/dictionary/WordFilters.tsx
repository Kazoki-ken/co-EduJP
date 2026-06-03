'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book, Topic } from '@/lib/types';

export interface WordFiltersValue {
  search:  string;
  bookId:  string;
  topicId: string;
}

interface WordFiltersProps {
  value:    WordFiltersValue;
  books:    Book[];
  topics:   Topic[];
  onChange: (next: WordFiltersValue) => void;
}

export function WordFilters({ value, books, topics, onChange }: WordFiltersProps) {
  const [searchInput, setSearchInput] = useState(value.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input → 350ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== value.search) {
        onChange({ ...value, search: searchInput });
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]); // eslint-disable-line

  const hasFilters = value.search || value.bookId || value.topicId;

  const clearAll = () => {
    setSearchInput('');
    onChange({ search: '', bookId: '', topicId: '' });
  };

  // Filter topics by selected book
  const visibleTopics = value.bookId
    ? topics.filter((t) => t.bookId === value.bookId)
    : topics;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="So'zlarni, xiraganani yoki ma'nolarini qidiring…"
            className="input-field pl-10 pr-9"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); onChange({ ...value, search: '' }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Book Filter */}
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <select
            value={value.bookId}
            onChange={(e) =>
              onChange({ ...value, bookId: e.target.value, topicId: '' })
            }
            className={cn(
              'input-field pl-8 pr-8 appearance-none cursor-pointer min-w-[160px]',
              !value.bookId && 'text-text-muted',
            )}
          >
            <option value="">Barcha kitoblar</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        {/* Topic Filter */}
        <div className="relative">
          <select
            value={value.topicId}
            onChange={(e) => onChange({ ...value, topicId: e.target.value })}
            disabled={visibleTopics.length === 0}
            className={cn(
              'input-field pr-8 appearance-none cursor-pointer min-w-[160px]',
              !value.topicId && 'text-text-muted',
              visibleTopics.length === 0 && 'opacity-50 cursor-not-allowed',
            )}
          >
            <option value="">Barcha mavzular</option>
            {visibleTopics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Faol filtrlar:</span>

          {value.search && (
            <FilterChip
              label={`"${value.search}"`}
              onRemove={() => { setSearchInput(''); onChange({ ...value, search: '' }); }}
            />
          )}
          {value.bookId && (
            <FilterChip
              label={books.find((b) => b.id === value.bookId)?.title ?? value.bookId}
              onRemove={() => onChange({ ...value, bookId: '', topicId: '' })}
            />
          )}
          {value.topicId && (
            <FilterChip
              label={topics.find((t) => t.id === value.topicId)?.name ?? value.topicId}
              onRemove={() => onChange({ ...value, topicId: '' })}
            />
          )}

          <button
            onClick={clearAll}
            className="text-xs text-danger hover:text-danger/80 transition-colors underline underline-offset-2"
          >
            Filtrlarni tozalash
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                     bg-primary/10 border border-primary/30 text-primary text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-danger transition-colors">
        <X size={11} />
      </button>
    </span>
  );
}
