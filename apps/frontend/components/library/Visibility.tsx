'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Public/private controls for the learner's own books and topics.
 *
 * Shared by the library list, the book page and the topic page so the wording
 * of "ochiq"/"yopiq" — and what it implies — stays identical everywhere.
 */

export function VisibilityToggle({
  isPublic,
  onChange,
}: {
  isPublic: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!isPublic)}
      className={cn(
        'flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left',
        isPublic
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-border text-text-muted hover:text-text-secondary',
      )}
    >
      {isPublic ? <Eye size={15} /> : <EyeOff size={15} />}
      <span className="flex-1">
        {isPublic ? 'Ochiq — boshqalar topib, saqlay oladi' : 'Yopiq — faqat siz ko’rasiz'}
      </span>
      <span
        className={cn(
          'w-9 h-5 rounded-full relative transition-colors shrink-0',
          isPublic ? 'bg-success' : 'bg-surface-2 border border-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
            isPublic ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

export function VisibilityBadge({
  isPublic,
  busy,
  onToggle,
}: {
  isPublic: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      title={isPublic ? 'Ochiq — yopishga bosing' : 'Yopiq — ochishga bosing'}
      className={cn(
        'badge-chip shrink-0 border transition-colors',
        busy && 'opacity-50',
        isPublic
          ? 'bg-success/10 text-success border-success/30 hover:bg-success/20'
          : 'bg-surface-2 text-text-muted border-border hover:text-text-secondary',
      )}
    >
      {busy ? (
        <Loader2 size={11} className="animate-spin" />
      ) : isPublic ? (
        <Eye size={11} />
      ) : (
        <EyeOff size={11} />
      )}
      {isPublic ? 'Ochiq' : 'Yopiq'}
    </button>
  );
}
