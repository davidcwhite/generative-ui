# Volume chart

The stacked time series: bucketed gross supply, an optional stack dimension, a
collapsible legend, and a tooltip that survives a dimension with fifty
categories. Everything below is verbatim from a working implementation.

- [Anatomy](#anatomy)
- [Props](#props)
- [Data contract](#data-contract)
- [Building the series](#building-the-series)
- [Ranking the bands](#ranking-the-bands)
- [The component](#the-component)
- [Recharts configuration](#recharts-configuration)
- [The tooltip](#the-tooltip)
- [The legend](#the-legend)
- [The controls above it](#the-controls-above-it)
- [Loading, stale and empty](#loading-stale-and-empty)
- [Wiring it up](#wiring-it-up)
- [Gotchas](#gotchas)
- [Parity checklist](#parity-checklist)

---

## Anatomy

Controls on their own row above the plot, then a fixed-height band holding the
chart and — when stacking is on — the legend, then a caption.

```
┌───────────────────────────────────────────────────────────────┐
│                     Stack sector ▾   Daily Weekly Monthly Qtr │ ← ChartBar, min-h-8
├───────────────────────────────────────────────────────────────┤
│ €80bn ┤              ▓                                        │
│       │        ▓  ▓  ▓     ▓                                  │
│ €40bn ┤     ▓  ▓  ▓  ▓  ▓  ▓  ▓                               │ ← 372px band, fixed
│       │  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓                               │
│  €0bn ┼──────────────────────────────────                     │
│          Aug Sep Oct Nov Dec Jan Feb                          │
│                                                               │
│       ■ Financials  ■ Utilities  ■ Energy  ■ …    3 more      │ ← legend, pl-11
├───────────────────────────────────────────────────────────────┤
│ monthly gross supply, EUR equivalent                          │ ← caption, mt-3
└───────────────────────────────────────────────────────────────┘
```

The band height is shared with the donut and with both chart skeletons, so no
surface moves as data lands:

```ts
/** Both charts and their skeletons occupy this exact height. */
export const CHART_BAND = 372;
```

The bar chart applies it as `height`, not `minHeight` — its legend collapses
rather than growing the column. (The donut is the opposite; see
[01-design-system.md](./01-design-system.md#the-chart-band).)

---

## Props

The component owns no query state. It receives data, two dimension values, three
flags and five callbacks.

| Prop | Type | Purpose |
| --- | --- | --- |
| `series` | `SeriesPoint[]` | One entry per time bucket, oldest first |
| `categories` | `CategorySlice[]` | Stack bands, largest volume first |
| `chartConfig` | `ChartConfig` | Label and colour lookup for the tooltip |
| `stackBy` | `Dimension \| null` | What the user asked for — the menu follows this |
| `shownStackBy` | `Dimension \| null` | What the data was built with — the bands follow this |
| `granularity` | `Granularity` | Bucket size, also drives tick density and the caption |
| `dateWindow` | `DateWindow` | Only to gate the granularity tabs |
| `isFirstLoad` | `boolean` | Nothing has ever arrived → skeleton |
| `isRefreshing` | `boolean` | Data on screen, newer request in flight → dim |
| `isEmpty` | `boolean` | Window has no deals → empty band |
| `activeOf` | `(category) => boolean \| null` | `null` when no filter exists on the dimension |
| `onToggle` | `(category) => void` | Band and chip clicks |
| `onStackByChange` | `(Dimension \| null) => void` | — |
| `onGranularityChange` | `(Granularity) => void` | — |
| `onClear` | `() => void` | Escape hatch from the empty state |

Two module constants tune the density:

```ts
/** Rows a tooltip lists before the tail collapses into one line. */
const TOOLTIP_ROWS = 7;

/** Chips the legend shows before it offers to expand. */
const STACK_CHIPS = 8;
```

---

## Data contract

A point is a flat object: the bucket's identity, its totals, and one numeric
field per stack category. Recharts reads stacked series off sibling fields of
the same row, which is why the categories are spread onto the point rather than
nested.

```ts
export interface SeriesPoint {
  key: string;
  label: string;
  labelLong: string;
  total: number;
  deals: number;
  /** One entry per stack category; absent categories are zero-filled. */
  [category: string]: string | number;
}

export interface CategorySlice {
  category: string;
  volume: number;
  deals: number;
  fill: string;
}
```

- `label` is the axis tick (`Sep`, `Sep 24`, `12 Aug`, `Q3`).
- `labelLong` is the tooltip heading (`September 2024`, `Week of 12 Aug 2024`).
- `total` is every deal in the bucket, in billions, and is the `dataKey` when
  stacking is off.
- **Zero-filling is mandatory.** A category missing from a point makes Recharts
  break the stack at that bucket instead of drawing nothing.

Volumes are billions throughout — the source records carry `eurEquivalent` in
millions and every aggregation divides by 1000. Keep that in one place; a chart
that mixes units is hard to spot because the shape stays plausible.

---

## Building the series

Bucketing runs in three steps: derive every bucket key in the window including
empty ones, seed a point per key, then fold rows in.

```ts
function bucketKeyOf(iso: string, granularity: Granularity) {
  if (granularity === 'daily') return iso;
  if (granularity === 'weekly') return startOfWeek(iso);
  if (granularity === 'monthly') return iso.slice(0, 7);
  const month = Number(iso.slice(5, 7));
  return `${iso.slice(0, 4)}-Q${Math.floor((month - 1) / 3) + 1}`;
}
```

Keys are ISO-prefixed strings, so they sort lexicographically and compare
without parsing. Dates are handled as ISO strings in UTC throughout — a local
`Date` puts a bucket in the wrong month for anyone east or west of the server.

`bucketKeysBetween(from, to, granularity)` returns every key in the window,
oldest first, skipping weekends at daily granularity. Seeding from that list
rather than from the rows is what makes a quiet week render as a gap in the
series instead of vanishing from the axis.

```ts
export function buildSeries(
  rows: IssuanceRecord[],
  from: string,
  to: string,
  granularity: Granularity,
  categories: CategorySlice[] | null,
  otherValues: string[],
  dimension: Dimension | null,
): SeriesPoint[] {
  const keys = bucketKeysBetween(from, to, granularity);
  const multiYear = from.slice(0, 4) !== to.slice(0, 4);
  const otherSet = new Set(otherValues);

  const points = new Map<string, SeriesPoint>(
    keys.map((key) => {
      const point: SeriesPoint = {
        key,
        label: bucketLabel(key, granularity, multiYear),
        labelLong: bucketLabelLong(key, granularity),
        total: 0,
        deals: 0,
      };
      categories?.forEach((category) => {
        point[category.category] = 0;
      });
      return [key, point];
    }),
  );

  rows.forEach((row) => {
    const point = points.get(bucketKeyOf(row.pricingDate, granularity));
    if (!point) return;
    const volume = row.eurEquivalent / 1000;
    point.total = (point.total as number) + volume;
    point.deals = (point.deals as number) + 1;
    if (!categories || !dimension) return;
    const raw = row[dimension];
    const category = otherSet.has(raw) ? OTHER_CATEGORY : raw;
    if (typeof point[category] === 'number') {
      point[category] = (point[category] as number) + volume;
    }
  });

  return [...points.values()].map((point) => {
    const rounded: SeriesPoint = { ...point, total: Number((point.total as number).toFixed(2)) };
    categories?.forEach((category) => {
      rounded[category.category] = Number((point[category.category] as number).toFixed(2));
    });
    return rounded;
  });
}
```

Three details that matter:

- **Rounding happens once, at the end.** Rounding each addition accumulates
  error until a stack's bands no longer sum to its own total.
- **`otherSet` folds the tail in during the fold**, so a row belonging to a
  folded category lands on the `Other` band rather than creating a field no band
  reads.
- **The `typeof` guard** drops anything that is not a seeded category, which is
  what keeps a stale `otherValues` list from writing a stray field.

Labels carry the year only when the window spans more than one:

```ts
function bucketLabel(key: string, granularity: Granularity, multiYear: boolean) {
  if (granularity === 'quarterly') {
    return multiYear ? `${key.slice(5)} ${key.slice(2, 4)}` : key.slice(5);
  }
  if (granularity === 'monthly') {
    const month = MONTH_NAMES[Number(key.slice(5, 7)) - 1];
    return multiYear ? `${month} ${key.slice(2, 4)}` : month;
  }
  const day = Number(key.slice(8, 10));
  const month = MONTH_NAMES[Number(key.slice(5, 7)) - 1];
  return `${day} ${month}`;
}
```

`labelLong` follows the same shape, spelling the year out and prefixing weekly
buckets with `Week of`. It formats through a single module-level
`Intl.DateTimeFormat` (`en-GB`, `timeZone: 'UTC'`) rather than one per point —
constructing a formatter is expensive and this runs once per bucket per query.

---

## Ranking the bands

Bands are ranked by volume and the tail folds into `Other`, so the band count
can never exceed what the colour ramp can distinguish.

```ts
export function rankCategories(rows: IssuanceRecord[], dimension: Dimension): CategorySlice[] {
  const totals = new Map<string, { volume: number; deals: number }>();
  rows.forEach((row) => {
    const key = row[dimension];
    const current = totals.get(key) ?? { volume: 0, deals: 0 };
    current.volume += row.eurEquivalent / 1000;
    current.deals += 1;
    totals.set(key, current);
  });

  const sorted = [...totals.entries()]
    .map(([category, value]) => ({
      category,
      volume: Number(value.volume.toFixed(1)),
      deals: value.deals,
    }))
    .sort((a, b) => b.volume - a.volume);

  // Folding a single leftover costs a name and saves nothing, so it stays out.
  const limit = categoryLimit(dimension);
  const bands = sorted.length <= limit + 1 ? sorted.length : limit;

  const leading = sorted.slice(0, bands).map((item, index) => ({
    ...item,
    fill: rampColor(index, bands),
  }));
  const remaining = sorted.slice(bands);
  if (remaining.length === 0) return leading;

  return [
    ...leading,
    {
      category: OTHER_CATEGORY,
      volume: Number(remaining.reduce((sum, item) => sum + item.volume, 0).toFixed(1)),
      deals: remaining.reduce((sum, item) => sum + item.deals, 0),
      fill: OTHER_COLOR,
    },
  ];
}
```

The cap depends on how large the dimension's universe is — a top five describes
a five-region split perfectly and fifty-seven issuers not at all:

```ts
const COMPACT_BANDS = 5;    // universe of 12 or fewer
const LONG_TAIL_BANDS = 10; // more than 12

function categoryLimit(dimension: Dimension) {
  return categoryUniverse(dimension).length > 12 ? LONG_TAIL_BANDS : COMPACT_BANDS;
}
```

Colour is interpolated rather than drawn from a token list, so band count and
palette size can never disagree. Rank order is colour order, which is why a
stack always reads darkest at the bottom:

```ts
const RAMP_START = { l: 0.52, c: 0.17, h: 258 };
const RAMP_END = { l: 0.87, c: 0.045, h: 240 };
const OTHER_COLOR = '#e7e5e4';
export const OTHER_CATEGORY = 'Other';

function rampColor(index: number, count: number) {
  const t = count <= 1 ? 0 : index / (count - 1);
  const mix = (from: number, to: number) => from + (to - from) * t;
  return `oklch(${mix(RAMP_START.l, RAMP_END.l).toFixed(3)} ${mix(
    RAMP_START.c,
    RAMP_END.c,
  ).toFixed(3)} ${mix(RAMP_START.h, RAMP_END.h).toFixed(1)})`;
}
```

`Other` is deliberately outside the ramp: a warm stone grey, so a residual reads
as a residual and not as one more category.

Whatever the tail folded in has to travel with the slices, or clicking the band
cannot filter on it:

```ts
/** Values folded into the "Other" slice, so clicking it can filter on them. */
export function otherMembers(slices: CategorySlice[], universe: string[]) {
  if (!slices.some((slice) => slice.category === OTHER_CATEGORY)) return [];
  const leading = new Set(slices.map((slice) => slice.category));
  return universe.filter((value) => !leading.has(value));
}
```

---

## The component

Three branches inside one fixed-height band, then the caption.

```tsx
export function VolumeChart({ /* …props… */ }) {
  return (
    <>
      <ChartBar>
        <StackByMenu value={stackBy} onChange={onStackByChange} />
        <GranularityTabs value={granularity} range={dateWindow} onChange={onGranularityChange} />
      </ChartBar>

      {/* Fixed band height keeps the skeleton and the chart the same size. */}
      <div className={`mt-5 ${isRefreshing ? 'dash-stale' : ''}`} style={{ height: CHART_BAND }}>
        {isFirstLoad ? (
          <BarChartSkeleton />
        ) : isEmpty ? (
          <EmptyBand message="No issuance in this window" onClear={onClear} />
        ) : (
          <div className="flex h-full flex-col">
            <ChartContainer config={chartConfig} className="min-h-0 w-full flex-1">
              <BarChart /* … */>{/* axes, tooltip, bars */}</BarChart>
            </ChartContainer>

            {shownStackBy && (
              <StackLegend
                key={shownStackBy}
                categories={categories}
                activeOf={activeOf}
                onToggle={onToggle}
              />
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-stone-400">
        {granularity} gross supply, EUR equivalent
      </p>
    </>
  );
}
```

**`min-h-0` on the `ChartContainer` is load-bearing.** It is a flex child of a
fixed-height column that also holds the legend; without a zero minimum it
refuses to shrink below its intrinsic height and the legend is pushed out of the
band.

**`key={shownStackBy}` on the legend** remounts it when the dimension changes,
which resets its expanded state. Switching from Sector to Issuer with the legend
expanded would otherwise land the user in a fifty-chip block.

The caption reads off `granularity` directly, so the words track the tabs
(`monthly gross supply`, `daily gross supply`) with no extra state.

---

## Recharts configuration

```tsx
<BarChart accessibilityLayer data={series} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
  <CartesianGrid vertical={false} stroke="#F1F0EE" />
  <XAxis
    dataKey="label"
    tickLine={false}
    axisLine={false}
    tickMargin={12}
    interval="preserveStartEnd"
    minTickGap={granularity === 'daily' ? 28 : 12}
  />
  <YAxis
    tickLine={false}
    axisLine={false}
    width={52}
    tickFormatter={(value) => `€${value}bn`}
  />
  <ChartTooltip cursor={{ fill: 'rgba(120,113,108,0.07)' }} content={/* see below */} />
  {/* bars */}
</BarChart>
```

- **`accessibilityLayer`** gives keyboard traversal of the buckets and announces
  values. One prop; there is no reason to omit it.
- **`vertical={false}` with `stroke="#F1F0EE"`** leaves horizontal hairlines that
  are almost invisible. Vertical gridlines in a bar chart duplicate information
  the bars already carry.
- **`margin.left: -8` against `width={52}`** reclaims the gutter Recharts
  reserves for the y-axis, leaving 44px of effective indent. That number is
  fixed in three places — here, the skeleton's `w-11` axis column, and the
  legend's `pl-11`. Change one and the bars shift sideways as data lands.
- **`interval="preserveStartEnd"` with `minTickGap`** thins ticks under
  pressure while keeping the first and last bucket labelled, which are the two
  the eye looks for. Daily buckets need the wider gap because their labels are
  longer (`12 Aug` versus `Aug`).
- **`cursor={{ fill: 'rgba(120,113,108,0.07)' }}`** is a warm 7% wash. The
  default is a hard grey block that competes with the bars.

Stacked and unstacked are two branches, not one parameterised `Bar`:

```tsx
{shownStackBy ? (
  categories.map((item, index) => (
    <Bar
      key={item.category}
      dataKey={item.category}
      stackId="volume"
      fill={item.fill}
      maxBarSize={40}
      animationDuration={450}
      radius={index === categories.length - 1 ? [3, 3, 0, 0] : 0}
      className="cursor-pointer"
      opacity={activeOf(item.category) === false ? 0.25 : 1}
      onClick={() => onToggle(item.category)}
    />
  ))
) : (
  <Bar
    dataKey="total"
    name="total"
    fill="var(--chart-1)"
    radius={[4, 4, 0, 0]}
    maxBarSize={40}
    animationDuration={450}
  />
)}
```

- **Only the topmost band rounds.** Rounding every band leaves visible notches
  where they meet, so a stack reads as a broken column. The unstacked bar takes
  the fuller `[4,4,0,0]`.
- **`maxBarSize={40}`** stops six buckets from rendering as slabs.
- **Selection dims rather than highlights** — deselected bands drop to `0.25`.
  An unfiltered chart therefore has no visual state to reset.
- **`activeOf` returns `boolean | null`**, and only an explicit `false` dims. A
  `null` means no filter exists on this dimension, which is not the same as "not
  selected".
- **`stackId` is a literal string.** Every band must share it; a per-category id
  silently produces overlapping single-band stacks.

Bars are clickable through `onClick` on the `Bar`, not on individual cells,
because a band's whole column carries the same category.

---

## The tooltip

A stacked bar can hold eleven bands, and a naive tooltip lists all of them —
taller than the chart, mostly zeros, in an arbitrary order. Four options fix
that:

```tsx
<ChartTooltip
  cursor={{ fill: 'rgba(120,113,108,0.07)' }}
  content={
    <ChartTooltipContent
      labelFormatter={(_, payload) => String(payload?.[0]?.payload?.labelLong ?? '')}
      valueFormatter={(value) => formatBn(Number(value))}
      /* A long-tail dimension can put a dozen bands in
         one bar, so the tooltip stays a fixed size. */
      maxRows={TOOLTIP_ROWS}
      hideEmpty
      rankRows={Boolean(shownStackBy)}
      emptyLabel="No issuance"
      footer={
        shownStackBy
          ? (payload) => (
              <div className="flex items-center justify-between gap-4 text-foreground">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-medium tabular-nums">
                  {formatBn(Number(payload[0]?.payload?.total ?? 0))}
                </span>
              </div>
            )
          : undefined
      }
    />
  }
/>
```

| Option | Effect |
| --- | --- |
| `hideEmpty` | Drops series that contributed nothing to the hovered bucket |
| `rankRows` | Orders by value **at this bucket**, not by series order |
| `maxRows={7}` | Shows the top seven, collapses the rest into one `N more` row carrying their combined total |
| `footer` | Appends the bucket total, so the parts have something to sum to |
| `labelFormatter` | Swaps the terse axis label for `labelLong` |
| `emptyLabel` | What an all-zero bucket says instead of rendering an empty box |

`rankRows` is only enabled when stacking, since a single series has nothing to
rank. Ranking per point matters: series order is global, but which categories
dominate varies bucket to bucket, and the tooltip should describe the bucket
under the cursor.

**None of these options exist in the stock shadcn chart wrapper.** The full
source of the patched `ChartTooltipContent` is in
[01-design-system.md](./01-design-system.md#chart-wrapper); the parts this chart
depends on are the collapse rule and the label lookup:

```tsx
const present = hideEmpty ? rows.filter((row) => row.numeric !== 0) : rows;
const ordered = rankRows ? [...present].sort((a, b) => b.numeric - a.numeric) : present;

// Collapsing a single row would trade it for a line that says less.
const collapse = maxRows !== undefined && ordered.length > maxRows + 1;
const shown = collapse ? ordered.slice(0, maxRows) : ordered;
const rest = collapse ? ordered.slice(maxRows) : [];
const restTotal = rest.reduce((sum, row) => sum + row.numeric, 0);
```

The same `limit + 1` rule governs the band cap and both legends: never fold a
single item, because it costs a real name and saves nothing.

Long category names are truncated inside a `max-w-[17rem]` box rather than
allowed to widen it, and values are `font-mono tabular-nums` so the column of
figures stays aligned.

Labels and swatch colours come from `chartConfig`, which the parent builds from
the two category lists:

```ts
const chartConfig = useMemo<ChartConfig>(
  () =>
    Object.fromEntries([
      ['total', { label: 'Volume', color: 'var(--chart-1)' }],
      ...categories.map((item) => [item.category, { label: item.category, color: item.fill }]),
      ...breakdown.map((item) => [item.category, { label: item.category, color: item.fill }]),
    ]),
  [categories, breakdown],
);
```

Values are formatted once, in one place:

```ts
/** Billions in, the tidiest unit out. */
export function formatBn(value: number) {
  return value >= 1000 ? `€${(value / 1000).toFixed(2)}tn` : `€${value.toFixed(1)}bn`;
}
```

---

## The legend

Chips under the plot, ranked, with the tail one click away.

```tsx
function StackLegend({
  categories,
  activeOf,
  onToggle,
}: {
  categories: CategorySlice[];
  activeOf: (category: string) => boolean | null;
  onToggle: (category: string) => void;
}) {
  const { shown, hidden, collapsible, expanded, toggle } = useCollapsed(categories, STACK_CHIPS);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-11">
      {shown.map((item) => {
        const active = activeOf(item.category);
        return (
          <button
            key={item.category}
            type="button"
            onClick={() => onToggle(item.category)}
            aria-pressed={active === true}
            className={`flex min-w-0 items-center gap-1.5 rounded text-[11px] transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 ${
              active === false ? 'opacity-40' : ''
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.fill }}
              aria-hidden
            />
            <span className="max-w-[160px] truncate text-stone-600">{item.category}</span>
          </button>
        );
      })}
      {collapsible && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="rounded text-[11px] text-stone-400 transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          {expanded ? 'Show fewer' : `${hidden} more`}
        </button>
      )}
    </div>
  );
}
```

The collapse rule is shared with the donut legend:

```ts
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
```

Notes:

- **`pl-11` aligns the chips with the plot area**, clearing the same 44px the
  y-axis occupies. Chips flush to the container read as belonging to the page
  rather than to the chart.
- **Chips are real `<button>`s with `aria-pressed`**, not decorated `div`s. They
  toggle filters, so they must be reachable and announceable.
- **`max-w-[160px] truncate`** caps a long issuer name. Without it one chip can
  claim an entire row.
- **`aria-pressed={active === true}`** — a `null` is not pressed, and coercing it
  would announce every chip as unpressed even with no filter applied.

---

## The controls above it

Both live in `ChartBar`, which reserves `min-h-8` so this chart and the donut
start on the same baseline even though only one bar carries a label.

**Stack menu.** A ghost trigger that reads as a caption until hovered, with a
radio group so the current dimension is visible without opening it:

```tsx
export function StackByMenu({ value, onChange }: {
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
```

The trigger splits into a grey noun and a darker value (`Stack` · `sector`), so
the setting is legible at a glance and the label does not shout. Radix radio
groups need a non-empty string for "off", hence the `'none'` sentinel.
`aria-label` on the content carries the context that no visible title provides —
there is deliberately no title inside the menu, because the trigger already says
what it does. `MenuTrigger` is shared with the donut's `By` menu; its source is in
[01-design-system.md](./01-design-system.md#dimension-menu-trigger).

**Granularity tabs**, gated by the current window so the axis never collapses
into a thicket of hairlines or a lone pair of bars:

```tsx
export function GranularityTabs({ value, range, onChange }: {
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
```

`Segmented` and `SegmentedButton` are the shared pill primitives — a
`bg-stone-100` track with a white raised thumb on the active item; source in
[01-design-system.md](./01-design-system.md#segmented-control).

Disabled tabs stay visible and explain themselves on hover — *"Daily needs a
shorter range"* — because hiding them would make the control change shape as the
window moves. The gate itself:

```ts
const LIMITS: Record<Granularity, { minDays: number; maxDays: number }> = {
  daily: { minDays: 1, maxDays: 95 },
  weekly: { minDays: 14, maxDays: 560 },
  monthly: { minDays: 45, maxDays: 2200 },
  quarterly: { minDays: 180, maxDays: Number.POSITIVE_INFINITY },
};
```

The parent snaps a stranded granularity to the nearest allowed one when the
window changes; see [02-functional-spec.md](./02-functional-spec.md#time-granularity).

---

## Loading, stale and empty

Three states share the band, and none of them changes its height.

**First load** — the skeleton, at `h-full` inside the 372px band. Twelve
hard-coded bar heights, a five-tick axis column at `w-11`, and a row of tick
stubs. Heights are fixed rather than random because a reshuffling series draws
the eye to motion that means nothing. Full source in
[05-loading.md](./05-loading.md#bar-chart-skeleton).

**Refresh** — data stays on screen and dims. Nothing is unmounted, so the user
never loses the figure they were reading:

```css
/* Data is still readable while the next response lands. */
.dash-stale {
  opacity: 0.45;
  filter: saturate(0.55);
  transition: opacity 180ms ease, filter 180ms ease;
}
```

The flag driving it is gated by `useSettledFlag` — 220ms before the dim appears,
420ms minimum once it has — so a fast response never flashes. Source in
[02-functional-spec.md](./02-functional-spec.md#loading).

**Empty** — a filter set with no deals in it. The usual cause is over-narrowing,
so the state offers the way out:

```tsx
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
```

The wrapping column also carries `aria-busy={isFirstLoad || isRefreshing}`, which
is what tells assistive technology the region is mid-update.

---

## Wiring it up

The parent owns the query and passes the response straight through. Two pairs of
values do the work:

```tsx
const { data: aggregates, isFirstLoad, isRefreshing } = useIssuanceAggregates(query);
const showRefreshing = useSettledFlag(isRefreshing);

const categories = aggregates?.categories ?? NO_SLICES;
// The payload's own dimensions, so a chart never renders bands it lacks data for.
const shownStackBy = aggregates?.stackBy ?? null;
const stackOther = aggregates?.stackOther ?? NO_VALUES;

<VolumeChart
  series={aggregates?.series ?? NO_SERIES}
  categories={categories}
  stackBy={stackBy}              // menu state
  shownStackBy={shownStackBy}    // response echo
  isRefreshing={showRefreshing}  // gated flag, not raw isRefreshing
  isEmpty={stats?.dealCount === 0}
  activeOf={(category) => isActive(shownStackBy, category, stackOther)}
  onToggle={(category) => toggleCategory(shownStackBy, category, stackOther)}
  /* …chartConfig, granularity, dateWindow, isFirstLoad, and the three
     remaining callbacks pass straight through… */
/>;
```

**`stackBy` versus `shownStackBy`.** The menu follows the request so it never
feels laggy; the bands follow the response. Since the previous chart stays
mounted while a new query loads, rendering bands from `stackBy` would read
fields the current payload does not have and draw an empty chart for the length
of the request. The response echoes its own dimension back for exactly this
reason:

```ts
export interface IssuanceAggregates {
  /**
   * Echoed back so the charts render the dimensions the data was built for.
   * While a new query is in flight the previous payload stays on screen, and
   * reading these off component state instead would draw empty bands.
   */
  stackBy: Dimension | null;
  series: SeriesPoint[];
  /** Stack bands, largest first. A single "Volume" band when stacking is off. */
  categories: CategorySlice[];
  stackOther: string[];
  // …
}
```

**Shared empty arrays.** A fresh `[]` per render is a new reference and defeats
every downstream memo:

```ts
/** Shared placeholders: a fresh literal per render would defeat the memos. */
const NO_SERIES: SeriesPoint[] = [];
const NO_SLICES: CategorySlice[] = [];
const NO_VALUES: string[] = [];
```

**Clicks resolve `Other` back to its members** before touching the filters:

```ts
/** Chart clicks resolve "Other" back to the values it folds in. */
const toggleCategory = (dimension: Dimension | null, category: string, other: string[]) => {
  if (!dimension) return;
  setFilters((current) =>
    toggleValues(current, dimension, category === OTHER_CATEGORY ? other : [category]),
  );
};

const isActive = (dimension: Dimension | null, category: string, other: string[]) => {
  const values = dimension ? selectedValues(filters, dimension) : NO_VALUES;
  if (values.length === 0) return null;
  return category === OTHER_CATEGORY
    ? other.some((value) => values.includes(value))
    : values.includes(category);
};
```

Both take `Dimension | null` and no-op on null, so callers pass `shownStackBy`
without asserting it is present.

**Scope exclusion.** The chart's own query drops the filter on the dimension it
is stacking by, so clicking a band narrows the table while the composition stays
whole:

```ts
const stackRows = query.stackBy ? scope(query, query.stackBy) : filtered;
```

This is the behaviour most often mistaken for a bug — click `Financials` and the
bar chart still shows every sector. The reasoning and the per-surface table are
in [02-functional-spec.md](./02-functional-spec.md#scope-exclusion).

---

## Gotchas

- **Zero-fill every category on every point.** A missing field breaks the stack
  at that bucket rather than drawing zero.
- **Seed points from the bucket key list, not from the rows**, or quiet weeks
  disappear from the axis instead of showing as gaps.
- **Render bands from the response's dimension, never from the menu's.** The
  mismatch only shows during a request, so it survives casual testing and then
  looks like a flicker in production.
- **Round once, at the end.** Per-addition rounding leaves the bands not summing
  to the tooltip's footer total.
- **`min-h-0` on the `ChartContainer`.** Flex children default to their
  intrinsic minimum, so without it the legend is pushed out of the fixed band.
- **Round only the top band of a stack.** Rounding all of them notches the
  column at every boundary.
- **One literal `stackId` for every band.** Distinct ids produce overlapping
  single-band stacks that look like a data error.
- **Keep `activeOf` three-valued.** Collapsing `null` into `false` dims the whole
  chart whenever no filter is applied.
- **Key the legend by the dimension**, or its expanded state survives a switch
  from a five-value dimension to a fifty-value one.
- **44px appears three times** — `width={52}` less `margin.left: -8`, the
  skeleton's `w-11`, the legend's `pl-11`. They move together or not at all.
- **Do not import a stock `ChartTooltipContent`.** Four of the props used here
  do not exist upstream, and they are what keeps a long-tail tooltip usable.

---

## Parity checklist

- [ ] `CHART_BAND` 372px, applied as `height`; skeleton and chart the same size
- [ ] Controls in a `min-h-8` bar above the plot, chart at `mt-5`, caption at `mt-3`
- [ ] Horizontal gridlines only, `#F1F0EE`; no axis lines, no tick lines
- [ ] `width={52}` on the y-axis with `margin.left: -8`; `€{n}bn` ticks
- [ ] `minTickGap` 28 daily / 12 otherwise, `interval="preserveStartEnd"`
- [ ] Year in bucket labels only when the window spans more than one
- [ ] `maxBarSize={40}`, `animationDuration={450}`, warm 7% hover cursor
- [ ] `[4,4,0,0]` unstacked; `[3,3,0,0]` on the top band only when stacked
- [ ] Bands ranked by volume, tail folded into a stone-grey `Other`, never a fold of one
- [ ] Band cap 5 or 10 by universe size; colours from the interpolated ramp
- [ ] Tooltip: `labelLong` heading, `hideEmpty`, `rankRows` when stacked, 7 rows then `N more`, total footer
- [ ] Legend: 8 chips, `pl-11`, `aria-pressed`, truncation at 160px, `N more` toggle, keyed by dimension
- [ ] Deselected bands `0.25`, chips `opacity-40`; nothing highlighted when unfiltered
- [ ] Skeleton on first load, `.dash-stale` on refresh, empty band with a Clear filters action
- [ ] `aria-busy` on the wrapping column while loading or refreshing
- [ ] Stack menu reads `Stack off` / `Stack sector`; granularity tabs disabled with a hint, not hidden
