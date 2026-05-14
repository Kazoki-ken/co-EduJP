'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Tag, Play, ChevronDown, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { Book, Topic, GameType, GameSession } from '@/lib/types';

const GAME_LABELS: Record<GameType, { label: string; icon: string; desc: string }> = {
  TEST:    { label: 'Multiple Choice', icon: '🧠', desc: 'Pick the right meaning from 4 options' },
  MATCH:   { label: 'Matching Pairs',  icon: '🔗', desc: 'Match Japanese words to their meanings' },
  WRITE:   { label: 'Typing Practice', icon: '⌨️',  desc: 'Type the meaning from memory' },
  SHOOTER: { label: 'Space Shooter',   icon: '🚀', desc: 'Click the right asteroid!' },
};

const WORD_COUNT_OPTIONS = [5, 10, 15, 20];

interface GameSetupProps {
  gameType:   GameType;
  isLoading:  boolean;
  error:      string | null;
  onStart:    (opts: { gameType: GameType; topicId?: string; bookId?: string; limit: number; dueOnly: boolean }) => void;
}

export function GameSetup({ gameType, isLoading, error, onStart }: GameSetupProps) {
  const [books,    setBooks]    = useState<Book[]>([]);
  const [topics,   setTopics]   = useState<Topic[]>([]);
  const [bookId,   setBookId]   = useState('');
  const [topicId,  setTopicId]  = useState('');
  const [limit,    setLimit]    = useState(15);
  const [dueOnly,  setDueOnly]  = useState(false);

  // Load books
  useEffect(() => {
    api.get<{ data: Book[] }>('/books', { params: { limit: 100 } })
      .then(({ data }) => setBooks(data.data))
      .catch(() => {});
  }, []);

  // Load topics when book changes
  useEffect(() => {
    setTopicId('');
    if (!bookId) {
      api.get<Topic[]>('/topics').then(({ data }) => setTopics(data)).catch(() => {});
      return;
    }
    api.get<Topic[]>(`/books/${bookId}/topics`).then(({ data }) => setTopics(data)).catch(() => {});
  }, [bookId]);

  const game = GAME_LABELS[gameType];

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Game type badge */}
      <div className="text-center mb-8">
        <span className="text-5xl mb-3 block">{game.icon}</span>
        <h2 className="text-2xl font-extrabold text-text-primary">{game.label}</h2>
        <p className="text-text-muted mt-1">{game.desc}</p>
      </div>

      <div className="card-glass p-6 space-y-5">
        {/* Book picker */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
            <BookOpen size={14} /> Book (optional)
          </label>
          <div className="relative">
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer"
            >
              <option value="">All books</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Topic picker */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
            <Tag size={14} /> Topic (optional)
          </label>
          <div className="relative">
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer"
            >
              <option value="">All topics</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Word count */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
            <Zap size={14} /> Words per session
          </label>
          <div className="flex gap-2">
            {WORD_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold border transition-all',
                  limit === n
                    ? 'bg-primary border-primary text-white shadow-glow-sm'
                    : 'border-border text-text-muted hover:border-primary/50 hover:text-text-secondary',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Due only toggle */}
        <label className="flex items-center justify-between cursor-pointer group py-2">
          <div>
            <p className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
              SRS review only
            </p>
            <p className="text-xs text-text-muted">Only show words due for review today</p>
          </div>
          <div
            onClick={() => setDueOnly((v) => !v)}
            className={cn(
              'w-11 h-6 rounded-full border-2 transition-all relative',
              dueOnly ? 'bg-primary border-primary' : 'bg-surface-2 border-border',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all',
              dueOnly ? 'left-5' : 'left-0.5',
            )} />
          </div>
        </label>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => onStart({ gameType, bookId: bookId || undefined, topicId: topicId || undefined, limit, dueOnly })}
          disabled={isLoading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
        >
          {isLoading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating session…</>
            : <><Play size={18} /> Start Game</>
          }
        </button>
      </div>
    </div>
  );
}
