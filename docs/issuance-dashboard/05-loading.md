# Loading states

Every placeholder, in full. The animation CSS lives in
[01-design-system.md](./01-design-system.md#stylesheet) and the rules about
*when* each state appears live in
[02-functional-spec.md](./02-functional-spec.md#loading). This document is the
markup.

- [The governing rule](#the-governing-rule)
- [Where each state appears](#where-each-state-appears)
- [The shimmer primitive](#the-shimmer-primitive)
- [Staggering a group](#staggering-a-group)
- [Bar chart skeleton](#bar-chart-skeleton)
- [Donut skeleton](#donut-skeleton)
- [Stats strip skeleton](#stats-strip-skeleton)
- [Detail skeleton](#detail-skeleton)
- [Grid loading cells](#grid-loading-cells)
- [Refresh indicator](#refresh-indicator)
- [The dimmed state](#the-dimmed-state)
- [Checklist](#checklist)

---

## The governing rule

**A skeleton mirrors the geometry of what it replaces**, so the swap to real
data moves nothing on screen.

That is stricter than it sounds. It is not enough to occupy roughly the right
space — the box, its height, its internal row heights and its gaps must match
the real component. Every skeleton below shares either a literal constant or an
identical class string with its live counterpart, and where that was not possible
the matching value is called out.

Layout shift on data arrival is the single most common failure here, and it is
invisible during development because local responses are instant. Test with the
latency in place.

---

## Where each state appears

| Region | First load | Refresh |
| --- | --- | --- |
| Stats strip | `StatStripSkeleton` | `RefreshIndicator` beside the label |
| Bar chart | `BarChartSkeleton` | Existing chart, dimmed |
| Donut | `DonutChartSkeleton` | Existing donut, dimmed |
| Row count | `<Skeleton className="h-2.5 w-14" />` | Live count |
| Grid rows | Per-cell shimmer | Per-cell shimmer for unfetched blocks |
| Filter bar | — | `RefreshIndicator` labelled `Loading` |
| Detail panel | `DetailSkeleton` | Existing record stays |

Two things never show a skeleton: the top bar and the filter controls. They do
not depend on the response, so replacing them would imply the page is less ready
than it is.

---

## The shimmer primitive

Everything is built from one class. The shadcn `Skeleton` primitive is patched to
use it instead of `animate-pulse`:

```tsx
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="skeleton" className={cn('sk-shimmer rounded-md', className)} {...props} />
  );
}
```

`sk-shimmer` is a `#f2f1f0` base with a white gradient swept across it by a
pseudo-element. A sweep reads as loading; a pulse reads as an error state
blinking. Under `prefers-reduced-motion` it falls back to a flat `#eeedec`
rather than to nothing, so the placeholder is still visibly a placeholder.

Because the sweep is an `::after` with `overflow: hidden` on the parent, any
element given the class shimmers, including one with a mask.

---

## Staggering a group

**Put `sk-stagger` on the container of a skeleton group.** This is easy to miss:
the class only appears in the stylesheet, and without it a cluster of skeletons
sweeps in perfect unison, which reads as several separate blinking rectangles
rather than one surface settling.

```css
.sk-stagger > *:nth-child(2n)::after { animation-delay: 120ms; }
.sk-stagger > *:nth-child(3n)::after { animation-delay: 240ms; }
```

It applies to **direct children only**. Three places use it, all marked below:
the bar row, the donut legend list, and the detail card's definition list. The
detail card's metric well deliberately does not — three items side by side in a
filled box read better sweeping together.

The `2n`/`3n` overlap is intentional — it produces a three-phase cycle
(0/120/240ms) from two rules without needing a delay per child.

---

## Bar chart skeleton

Twelve bars at fixed heights, a five-tick y-axis, and a row of tick labels.

```tsx
/** Deterministic heights read as a plausible bar series rather than noise. */
const BAR_HEIGHTS = [46, 62, 54, 71, 58, 83, 38, 66, 49, 74, 57, 68];

export function BarChartSkeleton() {
  return (
    <div className="flex h-full w-full gap-3" aria-hidden>
      <div className="flex w-11 shrink-0 flex-col justify-between py-1">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-2 w-8" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sk-stagger flex flex-1 items-end gap-[3%]">
          {BAR_HEIGHTS.map((height, index) => (
            <Skeleton
              key={index}
              className="min-w-0 flex-1 rounded-b-none"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-[3%]">
          {BAR_HEIGHTS.map((_, index) => (
            <div key={index} className="flex min-w-0 flex-1 justify-center">
              <Skeleton className="h-2 w-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Heights are hard-coded, not random.** A random series reshuffles on every
render and draws the eye to motion that means nothing. These twelve values were
chosen to look like plausible monthly supply.

**`w-11` on the axis column is 44px, and so is the live y-axis.** The chart sets
`width={52}` but pulls it back with `margin.left: -8`, leaving 44px of gutter.
That is why the skeleton reserves `w-11` and the live stack legend indents
`pl-11` — three expressions of the same 44px. Change the y-axis width or the
left margin and all three have to move together, or the bars shift sideways when
data lands.

**`rounded-b-none`** leaves the top corners rounded and squares the bottom, so
the bars sit on the axis exactly as real ones do.

The parent supplies the 372px band height, so this component is `h-full`.

---

## Donut skeleton

The ring is a filled circle with a hole punched by a radial-gradient mask.

```tsx
/** Row heights mirror the live legend exactly so the swap causes no shift. */
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

**The mask is the whole trick.** A ring drawn as a bordered circle cannot
shimmer, because the sweep needs a filled box to travel across. So the element
is a solid 164px circle with `sk-shimmer`, and the hole is cut out:

```css
mask-image: radial-gradient(circle, transparent 62px, black 63px);
```

`62px` is the live donut's `innerRadius`. The `63px` stop is one pixel further
out and gives the mask a hard edge — collapse them to the same value and some
browsers antialias a grey fringe.

Both diameters are derived from the live radii, not eyeballed: `164px` is
`outerRadius={82}` doubled, and the mask's `62px` is `innerRadius={62}` exactly.
The wrapper repeats the live container's `h-[184px] w-full max-w-[230px]`, which
is what leaves the same 20px of slack around the ring.

**`box-content` on the legend rows** is load-bearing. The live rows are
`px-2 py-1.5` with content that happens to be 16px tall; `h-4` plus
`box-content` reproduces `16px + 12px` of padding rather than clamping the total
to 16px. Without it the six rows come out 12px short and the whole column jumps
when data arrives.

**Widths taper** (`68%`, `62%`, `56%`…) because ranked category names get
shorter down a legend. Six uniform bars read as a table, not a legend.

---

## Stats strip skeleton

The clearest example of the shared-box rule: the skeleton and the live strip
interpolate the same constant.

```tsx
/** The strip and its skeleton share this box, so the page never shifts. */
const STRIP_BOX = 'mt-2 flex min-h-9 items-end';

export function StatStripSkeleton() {
  return (
    <div className={`${STRIP_BOX} gap-7`}>
      <Skeleton className="h-8 w-40" />
      <div className="flex items-end gap-6">
        {[44, 52, 64].map((width) => (
          <div key={width} className="space-y-2">
            <Skeleton className="h-2 w-10" />
            <Skeleton className="h-3" style={{ width }} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

`h-8` stands in for the 32px hero figure and `h-3`/`h-2` for the stat value and
its label. The three widths ascend because `Largest` carries a ticker suffix and
so runs longest.

No `sk-stagger` here — four elements in one line box read better sweeping
together than in sequence.

---

## Detail skeleton

Mirrors the four blocks of the live card: header with badge, definition list,
metric well, notes.

```tsx
export function DetailSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200/70 bg-white px-5 py-5" aria-hidden>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="sk-stagger mt-6 grid grid-cols-2 gap-x-5 gap-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-2 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-3 py-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2">
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  );
}
```

**The border and the `bg-stone-50` well are real, not skeletonised.** This is the
one bordered card in the layout, and its frame is structure rather than content —
shimmering it would make the card look like it might not be there at all.

`rounded-full` on the badge placeholder, matching the live pill.

---

## Grid loading cells

The infinite row model renders empty cells for rows it has not fetched. A
renderer selector swaps in a shimmer bar per cell.

```tsx
/**
 * Rendered in every cell of a block that has not arrived yet. Widths vary by
 * column so a loading region still looks like a table rather than a grey slab.
 */
function LoadingCell({ column }: CustomCellRendererProps<IssuanceRecord>) {
  const colId = column?.getColId() ?? '';
  const width = LOADING_CELL_WIDTHS[colId] ?? '60%';
  return (
    <span className="flex h-full items-center" aria-hidden>
      <span className="sk-shimmer block h-2 rounded-full" style={{ width }} />
    </span>
  );
}

/**
 * The infinite row model renders empty cells for rows it has not fetched, so the
 * skeleton is injected per cell. Returning undefined leaves loaded rows on the
 * column's own renderer.
 */
const loadingAwareRenderer = ({ data }: { data?: IssuanceRecord }) =>
  data ? undefined : { component: LoadingCell };
```

Wired through `defaultColDef`, so it covers every column including any added
later:

```ts
const DEFAULT_COL_DEF: ColDef<IssuanceRecord> = {
  sortable: true,
  filter: false,
  resizable: true,
  suppressHeaderMenuButton: true,
  cellRendererSelector: loadingAwareRenderer,
};
```

**Returning `undefined` is the important half.** The selector runs for every
cell, loaded or not; `undefined` means "use the column's own renderer", so
loaded rows are untouched.

Widths are per column, so a loading block still reads as a table:

```ts
const LOADING_CELL_WIDTHS: Record<string, string> = {
  status: '52px',
  pricingDate: '48px',
  issuer: '78%',
  ticker: '44px',
  region: '72%',
  currency: '28px',
  size: '72px',
  tenor: '30px',
  rating: '64px',
  sector: '70%',
  spread: '40px',
  nip: '30px',
  book: '58px',
  cover: '32px',
};
```

Fixed pixels for columns holding short codes, percentages for columns holding
names. A uniform `60%` everywhere produces an obvious grey ladder; varied widths
suggest content. Unlisted columns fall back to `60%`.

The bar height comes from CSS, keeping it in step with the card skeletons:

```css
.issuance-grid .ag-row-loading .sk-shimmer {
  height: 9px;
}
```

---

## Refresh indicator

Shown beside a section label while data already on screen is being replaced.

```tsx
/** Shown next to a card title while already-visible data is being replaced. */
export function RefreshIndicator({ label = 'Updating' }: { label?: string }) {
  return (
    <span
      role="status"
      className="dash-fade-soft inline-flex items-center gap-1.5 text-[10px] font-medium text-stone-400"
    >
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      {label}
    </span>
  );
}
```

Two labels in use: `Updating` beside the hero, `Loading` in the filter bar.

**`dash-fade-soft` animates opacity only.** The indicator remounts every time
data ticks, so with a `translateY` it would spend most of its visible life
mid-slide and read as vertically misaligned against the label beside it. This is
the most common way to make the header look broken, and it is why
`.dash-fade-soft` has no transform.

It is gated so quick responses never flash it:

```ts
const showRefreshing = useSettledFlag(isRefreshing);
```

220ms before it appears, 420ms minimum on screen. Details in
[02-functional-spec.md](./02-functional-spec.md#loading).

---

## The dimmed state

While a refresh is in flight, the existing chart stays and dims:

```tsx
<div className={`mt-5 ${isRefreshing ? 'dash-stale' : ''}`} style={{ height: CHART_BAND }}>
```

```css
.dash-stale {
  opacity: 0.45;
  filter: saturate(0.55);
  transition: opacity 180ms ease, filter 180ms ease;
}
```

Desaturating as well as fading is what makes it read as *superseded* rather than
merely faint — the chart is still legible, just visibly not current.

The chart column also sets `aria-busy` so the state is announced, not only shown:

```tsx
<div className="flex flex-col xl:col-span-8" aria-busy={isFirstLoad || isRefreshing}>
```

---

## Checklist

Things that go wrong, in the order they usually do.

- [ ] `Skeleton` patched to `sk-shimmer`, not left on `animate-pulse`.
- [ ] `sk-stagger` on the container of each skeleton group — bar row, donut
      legend, detail definition list.
- [ ] `box-content` on the donut legend rows, or the column jumps 12px.
- [ ] Chart band height applied to both the skeleton and the chart from the same
      `CHART_BAND` constant.
- [ ] `STRIP_BOX` interpolated into the stats strip and its skeleton.
- [ ] Skeleton axis column and live y-axis the same width (`w-11` / `width={52}`).
- [ ] `cellRendererSelector` on `defaultColDef`, returning `undefined` for
      loaded rows.
- [ ] Every skeleton `aria-hidden`; the indicator `role="status"`; loading
      columns `aria-busy`.
- [ ] Reduced-motion block present, with the flat `#eeedec` shimmer fallback.
- [ ] Tested with real latency, not against an instant local response.
