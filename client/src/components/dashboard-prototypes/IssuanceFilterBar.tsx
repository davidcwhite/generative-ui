import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Check, ChevronRight, ListFilter, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { FilterClause, FilterField, ListField } from './issuanceApi';
import {
  FILTER_FIELDS,
  describeClause,
  findClause,
  removeClause,
  upsertClause,
  type FieldDef,
} from './issuanceFilters';
import {
  DateRangeCalendar,
  DateRangeFooter,
  isoFromLocal,
  localFromIso,
} from './IssuanceControls';

/**
 * One popover serves both jobs: picking a field to filter on, and editing the
 * clause for a field. Chips reopen it with the field already chosen, so adding
 * and refining a filter are the same two-step gesture.
 */
function FilterEditor({
  filters,
  onChange,
  initialField,
  open,
  onOpenChange,
  children,
}: {
  filters: FilterClause[];
  onChange: (filters: FilterClause[]) => void;
  initialField?: FilterField;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [field, setField] = useState<FilterField | undefined>(initialField);

  useEffect(() => {
    if (open) setField(initialField);
  }, [open, initialField]);

  const definition = FILTER_FIELDS.find((item) => item.field === field);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className={definition?.kind === 'date' ? 'w-auto p-0' : 'w-60 p-0'}>
        {!definition ? (
          <Command>
            <CommandInput placeholder="Filter by…" />
            <CommandList>
              <CommandEmpty>No field</CommandEmpty>
              <CommandGroup>
                {FILTER_FIELDS.map((item) => (
                  <CommandItem
                    key={item.field}
                    value={item.label}
                    onSelect={() => setField(item.field)}
                  >
                    <span className="flex-1">{item.label}</span>
                    {findClause(filters, item.field) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-900" aria-hidden />
                    )}
                    <ChevronRight className="h-3 w-3 text-stone-300" aria-hidden />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <ClauseEditor
            definition={definition}
            filters={filters}
            onChange={onChange}
            onBack={initialField ? undefined : () => setField(undefined)}
            onDone={() => onOpenChange(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function EditorHeader({
  title,
  hint,
  onBack,
  onClear,
}: {
  title: string;
  hint?: string;
  onBack?: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-2.5 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded text-stone-400 transition-colors hover:text-stone-800"
              aria-label="Back to fields"
            >
              <ChevronRight className="h-3 w-3 rotate-180" aria-hidden />
            </button>
          )}
          <p className="text-[11px] font-semibold text-stone-800">{title}</p>
        </div>
        {hint && <p className="mt-0.5 text-[10px] text-stone-400">{hint}</p>}
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] font-medium text-stone-400 transition-colors hover:text-stone-800"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function ClauseEditor({
  definition,
  filters,
  onChange,
  onBack,
  onDone,
}: {
  definition: FieldDef;
  filters: FilterClause[];
  onChange: (filters: FilterClause[]) => void;
  onBack?: () => void;
  onDone: () => void;
}) {
  const clause = findClause(filters, definition.field);

  if (definition.kind === 'list') {
    const selected = clause && 'values' in clause ? clause.values : [];
    const toggle = (value: string) => {
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      onChange(upsertClause(filters, { field: definition.field as ListField, values: next }));
    };
    return (
      <div>
        <EditorHeader
          title={definition.label}
          onBack={onBack}
          onClear={
            selected.length > 0
              ? () => onChange(removeClause(filters, definition.field))
              : undefined
          }
        />
        <Command>
          {(definition.options?.length ?? 0) > 8 && (
            <CommandInput placeholder={`Search ${definition.label.toLowerCase()}…`} />
          )}
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            <CommandGroup>
              {definition.options?.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => toggle(option)}>
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                      selected.includes(option)
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-300'
                    }`}
                    aria-hidden
                  >
                    {selected.includes(option) && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    );
  }

  if (definition.kind === 'size') {
    return (
      <SizeEditor
        definition={definition}
        clause={clause && clause.field === 'size' ? clause : undefined}
        onBack={onBack}
        onClear={() => onChange(removeClause(filters, 'size'))}
        onApply={(min, max) => {
          onChange(upsertClause(filters, { field: 'size', min, max }));
          onDone();
        }}
      />
    );
  }

  return (
    <DateEditor
      clause={clause && clause.field === 'pricingDate' ? clause : undefined}
      onBack={onBack}
      onClear={() => onChange(removeClause(filters, 'pricingDate'))}
      onApply={(from, to) => {
        onChange(upsertClause(filters, { field: 'pricingDate', from, to }));
        onDone();
      }}
    />
  );
}

function SizeEditor({
  definition,
  clause,
  onBack,
  onClear,
  onApply,
}: {
  definition: FieldDef;
  clause?: Extract<FilterClause, { field: 'size' }>;
  onBack?: () => void;
  onClear: () => void;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const [min, setMin] = useState(clause?.min?.toString() ?? '');
  const [max, setMax] = useState(clause?.max?.toString() ?? '');
  const parse = (value: string) => (value.trim() === '' ? null : Number(value));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply(parse(min), parse(max));
      }}
    >
      <EditorHeader
        title={definition.label}
        hint={definition.hint}
        onBack={onBack}
        onClear={clause ? onClear : undefined}
      />
      <div className="flex items-center gap-2 px-2.5 py-2.5">
        <label className="flex-1">
          <span className="sr-only">Minimum size</span>
          <Input
            inputMode="numeric"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder="Min"
            className="h-8 border-stone-200 text-xs tabular-nums"
          />
        </label>
        <span className="text-[11px] text-stone-400">to</span>
        <label className="flex-1">
          <span className="sr-only">Maximum size</span>
          <Input
            inputMode="numeric"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder="Max"
            className="h-8 border-stone-200 text-xs tabular-nums"
          />
        </label>
      </div>
      <div className="flex justify-end border-t border-stone-100 px-2.5 py-2">
        <Button size="xs" type="submit" disabled={min.trim() === '' && max.trim() === ''}>
          Apply
        </Button>
      </div>
    </form>
  );
}

function DateEditor({
  clause,
  onBack,
  onClear,
  onApply,
}: {
  clause?: Extract<FilterClause, { field: 'pricingDate' }>;
  onBack?: () => void;
  onClear: () => void;
  onApply: (from: string | null, to: string | null) => void;
}) {
  const [draft, setDraft] = useState<DateRange | undefined>(
    clause?.from
      ? { from: localFromIso(clause.from), to: clause.to ? localFromIso(clause.to) : undefined }
      : undefined,
  );

  return (
    <div>
      <EditorHeader title="Pricing date" onBack={onBack} onClear={clause ? onClear : undefined} />
      <DateRangeCalendar anchor={clause?.from ?? undefined} selected={draft} onSelect={setDraft} />
      <DateRangeFooter
        draft={draft}
        onDraftChange={setDraft}
        canApply={(range) => Boolean(range?.from)}
        onApply={(range) =>
          onApply(
            range.from ? isoFromLocal(range.from) : null,
            range.to ? isoFromLocal(range.to) : null,
          )
        }
      />
    </div>
  );
}

function FilterChip({
  clause,
  filters,
  onChange,
}: {
  clause: FilterClause;
  filters: FilterClause[];
  onChange: (filters: FilterClause[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex h-8 items-center rounded-lg bg-stone-100/80 pr-1 text-[11px] text-stone-700">
      <FilterEditor
        filters={filters}
        onChange={onChange}
        initialField={clause.field}
        open={open}
        onOpenChange={setOpen}
      >
        <button
          type="button"
          className="h-8 rounded-l-lg pl-2.5 pr-1.5 font-medium transition-colors hover:text-stone-950"
        >
          {describeClause(clause)}
        </button>
      </FilterEditor>
      <button
        type="button"
        onClick={() => onChange(removeClause(filters, clause.field))}
        aria-label={`Remove ${describeClause(clause)}`}
        className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-200/70 hover:text-stone-800"
      >
        <X className="h-2.5 w-2.5" aria-hidden />
      </button>
    </span>
  );
}

export function IssuanceFilterBar({
  filters,
  onFiltersChange,
  searchDraft,
  onSearchDraftChange,
  onClearAll,
  children,
}: {
  filters: FilterClause[];
  onFiltersChange: (filters: FilterClause[]) => void;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onClearAll: () => void;
  /** Right-aligned status area: refresh indicator and row count. */
  children: React.ReactNode;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const hasFilters = filters.length > 0 || searchDraft.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
          aria-hidden
        />
        <span className="sr-only">Search issuance</span>
        <Input
          type="search"
          value={searchDraft}
          onChange={(event) => onSearchDraftChange(event.target.value)}
          placeholder="Search issuer, ticker or sector"
          className="h-8 border-stone-200 bg-white pl-8 text-xs"
        />
      </label>

      <FilterEditor
        filters={filters}
        onChange={onFiltersChange}
        open={addOpen}
        onOpenChange={setAddOpen}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 bg-stone-100/70 text-[11px] text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        >
          {filters.length === 0 ? (
            <Plus className="h-3 w-3 text-stone-400" aria-hidden />
          ) : (
            <ListFilter className="h-3 w-3 text-stone-400" aria-hidden />
          )}
          Filter
        </Button>
      </FilterEditor>

      {filters.map((clause) => (
        <FilterChip
          key={clause.field}
          clause={clause}
          filters={filters}
          onChange={onFiltersChange}
        />
      ))}

      {hasFilters && (
        <Button
          variant="ghost"
          size="xs"
          className="text-stone-500 hover:text-stone-900"
          onClick={onClearAll}
        >
          Clear
        </Button>
      )}

      <div className="ml-auto flex items-center gap-3 text-[11px] text-stone-400">{children}</div>
    </div>
  );
}
