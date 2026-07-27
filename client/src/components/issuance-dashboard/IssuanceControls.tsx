import { useCallback, useEffect, useId, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { addMonths, format, isValid, parse, startOfMonth } from 'date-fns';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { shortDate } from './issuanceFilters';
import {
  DEFAULT_RANGE_PRESET,
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
} from './issuanceData';

/* ------------------------------------------------------------------ *
 * Shared segmented control
 * ------------------------------------------------------------------ */

function Segmented({
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

function SegmentedButton({
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

const FIRST_MONTH = startOfMonth(localFromIso(ISSUANCE_START));
const LAST_MONTH = startOfMonth(localFromIso(TODAY));

/** Two panels, so the right-hand one never runs past the dataset. */
function clampMonth(month: Date) {
  const left = startOfMonth(month);
  if (left < FIRST_MONTH) return FIRST_MONTH;
  const latestLeft = addMonths(LAST_MONTH, -1);
  return left > latestLeft ? latestLeft : left;
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Two months ending on the latest pricing date. Navigation is bounded by the
 * dataset, so the user can never page into an empty future. The view follows a
 * typed date only when that date falls outside the two visible months —
 * clicking a day in the right-hand panel shouldn't shunt the whole view.
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
  const [month, setMonth] = useState(() =>
    clampMonth(localFromIso(anchor ?? shiftMonths(TODAY, -1))),
  );

  const focus = selected?.from;
  useEffect(() => {
    if (!focus) return;
    const visible = [month, addMonths(month, 1)];
    if (!visible.some((panel) => sameMonth(panel, focus))) setMonth(clampMonth(focus));
  }, [focus, month]);

  return (
    <Calendar
      mode="range"
      numberOfMonths={2}
      month={month}
      onMonthChange={(next) => setMonth(clampMonth(next))}
      startMonth={FIRST_MONTH}
      endMonth={LAST_MONTH}
      selected={selected}
      onSelect={onSelect}
      disabled={{ before: localFromIso(ISSUANCE_START), after: localFromIso(TODAY) }}
      required={false}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Typed dates
 * ------------------------------------------------------------------ */

/**
 * Day-first, and two-digit years are tried before four so `yyyy` cannot
 * greedily read "26" as the year 26 AD — which would then clamp to the dataset
 * floor and look like the field had ignored the input.
 */
const TYPED_FORMATS = [
  'd/M/yy',
  'd/M/yyyy',
  'd.M.yy',
  'd.M.yyyy',
  'yyyy-MM-dd',
  'd MMM yy',
  'd MMM yyyy',
];
const DISPLAY_FORMAT = 'dd/MM/yyyy';
const PLACEHOLDER_FORMAT = 'DD/MM/YYYY';
const FORMAT_HINT = 'Type or pick — 15/01/2026, 15 Jan 2026 or 2026-01-15';
const INVALID_HINT = 'Not a date we recognise — try 15/01/2026';

/** First format that yields a real date wins; out-of-range dates clamp. */
function parseTyped(text: string): Date | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  for (const pattern of TYPED_FORMATS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (!isValid(parsed)) continue;
    const floor = localFromIso(ISSUANCE_START);
    const ceiling = localFromIso(TODAY);
    if (parsed < floor) return floor;
    if (parsed > ceiling) return ceiling;
    return parsed;
  }
  return null;
}

/**
 * Text in, date out. Commits on blur and Enter rather than per keystroke, so a
 * half-typed year never yanks the calendar to another decade.
 */
function DateField({
  label,
  value,
  onCommit,
  onEnter,
  onValidityChange,
}: {
  label: string;
  value: Date | undefined;
  onCommit: (date: Date | null) => void;
  onEnter: (date: Date | null) => void;
  onValidityChange: (invalid: boolean) => void;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(value ? format(value, DISPLAY_FORMAT) : '');
    setInvalid(false);
    onValidityChange(false);
  }, [value, onValidityChange]);

  const flag = (failed: boolean) => {
    setInvalid(failed);
    onValidityChange(failed);
  };

  const commit = () => {
    const parsed = parseTyped(text);
    const failed = text.trim() !== '' && parsed === null;
    flag(failed);
    if (!failed) onCommit(parsed);
    return failed ? undefined : parsed;
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <label
        className="text-[9px] font-medium uppercase tracking-[0.1em] text-stone-400"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={text}
        aria-invalid={invalid}
        placeholder={PLACEHOLDER_FORMAT}
        title={FORMAT_HINT}
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value);
          if (invalid) flag(false);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          const parsed = commit();
          if (parsed !== undefined) onEnter(parsed);
        }}
        className={`h-7 w-[104px] rounded-md border bg-white px-2 text-[11px] tabular-nums text-stone-800 transition-colors placeholder:tracking-tight placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 ${
          invalid ? 'border-red-300 text-red-600' : 'border-stone-200 focus:border-stone-300'
        }`}
      />
    </span>
  );
}

/**
 * Shared footer: the range as editable text, plus the commit action. Handlers
 * receive the range explicitly so a typed Enter never applies a stale draft.
 */
export function DateRangeFooter({
  draft,
  onDraftChange,
  canApply,
  onApply,
  onReset,
}: {
  draft: DateRange | undefined;
  onDraftChange: (range: DateRange | undefined) => void;
  canApply: (range: DateRange | undefined) => boolean;
  onApply: (range: DateRange) => void;
  onReset?: () => void;
}) {
  const [invalid, setInvalid] = useState({ from: false, to: false });
  const flag = useCallback(
    (side: 'from' | 'to', failed: boolean) =>
      setInvalid((current) =>
        current[side] === failed ? current : { ...current, [side]: failed },
      ),
    [],
  );
  const flagFrom = useCallback((failed: boolean) => flag('from', failed), [flag]);
  const flagTo = useCallback((failed: boolean) => flag('to', failed), [flag]);
  const rejected = invalid.from || invalid.to;

  /** Typing an end date before the start reads as a correction, so they swap. */
  const commit = (side: 'from' | 'to', date: Date | null): DateRange | undefined => {
    const from = side === 'from' ? date ?? undefined : draft?.from;
    const to = side === 'to' ? date ?? undefined : draft?.to;
    const next =
      from && to && from > to ? { from: to, to: from } : from || to ? { from, to } : undefined;
    onDraftChange(next);
    return next;
  };

  return (
    <div className="border-t border-stone-100 px-2.5 py-2.5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-end gap-1.5">
          <DateField
            label="Start"
            value={draft?.from}
            onValidityChange={flagFrom}
            onCommit={(date) => commit('from', date)}
            onEnter={(date) => {
              const next = commit('from', date);
              if (canApply(next)) onApply(next as DateRange);
            }}
          />
          <span className="pb-2 text-[11px] text-stone-300" aria-hidden>
            –
          </span>
          <DateField
            label="End"
            value={draft?.to}
            onValidityChange={flagTo}
            onCommit={(date) => commit('to', date)}
            onEnter={(date) => {
              const next = commit('to', date);
              if (canApply(next)) onApply(next as DateRange);
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          {onReset && (
            <Button variant="ghost" size="xs" onClick={onReset}>
              Reset
            </Button>
          )}
          {/* Applying while a field is unparsed would silently ignore it. */}
          <Button
            size="xs"
            disabled={rejected || !canApply(draft)}
            onClick={() => onApply(draft as DateRange)}
          >
            Apply
          </Button>
        </div>
      </div>
      {/* Always on show: the fields accept text, and this is the grammar. */}
      <p
        className={`mt-1.5 text-[10px] ${rejected ? 'text-red-600' : 'text-stone-400'}`}
        role={rejected ? 'alert' : undefined}
      >
        {rejected ? INVALID_HINT : FORMAT_HINT}
      </p>
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
            onDraftChange={setDraft}
            canApply={(range) => Boolean(range?.from && range?.to)}
            /* Clearing only the draft would strand the applied range with Apply
               disabled, so Reset drops the custom window altogether. */
            onReset={() => {
              onPresetSelect(DEFAULT_RANGE_PRESET);
              setOpen(false);
            }}
            onApply={(range) => {
              if (!range.from || !range.to) return;
              onCustomSelect({ from: isoFromLocal(range.from), to: isoFromLocal(range.to) });
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

const DIMENSIONS: Dimension[] = ['sector', 'region', 'currency', 'rating', 'issuer'];

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
      <DropdownMenuContent align="end" aria-label="Stack bars by">
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
      <DropdownMenuContent align="end" aria-label="Break down by">
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
