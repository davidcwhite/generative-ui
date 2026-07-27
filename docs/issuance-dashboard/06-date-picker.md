# Date range picker

The popover that pairs a two-month calendar with typed start and end fields.
Everything below is verbatim from a working implementation.

- [Anatomy](#anatomy)
- [Composition](#composition)
- [The popover shell](#the-popover-shell)
- [The calendar](#the-calendar)
- [The footer](#the-footer)
- [Reset and Apply](#reset-and-apply)
- [Wiring it up](#wiring-it-up)
- [Second configuration](#second-configuration)
- [Gotchas](#gotchas)

---

## Anatomy

Top to bottom: month navigation and captions on one row, the two grids, then a
footer holding the typed fields on the left and the actions on the right.

```
┌───────────────────────────────────────────────────────────────┐
│ ‹            June 2026            July 2026                 › │ ← nav + captions, one row
│                                                               │
│    SU MO TU WE TH FR SA      SU MO TU WE TH FR SA             │ ← weekday header
│                    1  2  3  4  5   6  7  8  9 10 11 12        │
│     5  6  7  8  9 10 11      13 14 15 16 17 18 19             │ ← selected range is a
│    12 13 14 15 16 17 18      20 21 22 23 24 25 26             │   continuous stone-100 band
│    ...                       ...                              │
├───────────────────────────────────────────────────────────────┤ ← border-stone-100
│  START          END                                           │
│  ┌──────────┐ – ┌──────────┐              Reset    ┌───────┐  │
│  │dd/mm/yyyy│   │dd/mm/yyyy│                       │ Apply │  │
│  └──────────┘   └──────────┘                       └───────┘  │
│  Type or arrow through each part — 05/08/2021 to 23/07/2026    │ ← bounds, or the error
└───────────────────────────────────────────────────────────────┘
```

Two decisions drive that layout:

**The arrows sit on the caption row, not inside each month.** By default
react-day-picker puts a nav block in each month header, which gives you two sets
of arrows for two panels. Here a single nav is absolutely positioned across the
top of the whole calendar, so `‹` is outboard of the left month and `›` outboard
of the right, and one click pages both.

**The footer is one row with the hint underneath.** Fields left, actions right,
`justify-between`. Both groups are bottom-aligned with `items-end` so the input
boxes and the buttons share a baseline despite the field labels adding height
above them.

---

## Composition

Three pieces. The calendar and footer are separate exported components so the
same pair can be dropped into more than one popover.

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>{/* trigger button */}</PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="end">
    <DateRangeCalendar anchor={custom?.from} selected={draft} onSelect={setDraft} />
    <DateRangeFooter
      draft={draft}
      onDraftChange={setDraft}
      canApply={(range) => Boolean(range?.from && range?.to)}
      onReset={/* see Reset */}
      onApply={/* see Apply */}
    />
  </PopoverContent>
</Popover>
```

A single `draft` holds the in-progress range. The calendar and the fields are two
views of it, and nothing is applied until Apply or Enter. `DateRange` is
react-day-picker's `{ from?: Date; to?: Date }`.

The dashboard works in ISO strings and the calendar in local `Date`, so two
helpers bridge them. Both avoid `new Date(iso)`, which parses as UTC and can
shift the day backwards west of Greenwich:

```ts
export function localFromIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isoFromLocal(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
```

---

## The popover shell

`w-auto p-0` overrides the shared popover's default `w-72 p-1`: the calendar
sets its own width from the number of months, and the footer draws its own
padding and top rule.

```tsx
'z-50 w-72 rounded-xl border border-stone-200/80 bg-white p-1 text-stone-900 shadow-lg shadow-stone-900/5 outline-none'
```

`align="end"` keeps the right edge under a right-aligned trigger. `sideOffset`
defaults to `6`.

---

## The calendar

`react-day-picker` v10 with every class replaced. The nav is the part worth
reading closely.

```tsx
export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      className={cn('relative p-2 text-stone-900 [--cell-size:2rem]', className)}
      classNames={{
        root: defaults.root,
        months: 'flex gap-5',
        month: 'space-y-2.5',
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
```

### How the nav row works

Four classes cooperate, and dropping any one of them breaks it:

| Class | On | Why |
| --- | --- | --- |
| `relative` | root | The anchor for the absolute nav |
| `absolute inset-x-1 top-2` | `nav` | Lifts the arrows out of the month flow and spans the full width |
| `pointer-events-none` | `nav` | The nav is now a full-width strip over the captions; without this it swallows their clicks |
| `pointer-events-auto` | both buttons | Puts clicks back on the arrows themselves |

`top-2` matches the root's `p-2`, which is what makes the nav share the caption's
24px band exactly. `top-1` leaves the arrows 4px high — visible, and the kind of
thing that reads as sloppy rather than as a bug.

`relative` on the root is the one people lose. react-day-picker's own stylesheet
supplies `position: relative` on `.rdp-root`, but that stylesheet is deliberately
not imported here, and `getDefaultClassNames()` returns only class *names*, no
styles. Without it the arrows anchor to the nearest positioned ancestor — the
popover — and land on whatever sits above the calendar.

### Range as a continuous band

Selection state lives on the `<td>`, not the button. `range_start`,
`range_middle` and `range_end` fill the cell with `bg-stone-100` and round only
the outer ends, so a range reads as one band. `range_middle` then neutralises the
button inside it with `!important` overrides, because `day_button` and `selected`
would otherwise paint each day as its own dark pill.

### Two panels, bounded

```tsx
export function DateRangeCalendar({ anchor, selected, onSelect }: {
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
```

`clampMonth` keeps the **left** panel far enough back that the right one never
pages past the dataset:

```ts
const FIRST_MONTH = startOfMonth(localFromIso(ISSUANCE_START));
const LAST_MONTH = startOfMonth(localFromIso(TODAY));

function clampMonth(month: Date) {
  const left = startOfMonth(month);
  if (left < FIRST_MONTH) return FIRST_MONTH;
  const latestLeft = addMonths(LAST_MONTH, -1);
  return left > latestLeft ? latestLeft : left;
}
```

The effect makes the view follow a typed date, but **only when that date is not
already visible**. Following unconditionally means clicking a day in the
right-hand panel shunts the whole view left by a month under the cursor.

`required={false}` allows deselection. `disabled` greys out-of-range days while
`startMonth`/`endMonth` stop the paging, so the user cannot reach empty months at
all.

---

## The footer

```tsx
<div className="border-t border-stone-100 px-2.5 py-2.5">
  <div className="flex items-end justify-between gap-3">
    {/* Pins segment order to dd/mm/yyyy regardless of the machine's region. */}
    <I18nProvider locale="en-GB">
      <div className="flex items-end gap-1.5">
        <DateField label="Start" value={draft?.from} /* … */ />
        <span className="pb-2 text-[11px] text-stone-300" aria-hidden>–</span>
        <DateField label="End" value={draft?.to} /* … */ />
      </div>
    </I18nProvider>
    <div className="flex items-center gap-1">
      {onReset && (
        <Button variant="ghost" size="xs" onClick={onReset}>Reset</Button>
      )}
      <Button
        size="xs"
        disabled={rejected || !canApply(draft)}
        onClick={() => onApply(draft as DateRange)}
      >
        Apply
      </Button>
    </div>
  </div>
  <p
    className={`mt-1.5 text-[10px] ${rejected ? 'text-red-600' : 'text-stone-400'}`}
    role={rejected ? 'alert' : undefined}
  >
    {rejected ? OUT_OF_RANGE_HINT : BOUNDS_HINT}
  </p>
</div>
```

`border-stone-100` for the internal rule — one step lighter than the page's
`stone-200/70`, because inside a small overlay a full-weight rule dominates. The
`–` separator gets `pb-2` to sit on the inputs' centre line rather than the
flex-end baseline, and `aria-hidden` because it is punctuation.

The hint line is permanent, not revealed on error, so the footer height never
changes. It carries the dataset bounds; the segments advertise their own format
through their `dd/mm/yyyy` placeholders, so there is no grammar left to teach.

### Reversed dates swap

Typing an end date earlier than the start is a correction, not an error:

```ts
const commit = (side: 'from' | 'to', date: Date | null): DateRange | undefined => {
  const from = side === 'from' ? date ?? undefined : draft?.from;
  const to = side === 'to' ? date ?? undefined : draft?.to;
  const next =
    from && to && from > to ? { from: to, to: from } : from || to ? { from, to } : undefined;
  onDraftChange(next);
  return next;
};
```

`commit` returns the new range rather than relying on state, so Enter applies
what was just typed instead of the previous render's draft.

### The fields

Day, month and year as separately focusable segments, via React Aria's
`DateField`. Full styling and behaviour, including why a native
`<input type="date">` cannot be used, are in
[02-functional-spec.md](./02-functional-spec.md#typed-dates). The two things that
matter for this layout:

- The box is `h-7 w-[104px]`, matching the text input it replaced, which is what
  holds the footer's width steady.
- The label is `text-[9px] font-medium uppercase tracking-[0.1em] text-stone-400`
  and sits above the box in an `inline-flex flex-col gap-1`, which is why the
  footer needs `items-end` to align boxes with buttons.

---

## Reset and Apply

**Apply** is disabled unless `canApply(draft)` passes *and* neither field is
showing an out-of-range date. The second condition matters because an
out-of-range date never reaches the draft, so applying would silently use the
previous value.

**Reset** must clear the applied range, not just the draft. Clearing only the
draft is the obvious implementation and it strands the user: the popover empties,
Apply greys out because there is nothing to apply, and the trigger still shows
the old range with no way to remove it.

```tsx
/* Clearing only the draft would strand the applied range with Apply
   disabled, so Reset drops the custom window altogether. */
onReset={() => {
  onPresetSelect(DEFAULT_RANGE_PRESET);
  setOpen(false);
}}
```

So Reset returns the whole control to its default preset and closes. That needs a
named default shared with the parent's initial state, so "reset" and "first load"
cannot drift apart:

```ts
/** Where the dashboard opens, and where Reset returns to. */
export const DEFAULT_RANGE_PRESET: RangePreset = '1Y';
```

```tsx
const [preset, setPreset] = useState<RangePreset | 'CUSTOM'>(DEFAULT_RANGE_PRESET);
```

Reset is optional — `{onReset && …}` — so a consumer that has its own clear
affordance simply omits it.

---

## Wiring it up

The trigger doubles as the current-value display, and reopening restarts from
whatever is applied:

```tsx
const [open, setOpen] = useState(false);
const [draft, setDraft] = useState<DateRange | undefined>();

// Reopening should start from whatever is currently applied.
useEffect(() => {
  if (!open) return;
  setDraft(
    custom ? { from: localFromIso(custom.from), to: localFromIso(custom.to) } : undefined,
  );
}, [open, custom]);

const isCustom = preset === 'CUSTOM' && custom;
```

```tsx
<PopoverTrigger asChild>
  <button
    type="button"
    aria-label="Custom date range"
    aria-pressed={Boolean(isCustom)}
    className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium transition-colors ${
      isCustom ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
    }`}
  >
    <CalendarDays className="h-3 w-3" aria-hidden />
    {isCustom ? `${shortDate(custom.from)} – ${shortDate(custom.to)}` : 'Custom'}
  </button>
</PopoverTrigger>
```

Apply converts back to ISO and closes:

```tsx
onApply={(range) => {
  if (!range.from || !range.to) return;
  onCustomSelect({ from: isoFromLocal(range.from), to: isoFromLocal(range.to) });
  setOpen(false);
}}
```

The parent owns preset and custom window as one exclusive choice, so picking
either clears the other:

```tsx
onPresetSelect={(next) => { setPreset(next); setCustom(null); }}
onCustomSelect={(next) => { setCustom(next); setPreset('CUSTOM'); }}
```

---

## Second configuration

The same two components serve a filter editor, which differs only in its props —
proof that the split is at the right seam:

```tsx
<div>
  <EditorHeader title="Pricing date" onBack={onBack} onClear={clause ? onClear : undefined} />
  <DateRangeCalendar anchor={clause?.from ?? undefined} selected={draft} onSelect={setDraft} />
  <DateRangeFooter
    draft={draft}
    onDraftChange={setDraft}
    canApply={(range) => Boolean(range?.from)}
    onApply={(range) =>
      onApply(range.from ? isoFromLocal(range.from) : null, range.to ? isoFromLocal(range.to) : null)
    }
  />
</div>
```

Three differences: an open-ended range is allowed, so `canApply` requires only
`from`; there is no `onReset`, because the header offers Clear instead, which
removes the filter outright; and a header sits above the calendar — which is
exactly the case that exposes a missing `relative` on the calendar root.

---

## Gotchas

- **`relative` on the calendar root.** Without it the nav arrows anchor to the
  popover and drift onto whatever is above the calendar. Only shows up in a
  layout that puts something there, so it survives a long time unnoticed.
- **Do not import `react-day-picker/style.css`.** The `classNames` map replaces
  the defaults; loading the stylesheet as well reintroduces its geometry and
  fights every override. The cost is that anything the stylesheet would have
  supplied — `position: relative` on the root — becomes yours to declare.
- **`pointer-events-none` on the nav, `auto` on the buttons.** The nav spans the
  full width, so skipping this makes the captions and the top row of cells
  unclickable in a way that looks like a state bug.
- **Pin `react-day-picker` to v10.** These class keys are v9+ naming; on v8 they
  silently match nothing and you get an unstyled calendar.
- **No `rdp-*` classes to hook.** The map replaces them, so `.rdp-root` is the
  only one left in the DOM. Test selectors written against `rdp-day` and friends
  will not match.
- **`w-auto p-0` on the popover content**, or the shared `w-72` clips the second
  month and the default padding doubles up with the calendar's own.
- **Bottom-align the footer with `items-end`.** The fields are taller than the
  buttons because of their labels, so `items-center` floats the buttons.
