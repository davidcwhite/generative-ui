# Donut chart

The composition ring: volume split by one dimension, a ranked legend with
percentages, and a centre readout that changes meaning with the filter state.
Everything below is verbatim from a working implementation.

- [Anatomy](#anatomy)
- [Props](#props)
- [Data contract](#data-contract)
- [The component](#the-component)
- [Recharts configuration](#recharts-configuration)
- [The centre readout](#the-centre-readout)
- [The tooltip](#the-tooltip)
- [The legend](#the-legend)
- [The control above it](#the-control-above-it)
- [Loading, stale and empty](#loading-stale-and-empty)
- [The animation](#the-animation)
- [Wiring it up](#wiring-it-up)
- [How it differs from the bar chart](#how-it-differs-from-the-bar-chart)
- [Gotchas](#gotchas)
- [Parity checklist](#parity-checklist)

---

## Anatomy

A labelled control row, then a ring with a figure in the hole beside a legend
that carries the percentages.

```
┌──────────────────────────────────────────┐
│ SECTOR MIX                    By sector ▾│ ← ChartBar with a label
├──────────────────────────────────────────┤
│           ▄▀▀▀▀▀▀▄                       │
│         ▐          ▌   ■ Financials  18% │ ← legend rows, ranked
│        ▐    842     ▌  ■ Automobiles 13% │
│        ▐   deals    ▌  ■ Consumer    13% │ ← centre: count or share
│         ▐          ▌   ■ Telecoms    11% │
│           ▀▄▄▄▄▄▄▀     ■ Utilities   11% │
│                        ■ Other       34% │ ← folded tail
│         184px box                        │
└──────────────────────────────────────────┘
```

That is a real state, and it has no `N more` row on purpose. A compact dimension
yields five bands plus `Other`, and six items never collapse against a limit of
six (the rule is `> limit + 1`). Only the long-tail dimensions — rating and
issuer, which get ten bands plus `Other` — ever show the expander.

Two columns at `sm`, one at `xl` — at full width the donut lives in the narrow
right-hand column, so the legend goes back underneath it:

```
grid content-center gap-4 sm:grid-cols-[minmax(180px,0.8fr)_1fr] xl:grid-cols-1
```

The band height is shared with the bar chart, but applied differently:

```tsx
{/* Min height, not height: expanding the legend grows the
    column rather than hiding rows behind a scrollbar. */}
<div
  className={`mt-5 flex flex-col justify-center ${isRefreshing ? 'dash-stale' : ''}`}
  style={{ minHeight: CHART_BAND }}
>
```

`minHeight` is the whole reason the legend can expand. With `height` the extra
rows are clipped by the band; measured, the column grows from 412px to 564px when
an eleven-row issuer legend is expanded, pushing the table down instead of hiding
anything.

---

## Props

| Prop | Type | Purpose |
| --- | --- | --- |
| `slices` | `CategorySlice[]` | Ranked segments, largest first, `Other` last |
| `total` | `number` | Denominator for the legend percentages |
| `chartConfig` | `ChartConfig` | Label and colour lookup for the tooltip |
| `breakdownBy` | `Dimension` | What the user asked for — the menu follows this |
| `shownBreakdownBy` | `Dimension` | What the data was built with — the ring and the title follow this |
| `dealCount` | `number` | Centre figure when no filter is set on the dimension |
| `selectedShare` | `number \| null` | Centre figure when one is, or `null` when it cannot be stated |
| `isFirstLoad` | `boolean` | Nothing has ever arrived → skeleton |
| `isRefreshing` | `boolean` | Data on screen, newer request in flight → dim |
| `activeOf` | `(category) => boolean \| null` | `null` when no filter exists on the dimension |
| `onToggle` | `(category) => void` | Segment and legend-row clicks |
| `onBreakdownByChange` | `(Dimension) => void` | — |
| `onClear` | `() => void` | Escape hatch from the empty state |

One module constant:

```ts
/** Legend entries the donut shows before it offers to expand. */
const LEGEND_ROWS = 6;
```

There is no `isEmpty` prop. The donut derives its own empty state from
`slices.length === 0`, which is not the same question the bar chart asks — see
[How it differs](#how-it-differs-from-the-bar-chart).

---

## Data contract

The donut consumes the same slice type as the bar chart's bands, so both are fed
by one ranking function:

```ts
export interface CategorySlice {
  category: string;
  volume: number;
  deals: number;
  fill: string;
}
```

Ranking, the band cap, the interpolated colour ramp and the `Other` fold are all
shared with the volume chart and documented once, in
[08-volume-chart.md](./08-volume-chart.md#ranking-the-bands). The donut adds
nothing to the pipeline; it renders `aggregates.breakdown` exactly as it arrives,
in order.

Two things travel alongside the slices and both matter here:

```ts
breakdown: CategorySlice[];
breakdownOther: string[];   // the values folded into "Other"
breakdownTotal: number;     // sum of the slice volumes, including "Other"
```

`breakdownTotal` is computed once on the response rather than in the component:

```ts
breakdownTotal: breakdown.reduce((sum, slice) => sum + slice.volume, 0),
```

Summing the slices rather than the rows keeps the legend's percentages internally
consistent: they add to 100 because the denominator is the same rounded figures
the numerators come from.

---

## The component

```tsx
export function MixDonut({ /* …props… */ }) {
  return (
    <>
      <ChartBar label={`${DIMENSION_LABELS[shownBreakdownBy]} mix`}>
        <BreakdownMenu value={breakdownBy} onChange={onBreakdownByChange} />
      </ChartBar>

      <div
        className={`mt-5 flex flex-col justify-center ${isRefreshing ? 'dash-stale' : ''}`}
        style={{ minHeight: CHART_BAND }}
      >
        {isFirstLoad ? (
          <DonutChartSkeleton />
        ) : slices.length === 0 ? (
          <EmptyBand message="Nothing to break down" onClear={onClear} />
        ) : (
          <div className="grid content-center gap-4 sm:grid-cols-[minmax(180px,0.8fr)_1fr] xl:grid-cols-1">
            <div className="relative mx-auto h-[184px] w-full max-w-[230px]">
              {/* ring + centre overlay */}
            </div>

            <BreakdownLegend
              key={shownBreakdownBy}
              slices={slices}
              total={total}
              activeOf={activeOf}
              onToggle={onToggle}
            />
          </div>
        )}
      </div>
    </>
  );
}
```

**The title reads off `shownBreakdownBy`, the menu off `breakdownBy`.** That is
the same split the bar chart makes, applied to a heading: `Sector mix` must not
say `Issuer mix` while the ring is still showing sectors. The menu is the one
thing allowed to move instantly, because it represents the request.

**`key={shownBreakdownBy}` on the legend** resets its expanded state when the
dimension changes, so switching from Sector to Issuer does not land the user in
an expanded fifty-row block.

**The ring box is `relative` with a fixed `h-[184px]` and `max-w-[230px]`.** The
height is fixed because the ring does not scale with the column, and `relative`
is what the centre overlay positions against.

---

## Recharts configuration

```tsx
<ChartContainer config={chartConfig} className="h-full w-full">
  <PieChart accessibilityLayer>
    <ChartTooltip
      content={
        <ChartTooltipContent
          hideLabel
          nameKey="category"
          valueFormatter={(value) => formatBn(Number(value))}
        />
      }
    />
    <Pie
      data={slices}
      dataKey="volume"
      nameKey="category"
      innerRadius={62}
      outerRadius={82}
      paddingAngle={2}
      strokeWidth={0}
      animationDuration={450}
      isAnimationActive
    >
      {slices.map((slice) => (
        <Cell
          key={slice.category}
          fill={slice.fill}
          opacity={activeOf(slice.category) === false ? 0.2 : 1}
          className="cursor-pointer transition-opacity"
          onClick={() => onToggle(slice.category)}
        />
      ))}
    </Pie>
  </PieChart>
</ChartContainer>
```

- **A 20px ring**: `innerRadius={62}`, `outerRadius={82}`. Thin enough to read as
  a composition rather than a pie, wide enough to click.
- **`strokeWidth={0}` is not optional.** Recharts' default stroke paints a white
  outline on every sector which, on top of `paddingAngle`, reads as a second gap
  and makes the ring look broken.
- **`paddingAngle={2}`** separates the segments without a stroke.
- **`nameKey="category"` appears twice** — on the `Pie` and on the tooltip. The
  tooltip's copy is what makes the row label resolve; see
  [The tooltip](#the-tooltip).
- **Cells carry the click target, not the `Pie`.** Each segment is its own
  category, so the handler has to be per-cell. This is the opposite of the bar
  chart, where a band's whole column shares one category and the handler sits on
  the `Bar`.
- **Deselected segments drop to `opacity={0.2}`** — slightly deeper than the bar
  chart's `0.25`, because a thin ring segment reads as present at 0.25.
- **`transition-opacity` on the cells** fades that change over Tailwind's default
  150ms. The bar chart's bands deliberately snap instead.
- **`opacity` is driven by `activeOf`, which returns `boolean | null`.** Only an
  explicit `false` dims; `null` means no filter exists on this dimension, which
  is not the same as "not selected".

---

## The centre readout

The hole is an absolutely positioned overlay, not a Recharts label:

```tsx
<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
  <span className="text-xl font-semibold tracking-[-0.04em] text-stone-950">
    {selectedShare === null ? dealCount : `${selectedShare.toFixed(0)}%`}
  </span>
  <span className="mt-0.5 text-[10px] text-stone-400">
    {selectedShare === null ? (dealCount === 1 ? 'deal' : 'deals') : 'of volume'}
  </span>
</div>
```

**`pointer-events-none` is load-bearing.** The overlay covers the middle of the
ring, and the ring is clickable; without it the overlay swallows clicks aimed at
the inner edge of a segment.

**Both lines branch on the same condition, in the same order**, which is what
keeps the figure and its unit from disagreeing. The count is singularised because
a one-deal selection is easy to reach — any narrow filter lands there — and
`1 deals` in a figure a banker reads is the kind of detail that costs trust.

The figure has two modes. With no filter on the breakdown dimension it is the
deal count; with one, it is the share of volume that selection covers, which
turns the donut into a live readout of how much of the market the user has picked.

### Why the share is sometimes withheld

`selectedShare` is computed by the parent, and it returns `null` in three cases —
the third is the interesting one:

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
        .reduce((sum, slice) => sum + slice.volume, 0) /
        breakdownTotal) *
      100;
```

The share is a sum of **slice** volumes, and the response carries volumes per
slice, not per value. For a leading category that is exact. For `Other` it is
exact only if every folded value is selected — which is what clicking the `Other`
segment does. Select one issuer that happens to sit inside `Other` and the naive
sum claims the entire bucket.

That is not a rounding error. Measured on a 57-issuer breakdown, `Issuer =
Turkcell` produced `48% of volume` where the honest answer was a fraction of one
per cent, because `Other` held 48% of the market. The guard turns that case into
the deal count instead — `10 deals` — which is true, useful, and cannot be
misread as a share.

Five cases, all verified against the live dashboard:

| Selection on the breakdown dimension | Centre shows |
| --- | --- |
| Nothing | `842 deals` — the count |
| One leading slice (`RWE AG`, legend 4%) | `4% of volume` |
| The `Other` segment, so every folded value | `70% of volume`, matching its legend row |
| One value inside `Other` (`Turkcell`) | `10 deals` — the share is withheld |
| A leading slice plus all of `Other` | `74% of volume` — the two add up |

Withholding rather than approximating is the same instinct as the granularity
gate: a figure a banker might quote is either right or absent.

If an exact share for a partial `Other` matters, the fix belongs in the data
layer — have the response carry the selected volume, computed from the rows —
not in the component. The component cannot derive what it was not sent.

---

## The tooltip

A pie tooltip describes one segment, so almost none of the bar chart's tooltip
machinery applies:

```tsx
<ChartTooltipContent
  hideLabel
  nameKey="category"
  valueFormatter={(value) => formatBn(Number(value))}
/>
```

- **`hideLabel`** because a single-row tooltip's heading and its row would say the
  same thing.
- **`nameKey="category"`** is what makes the row resolve. The wrapper reads the
  name off the payload first and only then falls back to the series, and for a
  pie every segment shares one `dataKey` (`volume`), so without it every tooltip
  would be titled *Volume*:

  ```ts
  const payloadName = nameKey && item.payload ? item.payload[nameKey] : item.name ?? item.dataKey;
  const key = String(payloadName ?? item.dataKey ?? 'value');
  const itemConfig = config[key] ?? config[String(item.dataKey ?? '')];
  ```

- **No `maxRows`, `hideEmpty`, `rankRows` or `footer`.** There is one row; there
  is nothing to cap, drop, rank or total. Passing them would be inert.

The swatch colour resolves through `chartConfig`, which the parent builds from
both charts' categories, so a sector has the same colour in the ring, the legend
and the tooltip.

---

## The legend

Rows rather than chips, because there is a percentage to align on the right.

```tsx
function BreakdownLegend({
  slices,
  total,
  activeOf,
  onToggle,
}: {
  slices: CategorySlice[];
  total: number;
  activeOf: (category: string) => boolean | null;
  onToggle: (category: string) => void;
}) {
  const { shown, hidden, collapsible, expanded, toggle } = useCollapsed(slices, LEGEND_ROWS);

  return (
    <div className="grid content-center gap-0.5">
      {shown.map((slice) => {
        const percentage = total > 0 ? (slice.volume / total) * 100 : 0;
        const active = activeOf(slice.category);
        return (
          <button
            key={slice.category}
            type="button"
            onClick={() => onToggle(slice.category)}
            aria-pressed={active === true}
            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
              active === false ? 'opacity-40' : ''
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: slice.fill }}
              aria-hidden
            />
            {/* A filtering row darkens; dimming alone leaves the pick implicit. */}
            <span
              className={`min-w-0 flex-1 truncate text-[11px] ${
                active === true ? 'font-medium text-stone-900' : 'text-stone-600'
              }`}
            >
              {slice.category}
            </span>
            <span
              className={`text-[10px] tabular-nums ${
                active === true ? 'text-stone-600' : 'text-stone-400'
              }`}
            >
              {percentage.toFixed(0)}%
            </span>
          </button>
        );
      })}
      {collapsible && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[11px] text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span className="h-2 w-2 shrink-0" aria-hidden />
          {expanded ? 'Show fewer' : `${hidden} more`}
        </button>
      )}
    </div>
  );
}
```

- **`total > 0` guard.** An empty window would otherwise divide by zero and print
  `NaN%` in every row.
- **`tabular-nums` on the percentage** so the column does not jitter between
  `4%` and `19%`.
- **`min-w-0 flex-1 truncate` on the name**, or a long issuer pushes the
  percentage out of the row. `shrink-0` on the swatch for the same reason.
- **The `N more` row keeps an empty `h-2 w-2` swatch**, which is what aligns its
  text with the rows above rather than indenting it by the swatch width.
- **Rows are full-width buttons with a hover fill**; the bar chart's chips are
  inline and have no fill. Both set `aria-pressed`, and both use `aria-pressed={active === true}` so a `null` is not announced as unpressed.

The collapse rule is the shared hook, with a limit of six rows here against the
bar chart's eight chips:

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

`limit + 1`, so a single leftover is never folded into a `1 more` row that says
less than the name it replaced. Six is chosen against the band cap rather than
arbitrarily: a compact dimension produces six items and stays flat, a long-tail
dimension produces eleven and collapses to six plus `5 more`.

---

## The control above it

One ghost dropdown, in a `ChartBar` that also carries a label (`Sector mix`,
following the dimension; the bar chart's is a fixed `Volume trend`). The
always-present value sits a step darker than its `By` prefix:

```tsx
export function BreakdownMenu({ value, onChange }: {
  value: Dimension;
  onChange: (value: Dimension) => void;
}) {
  return (
    <DropdownMenu>
      <MenuTrigger>
        <span className="text-stone-400">By</span>
        <span className="text-stone-800">{DIMENSION_LABELS[value].toLowerCase()}</span>
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
```

It differs from `StackByMenu` in exactly one way: there is no "off" option, so
the value is a plain `Dimension` and needs no `'none'` sentinel. A donut with no
breakdown would have nothing to draw.

`MenuTrigger` is shared between the two menus and lives in
[01-design-system.md](./01-design-system.md#dimension-menu-trigger). The popover
carries no title — `aria-label` supplies the context, since the trigger already
reads `By sector`.

`ChartBar` reserves `min-h-8` whether or not it has a label, which is what puts
this chart and the bar chart on the same baseline:

```tsx
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
```

---

## Loading, stale and empty

**First load** — a skeleton whose ring is a filled circle with the hole punched
by a radial-gradient mask, and six legend rows at the live rows' exact height:

```tsx
export function DonutChartSkeleton() {
  return (
    <div className="grid h-full content-center gap-4" aria-hidden>
      <div className="mx-auto flex h-[184px] w-full max-w-[230px] items-center justify-center">
        <div className="sk-shimmer h-[164px] w-[164px] rounded-full [mask-image:radial-gradient(circle,transparent_62px,black_63px)]" />
      </div>
      <div className="sk-stagger grid gap-0.5">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex h-4 items-center gap-2.5 px-2 py-1.5 box-content">
            <Skeleton className="h-2 w-2 rounded-[2px]" />
            <Skeleton className="h-2 flex-1" style={{ maxWidth: `${68 - index * 6}%` }} />
            <Skeleton className="h-2 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

Every number ties back to the live donut: `164px` is `outerRadius={82}` doubled,
the `62px` transparent stop is `innerRadius={62}` exactly, and `184px`/`230px`
match the ring box. `box-content` with `h-4` plus `py-1.5` reproduces the legend
row's height including its padding, so the six rows do not shift when real ones
arrive. Full treatment in [05-loading.md](./05-loading.md#donut-skeleton).

**Refresh** — the band takes `.dash-stale` and dims to 45% opacity and 55%
saturation over 180ms, gated so a fast response never flashes. Identical to the
bar chart; see [The animation](#the-animation).

**Empty** — `slices.length === 0`, meaning there is nothing to compose, not
merely nothing selected:

```tsx
<EmptyBand message="Nothing to break down" onClear={onClear} />
```

---

## The animation

The choreography is the bar chart's, and the timings are documented once in
[08-volume-chart.md](./08-volume-chart.md#the-animation): the old ring stays
mounted and untouched for 220ms, dims over 180ms, is replaced when the response
lands, and brightens again 420ms later — just as the 450ms movement finishes.

What differs is the movement itself. `Pie` interpolates a **sweep angle** per
index and re-lays the sectors sequentially around the ring:

```ts
// Recharts 3.8 internals, simplified from the compiled source
sectors.forEach((entry, index) => {
  const prev = prevSectors && prevSectors[index];
  const paddingAngle = index > 0 ? entry.paddingAngle ?? 0 : 0;
  if (prev) {
    const angle = interpolate(prev.endAngle - prev.startAngle, entry.endAngle - entry.startAngle, t);
    stepData.push({ ...entry, startAngle: curAngle + paddingAngle, endAngle: curAngle + angle + paddingAngle });
  } else {
    const deltaAngle = interpolate(0, entry.endAngle - entry.startAngle, t);
    stepData.push({ ...entry, startAngle: curAngle + paddingAngle, endAngle: curAngle + deltaAngle + paddingAngle });
  }
  curAngle = stepData[stepData.length - 1].endAngle;
});
```

Because each sector starts where the previous one ended, a change to any one
sweep pushes every later segment around the ring: the whole composition re-packs
rather than one wedge resizing in place.

Sectors are matched **by index**, exactly as the bar chart's rectangles are, and
that produces a two-part movement on a dimension switch. Indices the old ring
also had **morph** from the old sweep to the new one; indices past the old count
**grow from zero**. Switching a three-currency ring to a six-sector one, sampled
every 60ms, with the figures being SVG path lengths — proportional to sweep,
since the radii never change:

```
old         615 / 259 / 136
first frame 523 / 236 / 140 /  62 /  61 / 105
            404 / 207 / 145 /  89 /  88 / 188
            306 / 182 / 149 / 113 / 111 / 258
settled     198 / 155 / 154 / 138 / 136 / 334
```

The first three descend from the currency sweeps they inherited; the last three
climb from near nothing. So a switch reads as the ring partly re-proportioning
and partly drawing itself, not as a clean redraw.

This is where the donut and the bar chart genuinely diverge, and it comes from
component structure rather than from any prop. The bar chart renders **one `Bar`
per category, keyed by category**, so a dimension switch unmounts every one of
them and each starts from an empty ref. The donut renders **one `Pie`** whose
`Cell` children are keyed instead, and `previousSectorsRef` lives on the `Pie` —
which is never keyed by dimension, so it survives the switch and has old sweeps
to interpolate from.

One consequence: because slices are ranked by volume, a re-rank can hand a wedge
to a different category mid-flight. Harmless, but it means the movement carries
no meaning — only the end state does.

Two behaviours worth knowing, both measured:

| Change | What the ring does | Why |
| --- | --- | --- |
| Breakdown dimension | Shared indices morph, surplus sectors grow from zero | `prevSectors` is index-matched |
| Click a segment or row | Nothing moves; only opacity changes | Scope exclusion means the composition is identical |

The second is the donut's defining behaviour. Clicking a slice does not reduce
the donut to one full-circle segment; the composition stays whole and the table
narrows instead. Verified frame by frame: across sixteen samples every one of the
eleven sector paths was character-for-character identical to its pre-click value,
while the opacities went to `0.2,0.2,1,0.2,0.2,0.2` immediately and the centre
switched to `17% of volume`.

That instant feedback comes from local filter state, not the response, which is
why it does not wait for the round-trip:

```tsx
opacity={activeOf(slice.category) === false ? 0.2 : 1}
```

The donut also passes `isAnimationActive` explicitly. Without it, Recharts 3.8
uses its `'auto'` default and disables the sweep whenever the host reports
`prefers-reduced-motion: reduce`, even though ECharts on the same machine may
continue to animate. With reduced-motion emulation active, a Sector → Currency
switch was verified to produce intermediate sector geometries after the
override, rather than one instant replacement.

This deliberately retains the short data transition while decorative CSS
movement remains disabled. If the application exposes its own motion setting,
pass that boolean instead of forcing `true`.

---

## Wiring it up

```tsx
const breakdown = aggregates?.breakdown ?? NO_SLICES;
const shownBreakdownBy = aggregates?.breakdownBy ?? breakdownBy;
const breakdownOther = aggregates?.breakdownOther ?? NO_VALUES;
const breakdownTotal = aggregates?.breakdownTotal ?? 0;

<MixDonut
  slices={breakdown}
  total={breakdownTotal}
  breakdownBy={breakdownBy}             // menu state
  shownBreakdownBy={shownBreakdownBy}   // response echo
  dealCount={stats?.dealCount ?? 0}
  selectedShare={selectedShare}
  isRefreshing={showRefreshing}         // gated flag, not raw isRefreshing
  activeOf={(category) => isActive(shownBreakdownBy, category, breakdownOther)}
  onToggle={(category) => toggleCategory(shownBreakdownBy, category, breakdownOther)}
  /* …chartConfig, isFirstLoad, onBreakdownByChange, onClear pass straight through… */
/>;
```

Note `shownBreakdownBy` falls back to `breakdownBy` rather than to `null`, unlike
the stack dimension: there is always a breakdown, so the only question is whether
the response has caught up.

**Scope exclusion.** The donut's rows drop the filter on the dimension it is
breaking down by:

```ts
const breakdownRows = scope(query, query.breakdownBy);
```

The date window, the search term and every other clause still apply. This is the
behaviour most often mistaken for a bug, and the per-surface table is in
[02-functional-spec.md](./02-functional-spec.md#scope-exclusion).

**Clicks resolve `Other` back to its members**, so one click on the residual
filters on every value it folds in:

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

`isActive` treats `Other` as selected when **any** folded value is, which is
right for highlighting and wrong for arithmetic — the distinction the centre
readout's guard exists to respect.

The donut also sits in a column marked `aria-busy` while loading:

```tsx
<div className="flex flex-col xl:col-span-4" aria-busy={isFirstLoad || isRefreshing}>
```

It is hidden entirely when `prefs.showSectorMix` is false, at which point the bar
chart takes `xl:col-span-12`.

---

## How it differs from the bar chart

The two charts share a data pipeline, a band height, a legend hook, a colour
ramp, a grey-out and a click-to-filter contract. Everything else is deliberately
different, and each difference has a reason.

| | Bar chart | Donut |
| --- | --- | --- |
| Band height | `height` — legend collapses | `minHeight` — legend grows the column |
| Control row | Fixed `Volume trend` label | Dimension-aware `Sector mix` label |
| Dimension can be off | Yes, `'none'` sentinel | No, always a dimension |
| Click target | `onClick` on the `Bar` | `onClick` on each `Cell` |
| Deselected opacity | `0.25`, snaps | `0.2`, `transition-opacity` |
| Legend | 8 inline chips, `pl-11` | 6 full-width rows with percentages |
| Legend focus ring | `ring-stone-900/15` | `ring-ring/40` |
| Tooltip | Four capping options and a footer | `hideLabel` + `nameKey` |
| Empty test | `stats.dealCount === 0`, passed in | `slices.length === 0`, derived |
| Interpolates | Rectangle geometry | Sweep angle, re-packed around the ring |
| Dimension switch | Bands remount, so all grow from the axis | Shared indices morph, only the surplus grows |

Two of those are worth dwelling on.

**The empty test differs because the questions differ.** The bar chart asks *are
there any deals in this window* — a property of the fully filtered set. The donut
asks *is there anything to compose*, of a set that deliberately ignores its own
dimension's filter. Filter to a sector with no deals in the window and the bar
chart says *No issuance in this window* while the donut still shows the full
sector composition. That is correct on both sides.

**The focus-ring inconsistency is real.** The bar legend uses a literal stone
value and the donut legend uses the `ring` token. They render similarly, but if
you are porting this, pick one.

---

## Gotchas

- **`minHeight`, not `height`, on the donut band.** With `height` an expanded
  legend is clipped, and the `N more` affordance becomes a trap.
- **`strokeWidth={0}` on the `Pie`.** The default white stroke plus
  `paddingAngle` reads as a rendering fault, not a gap.
- **`pointer-events-none` on the centre overlay**, or it eats clicks meant for
  the inner edge of a segment.
- **`nameKey` must be passed to the tooltip as well as the `Pie`**, or every
  segment's tooltip is titled with the shared `dataKey`.
- **Put the click handler on the `Cell`, not the `Pie`.** On the `Pie` it fires
  for the chart rather than the segment, so every click filters the same
  category.
- **Guard the percentage divisor.** `total` is zero in an empty window and every
  row prints `NaN%` without the check.
- **Do not sum slice volumes to price a partial `Other` selection.** It claims
  the whole bucket. Withhold the figure, or send the volume from the data layer.
- **Title from the response, menu from the request.** A heading that changes
  before the ring does is worse than one that lags.
- **Key the legend by the dimension**, or its expanded state survives a switch
  from a six-value dimension to a fifty-value one.
- **Keep `activeOf` three-valued.** Collapsing `null` into `false` dims every
  segment whenever no filter is applied.

---

## Parity checklist

- [ ] `minHeight: CHART_BAND` (372px) so an expanded legend grows the column
- [ ] Two-column at `sm`, single column at `xl`; ring box `h-[184px] max-w-[230px]`, centred
- [ ] Ring 62 → 82 radius, `paddingAngle={2}`, `strokeWidth={0}`, `animationDuration={450}`
- [ ] `isAnimationActive` explicitly true when cross-machine animation parity is required
- [ ] Control row labelled `{Dimension} mix` from the **response's** dimension, `min-h-8`
- [ ] `By ▾` ghost dropdown, radio group, no title in the popover, no "off" option
- [ ] Centre: deal count with no selection, `N% of volume` with one, count again when the share cannot be stated exactly
- [ ] Centre unit singularises at one deal
- [ ] Centre overlay absolutely positioned and `pointer-events-none`
- [ ] Tooltip `hideLabel` + `nameKey="category"` + `formatBn`, and nothing else
- [ ] Legend: 6 rows then `N more`, percentages `tabular-nums`, truncated names, `aria-pressed`
- [ ] Segments and rows both toggle the filter; `Other` expands to every folded value
- [ ] Deselected segments `0.2` with `transition-opacity`; rows `opacity-40`
- [ ] Composition ignores the filter on its own dimension, so clicking never collapses the ring
- [ ] Skeleton ring 164px with a 62px radial mask, six rows at the live row height
- [ ] `.dash-stale` on refresh; `aria-busy` on the column
- [ ] Empty state derived from `slices.length === 0`, message *Nothing to break down*
