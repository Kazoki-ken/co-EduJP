'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Keeps a learner inside a running exam.
 *
 * What this can and cannot do, plainly: a web page cannot forbid someone from
 * closing the tab or pulling the plug. Three things are possible, and all
 * three are done here —
 *
 *   1. no exit chrome is rendered at all (see the layout, which hides the
 *      sidebar and header on this route),
 *   2. the back button is trapped by keeping a spare history entry in front of
 *      the page, so pressing Back lands on us and raises the dialog instead of
 *      leaving,
 *   3. reloads and tab closes trigger the browser's own "leave site?" prompt.
 *
 * The part that actually removes the incentive to leave is not here: the clock
 * is derived from a start time stored server-side, so walking out buys no
 * extra time. This component only makes leaving deliberate rather than
 * accidental.
 */
export function ExamGuard({
  active,
  strict,
  onLeave,
}: {
  /** Off once the exam is finished, so the report page navigates freely. */
  active: boolean;
  /** Full exam: leaving abandons the attempt. Section drill: it can be resumed. */
  strict: boolean;
  /** Called when the learner confirms they want out. */
  onLeave: () => void;
}) {
  const [asking, setAsking] = useState(false);

  // ── Reload / tab close ──
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Browsers show their own wording; returnValue just opts in.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  // ── Back button ──
  // One spare entry is pushed on mount. Back consumes it, popstate fires, and
  // we immediately push another — so the page never actually unwinds, and the
  // learner sees the dialog instead.
  useEffect(() => {
    if (!active) return;
    window.history.pushState({ examGuard: true }, '');

    // React remounts effects in development, and a popstate raised by the
    // teardown can arrive after the next mount has already subscribed. Ignoring
    // events in the first moments stops that stray press from opening the
    // dialog the instant the exam starts.
    const armedAt = Date.now();

    const onPop = () => {
      if (Date.now() - armedAt < 400) {
        window.history.pushState({ examGuard: true }, '');
        return;
      }
      window.history.pushState({ examGuard: true }, '');
      setAsking(true);
    };
    window.addEventListener('popstate', onPop);

    // Deliberately no history.back() here. Unwinding the spare entry on
    // teardown fights the remount above; the result page traps Back on its own
    // side instead, which is where it actually matters.
    return () => window.removeEventListener('popstate', onPop);
  }, [active]);

  const confirmLeave = useCallback(() => {
    setAsking(false);
    onLeave();
  }, [onLeave]);

  if (!asking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-glass animate-slide-in">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/15 text-danger">
          <AlertTriangle size={22} />
        </div>

        <h2 className="text-lg font-extrabold text-text-primary">
          Imtihondan chiqmoqchimisiz?
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {strict ? (
            <>
              Vaqt <span className="font-bold text-text-primary">to&rsquo;xtamaydi</span> —
              chiqib ketsangiz ham soat yurib turadi va urinish tugallanmagan qoladi.
            </>
          ) : (
            <>
              Vaqt <span className="font-bold text-text-primary">to&rsquo;xtamaydi</span>.
              Qaytib kirsangiz qolgan vaqt bilan davom ettirasiz.
            </>
          )}
        </p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setAsking(false)}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white
                       transition-colors hover:bg-primary-hover"
          >
            Davom etish
          </button>
          <button
            onClick={confirmLeave}
            className={cn(
              'rounded-xl border border-border px-4 py-3 text-sm font-bold',
              'text-text-secondary transition-colors hover:border-danger/50 hover:text-danger',
            )}
          >
            <X size={15} className="mr-1 inline" />
            Chiqish
          </button>
        </div>
      </div>
    </div>
  );
}
