import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { shortDate } from './issuanceFilters';
import {
  GRANULARITIES,
  RANGE_PRESETS,
  TODAY,
  allowedGranularities,
  granularityHint,
  type DateWindow,
  type RangePreset,
} from './issuanceRange';
import {
  DIMENSION_LABELS,
  ISSUANCE_START,
  shiftMonths,
  type Dimension,
  type Granularity,
} from './shadcnIssuanceData';

/* ------------------------------------------------------------------ *
 * Shared segmented control
 * ------------------------------------------------------------------ */

export function Segmented({
  children,
  label,
  size = 'md',
}: {
  children: React.ReactNode;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={`inline-flex w-fit items-center rounded-lg bg-stone-100 ${
        size === 'sm' ? 'p-[3px]' : 'p-0.5'
      }`}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function SegmentedButton({
  active,
  disabled,
  title,
  onClick,
  children,
  size = 'md',
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`rounded-md font-medium transition-colors ${
        size === 'sm' ? 'h-[22px] px-2 text-[10px]' : 'h-7 px-2.5 text-[10px]'
      } ${
        active
          ? 'bg-white text-stone-900 shadow-sm'
          : disabled
            ? 'cursor-not-allowed text-stone-300'
            : 'text-stone-500 hover:text-stone-800'
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Date range
 * ------------------------------------------------------------------ */

export function localFromIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isoFromLocal(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Two months ending on the latest pricing date. Navigation is bounded by the
 * dataset, so the user can never page into an empty future.
 */
export function DateRangeCalendar({
  anchor,
  selected,
  onSelect,
}: {
  anchor?: string;
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}) {
  return (
    <Calendar
      mode="range"
      numberOfMonths={2}
      defaultMonth={localFromIso(anchor ?? shiftMonths(TODAY, -1))}
      startMonth={localFromIso(ISSUANCE_START)}
      endMonth={localFromIso(TODAY)}
      selected={selected}
      onSelect={onSelect}
      disabled={{ before: localFromIso(ISSUANCE_START), after: localFromIso(TODAY) }}
      required={false}
    />
  );
}

/** Shared footer: what the draft resolves to, plus the commit action. */
export function DateRangeFooter({
  draft,
  onApply,
  onReset,
  applyDisabled,
}: {
  draft: DateRange | undefined;
  onApply: () => void;
  onReset?: () => void;
  applyDisabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-3 py-2">
      <p className="text-[11px] tabular-nums text-stone-500">
        {draft?.from
          ? `${shortDate(isoFromLocal(draft.from))} – ${
              draft.to ? shortDate(isoFromLocal(draft.to)) : '…'
            }`
          : 'Pick a start and end date'}
      </p>
      <div className="flex items-center gap-1">
        {onReset && (
          <Button variant="ghost" size="xs" onClick={onReset}>
            Reset
          </Button>
        )}
        <Button size="xs" disabled={applyDisabled} onClick={onApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export function RangeControl({
  preset,
  custom,
  onPresetSelect,
  onCustomSelect,
}: {
  preset: RangePreset | 'CUSTOM';
  custom: DateWindow | null;
  onPresetSelect: (preset: RangePreset) => void;
  onCustomSelect: (next: DateWindow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  // Reopening should start from whatever is currently applied.
  useEffect(() => {
    if (!open) return;
    setDraft(
      custom
        ? { from: localFromIso(custom.from), to: localFromIso(custom.to) }
        : undefined,
    );
  }, [open, custom]);

  const isCustom = preset === 'CUSTOM' && custom;

  return (
    <Segmented label="Date range">
      {RANGE_PRESETS.map((item) => (
        <SegmentedButton
          key={item.id}
          active={preset === item.id}
          onClick={() => onPresetSelect(item.id)}
        >
          {item.label}
        </SegmentedButton>
      ))}

      <span className="mx-1 h-4 w-px bg-stone-200" aria-hidden />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Custom date range"
            aria-pressed={Boolean(isCustom)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium transition-colors ${
              isCustom
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <CalendarDays className="h-3 w-3" aria-hidden />
            {isCustom ? `${shortDate(custom.from)} – ${shortDate(custom.to)}` : 'Custom'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <DateRangeCalendar anchor={custom?.from} selected={draft} onSelect={setDraft} />
          <DateRangeFooter
            draft={draft}
            applyDisabled={!draft?.from || !draft?.to}
            onReset={() => setDraft(undefined)}
            onApply={() => {
              if (!draft?.from || !draft?.to) return;
              onCustomSelect({ from: isoFromLocal(draft.from), to: isoFromLocal(draft.to) });
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </Segmented>
  );
}

/* ------------------------------------------------------------------ *
 * Bucket size
 * ------------------------------------------------------------------ */

export function GranularityTabs({
  value,
  range,
  onChange,
}: {
  value: Granularity;
  range: DateWindow;
  onChange: (value: Granularity) => void;
}) {
  const allowed = allowedGranularities(range);
  return (
    <Segmented label="Time period" size="sm">
      {GRANULARITIES.map((item) => {
        const disabled = !allowed.includes(item.id);
        return (
          <SegmentedButton
            key={item.id}
            size="sm"
            active={value === item.id}
            disabled={disabled}
            title={disabled ? granularityHint(item.id, range) : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </SegmentedButton>
        );
      })}
    </Segmented>
  );
}

/* ------------------------------------------------------------------ *
 * Dimension pickers
 * ------------------------------------------------------------------ */

const DIMENSIONS: Dimension[] = ['sector', 'region', 'currency'];

/** Ghost trigger that reads as a caption until hovered — quiet by default. */
function MenuTrigger({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
      >
        {children}
        <ChevronDown className="h-3 w-3 text-stone-400" aria-hidden />
      </button>
    </DropdownMenuTrigger>
  );
}

export function StackByMenu({
  value,
  onChange,
}: {
  value: Dimension | null;
  onChange: (value: Dimension | null) => void;
}) {
  return (
    <DropdownMenu>
      <MenuTrigger>
        <span className="text-stone-400">Stack</span>
        <span>{value ? DIMENSION_LABELS[value].toLowerCase() : 'off'}</span>
      </MenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Stack bars by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value ?? 'none'}
          onValueChange={(next) => onChange(next === 'none' ? null : (next as Dimension))}
        >
          <DropdownMenuRadioItem value="none">No stacking</DropdownMenuRadioItem>
          {DIMENSIONS.map((dimension) => (
            <DropdownMenuRadioItem key={dimension} value={dimension}>
              {DIMENSION_LABELS[dimension]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BreakdownMenu({
  value,
  onChange,
}: {
  value: Dimension;
  onChange: (value: Dimension) => void;
}) {
  return (
    <DropdownMenu>
      <MenuTrigger>
        <span className="text-stone-400">By</span>
        <span>{DIMENSION_LABELS[value].toLowerCase()}</span>
      </MenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Break down by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as Dimension)}>
          {DIMENSIONS.map((dimension) => (
            <DropdownMenuRadioItem key={dimension} value={dimension}>
              {DIMENSION_LABELS[dimension]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
