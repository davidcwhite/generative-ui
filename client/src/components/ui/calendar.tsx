import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, getDefaultClassNames, type DayPickerProps } from 'react-day-picker';
import { cn } from '@/lib/utils';

/**
 * Range-first calendar in the stone palette. Selection state lives on the day
 * cell so a range reads as one continuous band rather than separate pills.
 *
 * Cell geometry comes from `--cell-size`, so callers can resize the grid with
 * `className="[--cell-size:2.5rem]"` without touching the class map.
 */
export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      // `relative` is load-bearing: the nav is absolutely positioned, and
      // react-day-picker's stylesheet — which would supply this — is not
      // imported. Without it the arrows anchor to the nearest positioned
      // ancestor, landing on whatever sits above the calendar in the popover.
      className={cn('relative p-2 text-stone-900 [--cell-size:2rem]', className)}
      classNames={{
        root: defaults.root,
        months: 'flex gap-5',
        month: 'space-y-2.5',
        // `top-2` matches the root's `p-2`, so the nav shares the caption's
        // 24px band instead of floating 4px above it.
        nav: 'flex items-center justify-between absolute inset-x-1 top-2 z-10 pointer-events-none',
        button_previous:
          'pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-30',
        button_next:
          'pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-30',
        month_caption: 'relative flex h-6 items-center justify-center',
        caption_label: 'text-[11px] font-semibold tracking-[-0.01em] text-stone-800',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-(--cell-size) text-center text-[9px] font-medium uppercase tracking-[0.08em] text-stone-400',
        week: 'mt-0.5 flex',
        day: 'relative size-(--cell-size) p-0 text-center text-[11px] first:rounded-l-md last:rounded-r-md',
        range_start: 'rounded-l-md bg-stone-100',
        range_middle:
          'bg-stone-100 [&>button]:!bg-transparent [&>button]:!text-stone-800 [&>button]:hover:!bg-stone-200',
        range_end: 'rounded-r-md bg-stone-100',
        day_button:
          'relative size-(--cell-size) rounded-md tabular-nums transition-colors hover:bg-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/20',
        selected: '[&>button]:bg-stone-900 [&>button]:text-white [&>button]:hover:bg-stone-800',
        today: 'font-semibold',
        outside: 'text-stone-300',
        disabled: 'text-stone-300 opacity-60',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          ),
      }}
      {...props}
    />
  );
}
