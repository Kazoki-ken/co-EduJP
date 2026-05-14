'use client';

import Link from 'next/link';
import { Tag, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Topic } from '@/lib/types';

interface TopicCardProps {
  topic: Topic;
  bookId: string;
}

export function TopicCard({ topic, bookId }: TopicCardProps) {
  const count = topic._count.wordTopics;

  return (
    <Link
      href={`/dictionary/words?bookId=${bookId}&topicId=${topic.id}`}
      className={cn(
        'group card-glass px-5 py-4 flex items-center justify-between gap-4',
        'hover:border-primary/50 hover:bg-surface-2/60 hover:shadow-glow-sm',
        'transition-all duration-150',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 border border-primary/20
                        flex items-center justify-center group-hover:border-primary/50 transition-colors">
          <Tag size={15} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-text-primary group-hover:text-primary
                        transition-colors truncate">
            {topic.name}
          </p>
          <p className="text-xs text-text-muted">
            {count} {count === 1 ? 'word' : 'words'}
          </p>
        </div>
      </div>

      <ChevronRight
        size={16}
        className="text-text-muted group-hover:text-primary shrink-0 transition-colors"
      />
    </Link>
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
