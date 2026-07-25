import { Check, ChevronDown, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CompsSpec } from '../contract';
import { CURRENCIES, RATING_BANDS, SECTORS, TENOR_BUCKETS } from '../data/queries';

const WINDOWS = [3, 6, 12, 24] as const;

/** Multi-select in a menu; the trigger carries the current selection inline. */
function ChipMenu<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: T[] | undefined;
  onChange: (next: T[] | undefined) => void;
}) {
  const active = selected?.length ? selected : undefined;

  const toggle = (value: T) => {
    const current = new Set(selected ?? []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    const next = [...current];
    onChange(next.length ? next : undefined);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-7 max-w-[240px] items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 ${
            active
              ? 'bg-stone-900 text-white hover:bg-stone-800'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
          }`}
        >
          <span className="truncate">
            {label}
            {active && <span className="opacity-70"> · {active.join(', ')}</span>}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-52 overflow-auto">
        {options.map((option) => {
          const checked = selected?.includes(option) ?? false;
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-stone-700 transition-colors hover:bg-stone-100"
            >
              {option}
              {checked && <Check className="h-3.5 w-3.5 text-stone-900" aria-hidden />}
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CompsFilters({
  spec,
  onChange,
  onClearSubject,
  subjectLabel,
}: {
  spec: CompsSpec;
  onChange: (next: CompsSpec) => void;
  onClearSubject: () => void;
  subjectLabel?: string;
}) {
  const patch = (filters: Partial<CompsSpec['filters']>) =>
    onChange({ ...spec, filters: { ...spec.filters, ...filters } });

  const hasFilters =
    Boolean(spec.filters.ratingBands?.length) ||
    Boolean(spec.filters.sectors?.length) ||
    Boolean(spec.filters.currencies?.length) ||
    Boolean(spec.filters.tenorBuckets?.length);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ChipMenu
        label="Rating"
        options={RATING_BANDS}
        selected={spec.filters.ratingBands}
        onChange={(ratingBands) => patch({ ratingBands })}
      />
      <ChipMenu
        label="Sector"
        options={SECTORS}
        selected={spec.filters.sectors}
        onChange={(sectors) => patch({ sectors })}
      />
      <ChipMenu
        label="Tenor"
        options={TENOR_BUCKETS}
        selected={spec.filters.tenorBuckets}
        onChange={(tenorBuckets) => patch({ tenorBuckets })}
      />
      <ChipMenu
        label="Ccy"
        options={CURRENCIES}
        selected={spec.filters.currencies}
        onChange={(currencies) => patch({ currencies })}
      />

      <div
        className="inline-flex items-center rounded-md bg-stone-100 p-0.5"
        aria-label="Comparable window"
      >
        {WINDOWS.map((months) => (
          <button
            key={months}
            type="button"
            aria-pressed={spec.windowMonths === months}
            onClick={() => onChange({ ...spec, windowMonths: months })}
            className={`h-6 rounded px-2 text-[10px] font-medium transition-colors ${
              spec.windowMonths === months
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {months}m
          </button>
        ))}
      </div>

      {subjectLabel && (
        <button
          type="button"
          onClick={onClearSubject}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-stone-900 bg-stone-900 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-stone-800"
        >
          Subject · {subjectLabel}
          <X className="h-3 w-3 opacity-70" aria-hidden />
        </button>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange({ ...spec, filters: {} })}
          className="text-[11px] text-stone-400 underline-offset-2 transition-colors hover:text-stone-700 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
