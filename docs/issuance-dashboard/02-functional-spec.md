# Functional specification

What every control does, including the cases that look like bugs and are not.

- [The shared query](#the-shared-query)
- [Date range](#date-range)
- [Typed dates](#typed-dates)
- [Time granularity](#time-granularity)
- [Stacking the bar chart](#stacking-the-bar-chart)
- [Donut breakdown](#donut-breakdown)
- [Click to filter](#click-to-filter)
- [Scope exclusion](#scope-exclusion)
- [Filters](#filters)
- [Search](#search)
- [The table](#the-table)
- [Detail panel](#detail-panel)
- [Loading](#loading)
- [High-cardinality dimensions](#high-cardinality-dimensions)
- [Empty states](#empty-states)
- [Navigation](#navigation)
- [Accessibility](#accessibility)

---

## The shared query

Every control writes to one object. Every surface reads from it.

```ts
interface IssuanceQuery {
  from: string;          // inclusive ISO date
  to: string;            // inclusive ISO date
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  stackBy: Dimension | null;
  breakdownBy: Dimension;
  filters: FilterClause[];
  search: string;
}

type Dimension = 'sector' | 'region' | 'currency' | 'rating' | 'issuer';
```

Changing any field triggers one aggregate request and one table request. There
is no independent refresh: the charts, the stats and the table always describe
the same query.

---

## Date range

Six presets and a custom range, in a single segmented control at the top right.

| Preset | Window |
| --- | --- |
| 1M | The day after the same date one month back, through today |
| 3M | Three months back, same rule |
| 6M | Six months back |
| YTD | 1 January of the current year, through today |
| 1Y | Twelve months back |
| All | The first pricing date in the dataset, through today |

```ts
export function resolvePreset(preset: RangePreset): DateWindow {
  if (preset === 'ALL') return { from: ISSUANCE_START, to: TODAY };
  if (preset === 'YTD') return { from: `${TODAY.slice(0, 4)}-01-01`, to: TODAY };
  const months = preset === '1M' ? 1 : preset === '3M' ? 3 : preset === '6M' ? 6 : 12;
  return { from: shiftDays(shiftMonths(TODAY, -months), 1), to: TODAY };
}
```

The `+1 day` matters. Without it a "1M" window spans one month **and one day**,
which puts an extra bucket on the axis at daily granularity.

"Today" is the dataset's most recent pricing date, not the wall clock. A fixed
dataset with a moving `today` produces a range that slowly empties.

**Custom** opens a popover with a two-month calendar and two text fields. The
calendar is bounded by the dataset at both ends, so paging into an empty future
is impossible. The draft resets to whatever is currently applied each time the
popover opens, and nothing is committed until **Apply**.

Calendar clicks follow the standard range-picker cycle: the first click anchors
a start, the second completes the range (swapping if it lands before the
anchor), and any click on a *complete* range starts a new one at that day. The
last rule is hand-rolled — react-day-picker's default instead moves the nearest
endpoint, which makes a start date inside the current range unreachable (see
[06-date-picker.md](06-date-picker.md) for the handler).

**Reset** discards the custom window entirely, returns to the default preset and
closes the popover. It must not merely clear the draft: `Apply` requires both
ends of a range, so a cleared draft leaves the applied window untouched *and*
disables the only button that could change it — a dead end where the control
appears broken. The default lives in one place so the initial state and Reset
cannot drift:

```ts
/** Where the dashboard opens, and where Reset returns to. */
export const DEFAULT_RANGE_PRESET: RangePreset = '1Y';
```

Reset appears only on the custom range. The pricing-date filter uses **Clear** in
its editor header instead, which removes the clause outright and is only shown
once a clause exists.

---

## Typed dates

Both date fields are **segmented**: day, month and year are separate, individually
focusable controls rather than one free-text box. Clicking `mm` lands on the
month; typing digits fills the focused segment and advances to the next; up and
down arrows step the focused segment; left and right move between them. Each
segment is a `spinbutton` with its own label and `aria-valuemin`/`aria-valuemax`,
so a screen reader announces "month, START" rather than leaving the user to guess
at a format, and mobile gets the numeric keyboard.

### Why not `<input type="date">`

The native control gives this interaction for free but cannot be pinned to a
format. Segment order follows the browser's locale, which Chrome derives from a
blend of browser language and **OS region** — the same markup renders `mm/dd/yyyy`
on a US-imaged machine. The `lang` attribute does not help: the WHATWG suggests
honouring it and Chrome and Firefox ignore it. The in-progress CSS Form Control
Styling module adds `::field-component` and `::field-separator` for painting the
segments, but states that structure is determined by internationalisation, so
ordering stays out of reach. A native input would also bring its own calendar
popup, which is redundant inside a popover that already contains one.

### Pinning the order

React Aria formats through `Intl.DateTimeFormat`, which **is** deterministic from
a locale string, so an `I18nProvider` fixes the order regardless of host machine:

```tsx
<I18nProvider locale="en-GB">
  {/* START and END fields */}
</I18nProvider>
```

`shouldForceLeadingZeros` renders `05/01/2026` rather than `5/1/2026`. Changing
the locale changes the order — `en-US` yields `mm/dd/yyyy` — and nothing else in
the dashboard needs to know.

### Commit rules

`minValue` and `maxValue` are the dataset bounds, which clamps arrow stepping and
gives assistive technology the range. Typing is not clamped, so the field adds one
rule of its own:

```tsx
const change = (next: CalendarDate | null) => {
  setLocal(next);
  const failed = next !== null && !inRange(next);
  setRejected(failed);
  onValidityChange(failed);
  if (next === null) onCommit(null);
  else if (!failed) onCommit(fromCalendar(next));
};
```

**Only in-range values reach the draft.** Every keystroke in the year segment
yields a complete date on the way to 2026 — 0002, 0020, 0202 — and committing
those would drag the calendar back to the third century between keystrokes.

**Red is deferred until focus leaves.** A half-typed year is not yet a mistake, so
the invalid styling keys off `isFocusWithin` rather than firing mid-entry:

```tsx
rejected && !isFocusWithin ? 'border-red-300 text-red-600' : /* … */
```

**Apply is disabled while a field shows an out-of-range date**, because that date
never reached the draft and applying would silently use the previous value.

**Reversed dates swap.** An end date earlier than the start reads as a correction,
so `from` and `to` exchange places.

**Enter applies the whole range** if both ends are in range.

**The hint line carries the bounds, not a format grammar.** The segments advertise
their own format through their placeholders, so the only thing left to say is
which dates the data covers. It turns red with `role="alert"` when a segment holds
an out-of-range date.

### Why the field needs local state

It cannot be controlled straight from the draft. An out-of-range value has to stay
on screen while the user finishes typing, yet is deliberately not committed — so
if `value` were the only source, the prop would snap the segments back on the next
render and the year would be impossible to edit. Hence a local mirror, resynced
whenever the draft changes from outside:

```tsx
const [local, setLocal] = useState(() => toCalendar(value));

useEffect(() => {
  setLocal(toCalendar(value));
  setRejected(false);
  onValidityChange(false);
}, [value, onValidityChange]);
```

### Conversion boundary

React Aria works in `CalendarDate` from `@internationalized/date`; the rest of the
dashboard uses local `Date`. Two functions bridge it, and are the only place the
representations meet:

```ts
function toCalendar(date: Date | undefined) {
  return date ? new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) : null;
}

function fromCalendar(value: CalendarDate) {
  return new Date(value.year, value.month - 1, value.day);
}
```

`CalendarDate` carries no time and no zone, which is exactly what a pricing date
is, so the round trip is lossless and no timezone arithmetic is involved.

The calendar and the fields are two views of one draft. Typing moves the
calendar **only when the typed date falls outside the two visible months** —
otherwise clicking a day in the right-hand panel would shunt the whole view.

```ts
const focus = selected?.from;
useEffect(() => {
  if (!focus) return;
  const visible = [month, addMonths(month, 1)];
  if (!visible.some((panel) => sameMonth(panel, focus))) setMonth(clampMonth(focus));
}, [focus, month]);
```

The same calendar and footer serve the pricing-date filter, which differs only
in allowing an open-ended range (a start with no end).

---

## Time granularity

Four bucket sizes, gated by the current range so the axis never collapses into
a thicket of hairlines or a lone pair of bars.

| Granularity | Minimum span | Maximum span |
| --- | --- | --- |
| Daily | 1 day | 95 days |
| Weekly | 14 days | 560 days |
| Monthly | 45 days | 2200 days |
| Quarterly | 180 days | unbounded |

Disallowed options stay visible but disabled, with a `title` explaining which
way to move: *"Daily needs a shorter range"*, *"Quarterly needs a longer
range"*. Hiding them would make the control's shape change as the range moves.

When a new range strands the current granularity, it snaps to the nearest
allowed one rather than resetting:

```ts
export function snapGranularity(current: Granularity, range: DateWindow): Granularity {
  const allowed = allowedGranularities(range);
  if (allowed.includes(current)) return current;
  if (allowed.length === 0) return 'monthly';
  const order = GRANULARITIES.map(({ id }) => id);
  const index = order.indexOf(current);
  return allowed.reduce((best, candidate) => {
    const bestDistance = Math.abs(order.indexOf(best) - index);
    const distance = Math.abs(order.indexOf(candidate) - index);
    // Ties break coarser, which is the safer default for a wider range.
    return distance < bestDistance ? candidate : best;
  }, allowed[allowed.length - 1]);
}
```

Ties break coarser. Widening a range and landing on a denser axis than intended
is the worse failure.

---

## Stacking the bar chart

The `Stack` menu offers `No stacking` plus the five dimensions. Unstacked, one
series is drawn from the `total` field. Stacked, one band per ranked category is
drawn with a shared `stackId`.

Two pieces of state exist for this, and the distinction is important:

- **`stackBy`** — what the user has asked for. The menu follows this
  immediately, so the control never feels laggy.
- **`shownStackBy`** — the dimension the data currently on screen was built
  with, echoed back by the response. The bands follow this.

Because the previous chart stays visible while a new query loads, rendering
bands from `stackBy` would try to read fields the current payload does not have
and draw an empty chart for the duration of the request.

X-axis tick density adapts: `minTickGap` is 28 at daily granularity and 12
otherwise. Bucket labels include the year only when the range spans more than
one calendar year.

---

## Donut breakdown

The `By` menu selects the dimension for the composition donut. Same
`breakdownBy` / `shownBreakdownBy` split as the bar chart, for the same reason.

The centre of the donut shows one of two things:

- **No filter on the breakdown dimension** — the deal count, labelled `deals`.
- **A filter is active on it** — the share of volume those categories cover,
  labelled `of volume`.

```ts
const breakdownValues = selectedValues(filters, shownBreakdownBy);

/**
 * Slice volumes are exact per category, so a selection that takes only part
 * of the folded "Other" slice cannot be priced from them — it would claim the
 * whole bucket, two orders of magnitude out for a single issuer.
 */
const otherPartlySelected =
  breakdownOther.some((value) => breakdownValues.includes(value)) &&
  !breakdownOther.every((value) => breakdownValues.includes(value));

const selectedShare =
  breakdownValues.length === 0 || breakdownTotal === 0 || otherPartlySelected
    ? null
    : (breakdown
        .filter((slice) => isActive(shownBreakdownBy, slice.category, breakdownOther))
        .reduce((sum, slice) => sum + slice.volume, 0) / breakdownTotal) * 100;
```

That turns the donut into a live readout of how much of the market the current
selection represents — and, when it cannot state that honestly, into a deal
count instead. The response carries volumes per slice, not per value, so a
filter on one issuer inside a folded `Other` slice has no share the client can
compute; claiming the bucket's share would be wildly wrong. Withholding is the
same instinct as the granularity gate: show nothing rather than something
misleading. Full reasoning in
[09-donut-chart.md](./09-donut-chart.md#the-centre-readout).

---

## Click to filter

Four surfaces toggle filters directly:

| Click target | Effect |
| --- | --- |
| A donut segment | Toggles that category on the breakdown dimension |
| A donut legend row | Same |
| A bar chart band | Toggles that category on the stack dimension |
| A bar chart legend chip | Same |

Toggling is set membership, not replacement — clicking three sectors selects
three. Clicking an already-selected category removes it.

```ts
export function toggleValues(
  filters: FilterClause[],
  field: ListField,
  values: string[],
): FilterClause[] {
  const clause = findClause(filters, field);
  const current = clause && 'values' in clause ? clause.values : [];
  const allSelected = values.every((value) => current.includes(value));
  const next = allSelected
    ? current.filter((value) => !values.includes(value))
    : [...new Set([...current, ...values])];
  return upsertClause(filters, { field, values: next });
}
```

Clicking the **`Other`** band or slice expands to every value folded into it, so
one click filters on all of them. The response carries that membership list
alongside the slices.

Selection is shown by dimming what is not selected: bands drop to `0.25`,
segments to `0.2`, legend entries to `opacity-40`. Nothing is highlighted, so an
unfiltered chart has no visual state to reset.

A clause that ends up empty is dropped rather than kept as an empty array, which
keeps the chip row honest.

---

## Scope exclusion

**This is the behaviour most likely to be mistaken for a bug.**

Each chart ignores the filter on the dimension it is showing. Click `Financials`
in the donut and the donut still shows every sector — the table and the bar
chart narrow to Financials, but the composition stays whole.

Without it, clicking a segment would leave a donut showing one category at 100%,
which destroys the comparison the user clicked in order to make.

```ts
function scope(query: IssuanceQuery, ignoreField?: FilterField) {
  const term = query.search.trim().toLowerCase();
  return ROWS.filter((row, index) => {
    if (row.pricingDate < query.from || row.pricingDate > query.to) return false;
    if (term && !SEARCH_BLOBS[index].includes(term)) return false;
    return query.filters.every((clause) =>
      clause.field === ignoreField ? true : matchesClause(row, clause),
    );
  });
}
```

Applied per surface:

| Surface | Scope |
| --- | --- |
| Hero stats | All filters |
| Bar chart | All filters except the one on `stackBy`, when stacking |
| Donut | All filters except the one on `breakdownBy` |
| Table | All filters |

The date window and the search term are **never** excluded. Only the clause on
the surface's own dimension is.

When both charts show the same dimension, both exclude it, and the two charts
stay whole together while the table narrows. That is consistent, not a special
case.

---

## Filters

One popover does two jobs: choosing a field, and editing the clause for a field.
Adding a filter and refining one are the same two-step gesture, because a chip
reopens the same popover with the field already chosen.

**Fields**

| Field | Editor |
| --- | --- |
| Issuer, Ticker, Region, Sector, Rating, Currency, Status | Multi-select list |
| Deal size | Numeric min/max |
| Pricing date | Calendar + typed range |

**List editor.** Checkbox rows. A search box appears only when the field has
more than eight options, so short lists are not cluttered by one. Changes apply
immediately — there is no Apply button, because each toggle is already a
complete edit.

**Size editor.** Two numeric inputs, either of which may be left blank for an
open-ended bound. Submitting on Enter works because it is a real `<form>`. Apply
is disabled while both are empty.

**Date editor.** The calendar and typed fields from the custom range, except
only a start is required.

**Chips.** One per clause, describing itself:

```ts
Deal size 500–1500m
Deal size ≥ 500m
Pricing date 3 Feb 26 – 14 Mar 26
Sector Financials          // one value
Sector 4 selected          // several
```

The field list marks fields that already have a clause with a small dot.

At most one clause per field, so a clause is identified by its field alone.
`upsertClause` replaces by field and drops the clause when it becomes empty.

**Clear** removes every clause and the search term at once, and appears only
when there is something to clear.

---

## Search

Free text across issuer, ticker, sector, region, rating, currency, tenor and
status. Debounced 300ms, so typing does not fire a request per keystroke.

The draft lives in the filter bar rather than at the page level. A keystroke
re-renders the input and nothing else until the debounce fires — see
[04-performance.md](./04-performance.md#colocate-transient-state).

Search is never excluded from any surface's scope. Unlike a category filter, it
expresses "show me less of everything", so narrowing the charts is correct.

---

## The table

AG Grid Community with the infinite row model. Rows are fetched in pages of 25
as the user scrolls, sorted and filtered server-side.

| Setting | Value | Reason |
| --- | --- | --- |
| `cacheBlockSize` | 25 | One round trip per block, small enough to stay responsive |
| `maxBlocksInCache` | 12 | Bounds memory on long scrolls; older blocks refetch on return |
| `infiniteInitialRowCount` | 25 | Enough phantom rows that the scrollbar invites scrolling |
| `blockLoadDebounceMillis` | 90 | Skips blocks the user has already scrolled past |
| `rowBuffer` | 4 | Rows rendered beyond the viewport |

**Columns.** Status, Priced, Issuer, Ticker, Region, CCY, Size, Tenor, Rating,
Sector, Spread, NIP, Book, Cover. Status and Issuer are pinned left so identity
survives horizontal scrolling. All columns resize; all sort except Status, whose
three values sort meaninglessly. Column menus are suppressed — filtering belongs
to the filter bar, and two filtering systems in one view is one too many.

Default sort is Priced descending.

**Sorting** goes to the data layer, not the client. The grid holds one page;
sorting client-side would sort 25 rows out of hundreds.

**Selection** is single-row on click, with no checkbox column.

**A new query resets the view.** The datasource is rebuilt, which purges every
cached block, and the grid scrolls back to row zero. Without the purge the table
would mix rows from two different filter states.

```ts
useEffect(() => {
  apiRef.current?.ensureIndexVisible(0, 'top');
}, [query]);
```

**Loading rows shimmer per cell.** The infinite row model renders empty cells
for rows it has not fetched, so a skeleton is injected through a cell renderer
selector, with a width per column so the loading region still reads as a table
rather than a grey slab.

```ts
const loadingAwareRenderer = ({ data }: { data?: IssuanceRecord }) =>
  data ? undefined : { component: LoadingCell };
```

Returning `undefined` leaves loaded rows on the column's own renderer.

---

## Detail panel

Shows the selected record, or the first row of the first page before anything is
selected — so the panel is never empty on arrival.

```ts
const record = pickedRow ?? defaultRow;
```

A new query clears the selection, because the chosen row may no longer be in the
result set. Fetching a further page does not.

Contents: issuer, sector and rating; a status badge; structure, size, coupon and
pricing date; spread, new-issue premium and book cover in a filled well; leads;
and a short execution note derived from the premium.

The panel sticks below the top bar while the table scrolls.

---

## Loading

Two states, and they are treated differently.

**First load** — nothing has arrived yet. Skeletons that mirror the geometry of
what they replace: twelve bars at fixed heights, a masked ring with six legend
rows, a stats strip in the same box as the real one. Because the geometry
matches, the swap to real data moves nothing.

**Refresh** — data is on screen and a newer request is in flight. The existing
content stays, dimmed to `opacity: 0.45` with `saturate(0.55)`, and a small
`Updating` indicator appears beside the section label. Blanking out a chart the
user is reading, to replace it with a chart that says almost the same thing, is
the worse experience.

```ts
export interface AggregatesState {
  data: IssuanceAggregates | null;
  /** No data has ever arrived, so the UI must render skeletons. */
  isFirstLoad: boolean;
  /** Data is on screen but a newer request is in flight. */
  isRefreshing: boolean;
}
```

The refresh indicator is gated so fast responses do not flash it:

```ts
export function useSettledFlag(active: boolean, delayMs = 220, minVisibleMs = 420) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = active
      ? setTimeout(() => setVisible(true), delayMs)
      : setTimeout(() => setVisible(false), minVisibleMs);
    return () => clearTimeout(timer);
  }, [active, delayMs, minVisibleMs]);

  return visible;
}
```

Below 220ms, nothing appears at all. Above it, the indicator stays for at least
420ms so it registers as a state rather than a flicker.

The table has its own version of the same pair: a `Loading` indicator in the
filter bar, a skeleton in place of the row count until the first total arrives,
and per-cell shimmer for unfetched rows.

In-flight requests are aborted when superseded, so a slow early response cannot
overwrite a fast later one.

Every placeholder and indicator is given in full in
[05-loading.md](./05-loading.md).

---

## High-cardinality dimensions

`Sector` has a handful of values. `Issuer` has dozens. Every part of the
composition UI degrades deliberately rather than breaking.

**Band cap.** Categories are ranked by volume and the tail folds into `Other`.
The cap depends on the size of the dimension's universe:

```ts
const COMPACT_BANDS = 5;    // universe of 12 or fewer
const LONG_TAIL_BANDS = 10; // more than 12

function categoryLimit(dimension: Dimension) {
  return categoryUniverse(dimension).length > 12 ? LONG_TAIL_BANDS : COMPACT_BANDS;
}
```

A top five describes a five-region split perfectly and fifty-seven issuers not
at all.

**No fold of one.** If there is exactly one category past the limit it is kept,
because folding it costs a real name and saves nothing:

```ts
const bands = sorted.length <= limit + 1 ? sorted.length : limit;
```

The same `+1` rule governs both legends and the tooltip.

**Tooltip.** A stacked bar with eleven bands would otherwise produce a tooltip
taller than the chart. Instead it:

- drops series that contributed nothing to the hovered bucket (`hideEmpty`);
- ranks the rest by their value at that bucket, not by series order
  (`rankRows`);
- shows the top seven and collapses the remainder into one `N more` row
  carrying their combined total (`maxRows`);
- truncates long names inside a `max-w-[17rem]` box;
- appends the bucket total in a footer.

Ranking per point matters: series order is global, but which categories dominate
varies bucket to bucket, and the tooltip should describe the bucket under the
cursor.

**Legends** show a ranked head — eight chips on the bar, six rows on the donut —
with the tail one click behind an `N more` button. Expanding the donut legend
grows its column rather than scrolling inside a fixed box.

**Colour** comes from an interpolated ramp rather than a fixed token list, so
band count and palette size can never disagree.

---

## Empty states

| Condition | Result |
| --- | --- |
| No deals in the window | Bar chart replaced by *"No issuance in this window"* + Clear filters |
| No categories to break down | Donut replaced by *"Nothing to break down"* + Clear filters |
| No rows | Grid overlay: *"No issuance matches these filters."* |
| No record selected and loading finished | Panel: *"No issuance selected"* |

Both chart empty states offer a way out, since the usual cause is an
over-narrow filter set.

---

## Navigation

**Datasets** — a row of tabs across the top. Only Issuance is populated; the
others render a placeholder with a route back. The navigation exists so the
shape of a multi-domain workspace is visible.

**View mode** — `Dashboards` or `Data`. Dashboards shows charts above the table.
Data hides the charts, leaving the header, filters and table, and widens the
detail panel from 282px to 300px. The query is unaffected, so switching view
does not refetch.

**Display preferences** — optional props: grid density, donut visibility, detail
panel visibility. Supplied by the host, not controlled in-page.

---

## Accessibility

- Every interactive chart element is a real `<button>` with `aria-pressed`.
  Charts are keyboard-reachable, not just clickable.
- Recharts runs with `accessibilityLayer`.
- Segmented controls are `role="group"` with an `aria-label`; each button
  carries `aria-pressed`, and disabled buttons carry a `title` explaining why.
- Dimension menus are Radix radio groups; the popover carries an `aria-label`
  where a visible title would only repeat context.
- Chart columns set `aria-busy` while loading. The refresh indicator is
  `role="status"`.
- Each date segment is a `spinbutton` labelled `"day, START"` and so on, carrying
  `aria-valuemin` and `aria-valuemax`, so the expected format never has to be
  inferred from a placeholder.
- Invalid date input sets `aria-invalid`, and its hint takes `role="alert"`. The
  attribute has to be passed to `DateInput` explicitly — `isInvalid` on the
  `DateField` does not produce it, because React Aria's `Group` only *reads*
  `aria-invalid` in order to derive its own `data-invalid`. Set one and you get
  both; set neither and the field turns red with nothing announced.
- Decorative marks — swatches, dots, chevrons, skeletons — are `aria-hidden`.
  Icon-only controls have `sr-only` labels or an `aria-label`.
- Focus rings are explicit: `focus-visible:ring-2` with `ring-stone-900/15`.
- Every animation is disabled under `prefers-reduced-motion`.
