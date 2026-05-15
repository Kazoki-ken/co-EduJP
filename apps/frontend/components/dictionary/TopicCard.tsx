'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Tag, ChevronRight, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { Topic } from '@/lib/types';

interface TopicCardProps {
  topic: Topic;
  bookId: string;
  isAuthenticated?: boolean;
}

export function TopicCard({ topic, bookId, isAuthenticated }: TopicCardProps) {
  const count = topic._count.wordTopics;

  const [isSaved, setIsSaved] = useState(!!(topic as any).isSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaving || !isAuthenticated) return;
    setIsSaving(true);
    try {
      const { data } = await api.post<{
        saved: boolean;
        savedCount?: number;
        message?: string;
      }>(`/topics/${topic.id}/save`);
      setIsSaved(data.saved);
      // Show brief inline success message
      setMessage(data.message ?? (data.saved ? 'All words saved!' : 'Words unsaved'));
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setIsSaved(prev => !prev);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, isAuthenticated, topic.id]);

  return (
    <div className={cn(
      'group card-glass flex items-center justify-between gap-2',
      'hover:border-primary/50 hover:bg-surface-2/60 hover:shadow-glow-sm',
      'transition-all duration-150',
    )}>
      <Link
        href={`/dictionary/words?bookId=${bookId}&topicId=${topic.id}`}
        className="flex-1 flex items-center gap-3 min-w-0 px-5 py-4"
      >
        <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 border border-primary/20
                        flex items-center justify-center group-hover:border-primary/50 transition-colors">
          <Tag size={15} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text-primary group-hover:text-primary
                        transition-colors truncate">
            {topic.name}
          </p>
          <p className="text-xs text-text-muted">
            {count} {count === 1 ? 'word' : 'words'}
          </p>
        </div>
      </Link>

      {/* Save button */}
      <div className="flex items-center gap-1 pr-4">
        {isAuthenticated && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            title={isSaved ? 'Unsave topic' : 'Save topic'}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              'opacity-0 group-hover:opacity-100',
              isSaved && 'opacity-100',
              isSaving && 'opacity-50 cursor-wait',
              isSaved
                ? 'bg-accent/10 text-accent hover:bg-danger/10 hover:text-danger'
                : 'hover:bg-surface-2 text-text-muted hover:text-accent',
            )}
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isSaved ? (
              <BookmarkCheck size={14} className="fill-accent" />
            ) : (
              <Bookmark size={14} />
            )}
          </button>
        )}

        <Link href={`/dictionary/words?bookId=${bookId}&topicId=${topic.id}`}>
          <ChevronRight
            size={16}
            className="text-text-muted group-hover:text-primary shrink-0 transition-colors"
          />
        </Link>
      </div>

      {/* Inline batch-save success toast */}
      {message && (
        <div className="px-5 pb-3 -mt-1 animate-fade-in">
          <p className={cn(
            'text-xs font-medium px-3 py-1.5 rounded-lg inline-block',
            isSaved
              ? 'bg-accent/10 text-accent border border-accent/20'
              : 'bg-surface-2 text-text-muted border border-border',
          )}>
            {message}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function TopicCardSkeleton() {
  return (
    <div className="card-glass px-5 py-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg skeleton shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 skeleton rounded" />
        <div className="h-3 w-1/4 skeleton rounded" />
      </div>
    </div>
  );
}
