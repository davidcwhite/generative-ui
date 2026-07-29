# Filter bar, popover and chips

How the filter row is built. What each control *does* is in
[02-functional-spec.md](./02-functional-spec.md#filters); this is the structure
behind it.

- [Layout](#layout)
- [The clause model](#the-clause-model)
- [The field registry](#the-field-registry)
- [One popover, two modes](#one-popover-two-modes)
- [The three editors](#the-three-editors)
- [Chips](#chips)
- [The bar](#the-bar)
- [Command primitive](#command-primitive)
- [Gotchas](#gotchas)

---

## Layout

A single wrapping flex row. Search first, then the add button, then one chip per
clause, then Clear; status is pushed to the right with `ml-auto`.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⌕ Search issuer…   ⊕ Filter   ⟨Sector Financials ✕⟩ ⟨Deal size ≥ 500m ✕⟩   Clear        ⟳ 167 issues │
└──────────────────────────────────────────────────────────────────────────────┘
   flex-1, max 280px    h-8                h-8 chips                            ml-auto
```

```tsx
<div className="flex flex-wrap items-center gap-2">
```

`flex-wrap` because the chip row is unbounded — with six clauses it wraps to a
second line rather than compressing the search box. Everything on the row is
`h-8` so wrapping stays even.

The popover has two modes, and the chip is the entry point to the second:

```
 mode 1: pick a field        mode 2: edit the clause
┌──────────────────┐        ┌──────────────────────┐
│ ⌕ Filter by…     │        │ ‹ Sector      Clear  │ ← EditorHeader
├──────────────────┤   →    ├──────────────────────┤
│ Issuer         › │        │ ☑ Financials         │
│ Sector      • ›  │        │ ☐ Energy             │
│ Deal size      › │        │ ☑ Utilities          │
└──────────────────┘        └──────────────────────┘
      • = clause exists          ‹ = back, omitted when
                                     opened from a chip
```

---

## The clause model

Everything rests on one rule: **at most one clause per field**, so a clause needs
no id — its field *is* its identity.

```ts
export type ListField = 'issuer' | 'ticker' | 'region' | 'sector' | 'rating' | 'currency' | 'status';
export type FilterField = ListField | 'size' | 'pricingDate';

/** At most one clause per field, so a clause is identified by its field alone. */
export type FilterClause =
  | { field: ListField; values: string[] }
  | { field: 'size'; min: number | null; max: number | null }
  | { field: 'pricingDate'; from: string | null; to: string | null };
```

State is a plain `FilterClause[]` held by the page. Four pure helpers are the only
way it is edited, which is what keeps the chip row honest — an emptied clause
disappears instead of lingering as a chip that filters nothing:

```ts
export function findClause(filters: FilterClause[], field: FilterField) {
  return filters.find((clause) => clause.field === field);
}

/** An empty clause is dropped, which keeps the chip row honest. */
export function upsertClause(filters: FilterClause[], clause: FilterClause): FilterClause[] {
  const rest = filters.filter((item) => item.field !== clause.field);
  if (isEmptyClause(clause)) return rest;
  return [...rest, clause];
}

export function removeClause(filters: FilterClause[], field: FilterField) {
  return filters.filter((clause) => clause.field !== field);
}

export function isEmptyClause(clause: FilterClause) {
  if (clause.field === 'size') return clause.min === null && clause.max === null;
  if (clause.field === 'pricingDate') return clause.from === null && clause.to === null;
  return clause.values.length === 0;
}
```

Note `upsertClause` appends, so a re-edited clause moves to the end of the chip
row. That is deliberate: the chip you just touched ends up where your cursor
already is.

### Clauses describe themselves

Chip labels are derived, never stored, so a chip cannot drift from its clause:

```ts
export function describeClause(clause: FilterClause): string {
  const label = FIELD_LABELS[clause.field];
  if (clause.field === 'size') {
    if (clause.min !== null && clause.max !== null) {
      return `${label} ${clause.min}–${clause.max}m`;
    }
    if (clause.min !== null) return `${label} ≥ ${clause.min}m`;
    return `${label} ≤ ${clause.max}m`;
  }
  if (clause.field === 'pricingDate') {
    if (clause.from && clause.to) return `${label} ${shortDate(clause.from)} – ${shortDate(clause.to)}`;
    if (clause.from) return `${label} from ${shortDate(clause.from)}`;
    return `${label} to ${shortDate(clause.to!)}`;
  }
  if (clause.values.length === 1) return `${label} ${clause.values[0]}`;
  return `${label} ${clause.values.length} selected`;
}
```

One value is named; several are counted. Naming four sectors makes a chip wider
than the search box.

### Matching, for reference

The same union drives evaluation, so adding a clause variant surfaces as a type
error in both places:

```ts
function matchesClause(row: IssuanceRecord, clause: FilterClause) {
  if (clause.field === 'size') {
    if (clause.min !== null && row.size < clause.min) return false;
    if (clause.max !== null && row.size > clause.max) return false;
    return true;
  }
  if (clause.field === 'pricingDate') {
    if (clause.from && row.pricingDate < clause.from) return false;
    if (clause.to && row.pricingDate > clause.to) return false;
    return true;
  }
  if (clause.values.length === 0) return true;
  return clause.values.includes(row[clause.field]);
}
```

ISO dates compare correctly as strings, so no parsing is needed on the hot path.

---

## The field registry

One array declares every filterable field and which editor it gets. Adding a
field is one entry here plus a union member — no changes to the bar, the popover
or the chips.

```ts
export interface FieldDef {
  field: FilterField;
  label: string;
  kind: 'list' | 'size' | 'date';
  /** Fixed option lists; long ones rely on the popover's search box. */
  options?: readonly string[];
  hint?: string;
}

export const FILTER_FIELDS: FieldDef[] = [
  { field: 'issuer', label: 'Issuer', kind: 'list', options: ISSUANCE_ISSUERS },
  { field: 'ticker', label: 'Ticker', kind: 'list', options: ISSUANCE_TICKERS },
  { field: 'region', label: 'Region', kind: 'list', options: ISSUANCE_REGIONS },
  { field: 'sector', label: 'Sector', kind: 'list', options: ISSUANCE_SECTORS },
  { field: 'rating', label: 'Rating', kind: 'list', options: ISSUANCE_RATINGS },
  { field: 'currency', label: 'Currency', kind: 'list', options: ISSUANCE_CURRENCIES },
  { field: 'status', label: 'Status', kind: 'list', options: ISSUANCE_STATUSES },
  { field: 'size', label: 'Deal size', kind: 'size', hint: 'Local currency, millions' },
  { field: 'pricingDate', label: 'Pricing date', kind: 'date' },
];

const FIELD_LABELS: Record<FilterField, string> = Object.fromEntries(
  FILTER_FIELDS.map((field) => [field.field, field.label]),
) as Record<FilterField, string>;
```

Deriving `FIELD_LABELS` rather than writing a second map means a label can only be
defined once.

---

## One popover, two modes

`field === undefined` shows the picker; otherwise the clause editor. Both the
`+ Filter` button and every chip render the same component, differing only by
`initialField`.

```tsx
function FilterEditor({
  filters, onChange, initialField, open, onOpenChange, children,
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
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden />
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
```

Three details carry weight:

**Reset on open, not on close.** `if (open) setField(initialField)` means the
picker is always where you left it *until* you reopen, and reopening from the
`+ Filter` button always starts at the field list. Resetting on close would be
visible as the panel changing under a closing animation.

**`onBack` is absent when opened from a chip.** `initialField ? undefined : …`
gives the header a back chevron only when there is a list to go back *to*. From a
chip, the field list was never on screen.

**Width follows the editor.** `w-60` for lists and the size form, `w-auto` for the
date editor, which sizes itself from two calendar months. `p-0` in both cases
because each editor draws its own padding and rules.

`open` is lifted to the caller so the chip owns its own popover state, which is
what lets several chips coexist without a shared "which one is open" register.

### Editor header

Shared by all three editors: title, optional hint, optional back, optional Clear.

```tsx
<div className="flex items-center justify-between gap-2 border-b border-stone-100 px-2.5 py-2">
  <div className="min-w-0">
    <div className="flex items-center gap-1.5">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Back to fields"
          className="rounded text-stone-400 transition-colors hover:text-stone-800">
          <ChevronRight className="h-3 w-3 rotate-180" aria-hidden />
        </button>
      )}
      <p className="text-[11px] font-semibold text-stone-800">{title}</p>
    </div>
    {hint && <p className="mt-0.5 text-[10px] text-stone-400">{hint}</p>}
  </div>
  {onClear && (
    <button type="button" onClick={onClear}
      className="text-[10px] font-medium text-stone-400 transition-colors hover:text-stone-800">
      Clear
    </button>
  )}
</div>
```

`rotate-180` on `ChevronRight` rather than importing `ChevronLeft`, so the two
chevrons in this file are guaranteed to be the same glyph. `min-w-0` lets the
title truncate instead of pushing Clear off the edge.

---

## The three editors

`ClauseEditor` dispatches on `definition.kind` and passes `filters`/`onChange`
down, so each editor only builds its own clause shape.

### List

Checkbox rows, applied on toggle — no Apply button, because one toggle is already
a complete edit.

```tsx
const selected = clause && 'values' in clause ? clause.values : [];
const toggle = (value: string) => {
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
  onChange(upsertClause(filters, { field: definition.field as ListField, values: next }));
};
```

```tsx
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
                ? 'border-blue-600 bg-blue-600 text-white'
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
```

The `> 8` threshold keeps a search box off short lists, where it would be more
chrome than help. The checkbox is a styled `<span aria-hidden>` because the row
itself is the control — `CommandItem` carries the role and the selected state, so
a real checkbox would be announced twice.

### Size

A real `<form>`, so Enter submits for free.

```tsx
<form
  onSubmit={(event) => {
    event.preventDefault();
    onApply(parse(min), parse(max));
  }}
>
```

```ts
const [min, setMin] = useState(clause?.min?.toString() ?? '');
const [max, setMax] = useState(clause?.max?.toString() ?? '');
const parse = (value: string) => (value.trim() === '' ? null : Number(value));
```

Blank means unbounded, hence `null` rather than `0`. Both inputs are
`inputMode="numeric"` with `tabular-nums`, wrapped in labels with `sr-only` text
since the placeholders are the only visible hint. Apply is disabled while both are
empty:

```tsx
<Button size="xs" type="submit" disabled={min.trim() === '' && max.trim() === ''}>
```

Draft state is local and committed on submit — unlike the list editor, a
half-typed bound is not a meaningful filter.

### Date

Reuses the range picker's two components, so there is no second calendar
implementation. See
[06-date-picker.md](./06-date-picker.md#second-configuration) — the only
differences are `canApply` requiring just `from`, and Clear in the header
replacing Reset in the footer.

---

## Chips

Two buttons in one pill: the label reopens the editor, the ✕ removes the clause.

```tsx
function FilterChip({ clause, filters, onChange }: {
  clause: FilterClause;
  filters: FilterClause[];
  onChange: (filters: FilterClause[]) => void;
}) {
  const [open, setOpen] = useState(false);
  /* Applied clauses take the grid's selection blue — an active filter is the
     one state on the page that should not read as neutral chrome. */
  return (
    <span className="inline-flex h-8 items-center rounded-lg bg-blue-50/90 pr-1 text-[11px] text-blue-800">
      <FilterEditor
        filters={filters}
        onChange={onChange}
        initialField={clause.field}
        open={open}
        onOpenChange={setOpen}
      >
        <button
          type="button"
          className="h-8 rounded-l-lg pl-2.5 pr-1.5 font-medium transition-colors hover:text-blue-950"
        >
          {describeClause(clause)}
        </button>
      </FilterEditor>
      <button
        type="button"
        onClick={() => onChange(removeClause(filters, clause.field))}
        aria-label={`Remove ${describeClause(clause)}`}
        className="rounded-md p-1 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-800"
      >
        <X className="h-2.5 w-2.5" aria-hidden />
      </button>
    </span>
  );
}
```

The blue is the same family as the AG Grid theme's `accentColor: '#2563eb'` and
selected-row wash `#EEF4FF`, so filter state and row selection read as one
system rather than two accents.

The wrapper is a `<span>`, not a `<button>` — nesting buttons is invalid HTML and
would make the ✕ unreachable. `pr-1` on the wrapper plus `p-1` on the ✕ gives the
remove target a 24px hit area without visible padding, and `rounded-l-lg` on the
label means only the left end is rounded, so the two halves read as one pill.

`aria-label` uses the same `describeClause` output, so screen-reader users hear
"Remove Sector Financials" rather than a bare "Remove".

Keying by field is safe precisely because of the one-clause-per-field rule:

```tsx
{filters.map((clause) => (
  <FilterChip key={clause.field} clause={clause} filters={filters} onChange={onFiltersChange} />
))}
```

---

## The bar

```tsx
export function IssuanceFilterBar({
  filters, onFiltersChange, onSearchChange, onClearAll, children,
}: {
  filters: FilterClause[];
  onFiltersChange: (filters: FilterClause[]) => void;
  onSearchChange: (value: string) => void;
  onClearAll: () => void;
  /** Right-aligned status area: refresh indicator and row count. */
  children: React.ReactNode;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const hasFilters = filters.length > 0 || searchDraft.length > 0;

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(searchDraft), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, onSearchChange]);
```

### Search debounce lives here

The draft is local to the bar, not the page. A keystroke therefore re-renders the
bar alone; the charts and grid see nothing until the 300ms timer commits. Lifting
`searchDraft` to the page would re-render every surface per character.

The trade-off is that **`onSearchChange` must be stable** — it is in the effect's
dependency array, so an inline arrow would reset the timer on every parent render
and the search would never fire.

### Search input

```tsx
<label className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" aria-hidden />
  <span className="sr-only">Search issuance</span>
  <Input
    type="search"
    value={searchDraft}
    onChange={(event) => setSearchDraft(event.target.value)}
    placeholder="Search issuer, ticker or sector"
    className="h-8 border-stone-200 bg-white pl-8 text-xs"
  />
</label>
```

`pointer-events-none` on the icon so a click on it still focuses the field, and
`pl-8` to clear it. `flex-1` with a `max-w` lets the box take slack on a wide
viewport without dominating a narrow one.

### Add button and Clear

The icon changes to signal state without adding a badge — and takes the accent
blue once filters are live, matching the chips beside it:

```tsx
{filters.length === 0 ? (
  <Plus className="h-3 w-3 text-stone-400" aria-hidden />
) : (
  <ListFilter className="h-3 w-3 text-blue-600" aria-hidden />
)}
Filter
```

```tsx
{hasFilters && (
  <Button variant="ghost" size="xs" className="text-stone-500 hover:text-stone-900" onClick={onClearAll}>
    Clear
  </Button>
)}

<div className="ml-auto flex items-center gap-3 text-[11px] text-stone-400">{children}</div>
```

Clear is conditional, so the row has no dead control in its resting state.
`children` is a slot rather than props, which keeps loading concerns out of the
bar:

```tsx
<IssuanceFilterBar key={searchKey} /* … */>
  {showRefreshing && <RefreshIndicator label="Loading" />}
  {totalRows === null ? (
    <Skeleton className="h-2.5 w-14" />
  ) : (
    <span className="tabular-nums">{totalRows.toLocaleString()} issues</span>
  )}
</IssuanceFilterBar>
```

### Clear-all needs a remount

Because the search draft is local, the parent cannot empty it by setting state.
Clearing therefore bumps a counter used as the bar's `key`:

```tsx
const [searchKey, setSearchKey] = useState(0);

const clearAll = () => {
  setFilters([]);
  setSearch('');
  setSearchKey((current) => current + 1);
};
```

```tsx
/** Bumped by a clear-all, which remounts the bar and empties its search box. */
<IssuanceFilterBar key={searchKey} … />
```

Deliberate: colocating the draft is worth one remount on an infrequent action. The
alternative — a `value`/`onChange` pair threaded from the page — reinstates the
per-keystroke re-render the debounce exists to avoid.

Note the same `clearAll` is passed to the charts' empty states, so "clear
filters" means one thing everywhere.

---

## Command primitive

`cmdk`, restyled. Filtering, keyboard navigation and the empty state come from
the library; only `value` on each item needs to be the searchable text.

```tsx
// Command
'flex w-full flex-col overflow-hidden text-stone-900'

// CommandInput — wrapper carries the icon and rule
'flex items-center gap-2 border-b border-stone-100 px-2.5'
'h-9 w-full bg-transparent text-xs outline-none placeholder:text-stone-400 disabled:opacity-50'

// CommandList — the scroll boundary
'max-h-64 overflow-y-auto overflow-x-hidden p-1'

// CommandEmpty
'py-5 text-center text-[11px] text-stone-400'

// CommandItem
'relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-xs
 outline-none data-[selected=true]:bg-stone-100
 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50'
```

`max-h-64` on the list is what bounds the popover for a long field like Issuer;
without it the panel grows past the viewport. `data-[selected=true]` is cmdk's
keyboard highlight, not the checkbox state — the tick is drawn separately, so both
can be visible at once.

Popover shell, animation and z-index are in
[01-design-system.md](./01-design-system.md#popover-internals).

---

## Gotchas

- **`onSearchChange` must be referentially stable.** It sits in the debounce
  effect's dependencies; an inline arrow restarts the timer every render and the
  search silently never commits.
- **Don't lift the search draft.** It is local on purpose. Moving it up
  reintroduces a full-page re-render per keystroke and makes the `key` remount
  look unnecessary right before it becomes necessary again.
- **Chips must not be buttons.** A chip contains two controls; nesting them in a
  button is invalid HTML and the remove target becomes unreachable.
- **Route every edit through `upsertClause`.** Writing to the array directly
  skips the empty-clause drop, leaving chips that match everything.
- **Give `CommandItem` a `value`.** cmdk filters on it, not on children. Omitting
  it makes the search box appear to do nothing.
- **`w-auto p-0` for the date editor.** The default `w-60` clips the second
  calendar month.
- **`min-w-0` on the header's title block**, or a long field label pushes Clear
  out of the popover.
- **The picker's dot is not a live count.** It marks that a clause exists,
  deliberately, so the field list does not need to re-describe every clause.
