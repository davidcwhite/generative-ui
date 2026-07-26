import { useState } from 'react';
import { Button } from '@/components/ui/button';

/** Both charts and their skeletons occupy this exact height. */
export const CHART_BAND = 372;

/**
 * A chart's own controls, sat directly above it. Both columns reserve the same
 * height so their charts start on the same line.
 */
export function ChartBar({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      {label ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
          {label}
        </p>
      ) : (
        <span aria-hidden />
      )}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function EmptyBand({ message, onClear }: { message: string; onClear: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-xs text-stone-500">{message}</p>
      <Button variant="ghost" size="xs" className="text-stone-600" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

/**
 * A legend can't give every category a line of its own once a breakdown runs
 * to fifty issuers. Both legends show the ranked head and keep the tail one
 * click away; folding a single leftover would trade a name for a line that
 * says less, so the limit only bites when there is more than one to hide.
 */
export function useCollapsed<T>(items: T[], limit: number) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = items.length > limit + 1;
  const shown = !collapsible || expanded ? items : items.slice(0, limit);

  return {
    shown,
    hidden: items.length - shown.length,
    collapsible,
    expanded,
    toggle: () => setExpanded((current) => !current),
  };
}
