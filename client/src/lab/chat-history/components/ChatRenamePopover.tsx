import { useEffect, useId, useRef } from 'react';

interface ChatRenamePopoverProps {
  open: boolean;
  onConfirmDelete: () => void;
  onCancel: () => void;
}

export function ChatRenamePopover({
  open,
  onConfirmDelete,
  onCancel,
}: ChatRenamePopoverProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape while open
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
      data-state="open"
      className="ch-popover absolute inset-x-2 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-stone-200 bg-white p-3 shadow-xl"
      style={{ overscrollBehavior: 'contain', touchAction: 'manipulation' }}
      onClick={(e) => e.stopPropagation()}
    >
      <p id={titleId} className="text-sm font-medium text-stone-900 text-pretty">
        Delete this chat?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        This removes the conversation from your history. It can’t be undone.
      </p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
        >
          Keep
        </button>
        <button
          type="button"
          onClick={onConfirmDelete}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
