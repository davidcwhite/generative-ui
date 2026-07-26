# Design system

Every value here is literal. Where a Tailwind class is quoted, that exact class
produces the intended result; substituting a near neighbour (`text-xs` for
`text-[11px]`, `stone` for `gray`) visibly changes the page.

- [Page map](#page-map)
- [Principles](#principles)
- [Colour](#colour)
- [Typography](#typography)
- [Layout](#layout)
- [Components](#components)
- [AG Grid theme](#ag-grid-theme)
- [Motion](#motion)
- [Stylesheet](#stylesheet)
- [Chart wrapper](#chart-wrapper)

---

## Page map

Eight regions, top to bottom. Widths are at `xl` and above.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ ① TOP BAR                     sticky · z-20 · h-12 · white/70 + backdrop-blur ║
║                                                                              ║
║  Issuance  Allocations  Market  Pipeline  Comparables   [Dashboards│Data] ⚙  ║
║  └─ dataset tabs, underline on active ─┘                 └─ view ─┘  toolbar  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                            mx-auto max-w-[1800px] px-5 py-7  ║
║  ② HEADER                                          flex · lg:row · items-end ║
║                                                                              ║
║  ISSUANCE VOLUME  ◌ Updating          ③  ┌────────────────────────────────┐  ║
║  ┌───────────────────────────────┐        │ 1M 3M 6M YTD 1Y All │ 📅 Custom│  ║
║  │ €199.8bn │ DEALS │ AVERAGE │ LARGEST │ └────────────────────────────────┘  ║
║  │  32px    │  167  │  €1.2bn │ €2.5bn  │        RangeControl (segmented)     ║
║  └───────────────────────────────┘                                           ║
║   StatStrip — hero + 3 stats, left-bordered                                  ║
║                                                                       mt-8   ║
║  ┌─ ④ col-span-8 ──────────────────────────┐ ┌─ ⑤ col-span-4 ─────────────┐  ║
║  │              Stack ▾  [D│W│M│Q]         │ │ SECTOR MIX          By ▾   │  ║
║  │  ChartBar  (min-h-8, both aligned)      │ │  ChartBar                  │  ║
║  │ ─────────────────────────────── mt-5 ─── │ │ ──────────────────── mt-5 ─│  ║
║  │ €28bn┤                                  │ │        ╭───────╮           │  ║
║  │      │  ▇  ▇     ▇  ▇                   │ │      ╭─┤  167  ├─╮         │  ║
║  │ €14bn┤  ▇  ▇  ▇  ▇  ▇  ▇                │ │      │ │ deals │ │        │  ║
║  │      │  ▇  ▇  ▇  ▇  ▇  ▇  ▇             │ │      ╰─┤       ├─╯         │  ║
║  │  €0bn└──┴──┴──┴──┴──┴──┴──┴───          │ │        ╰───────╯           │  ║
║  │        Jul  Aug  Sep  Oct  Nov          │ │  184px ring, 62→82 radius  │  ║
║  │                                         │ │                            │  ║
║  │ ▪ Financials ▪ Autos ▪ Telecoms  2 more │ │ ▪ Financials         22%   │  ║
║  │   StackLegend (only when stacked)       │ │ ▪ Automobiles        14%   │  ║
║  │                                         │ │ ▪ Telecoms           12%   │  ║
║  │ monthly gross supply, EUR equivalent    │ │   … 3 more                 │  ║
║  │ height: 372px (CHART_BAND)              │ │ BreakdownLegend            │  ║
║  └─────────────────────────────────────────┘ │ minHeight: 372px           │  ║
║                                              └────────────────────────────┘  ║
║ ──────────────────────────────────────────────────────────────── mt-10 ───── ║
║  ⑥ FILTER BAR                                                        pt-5    ║
║  ┌──────────────┐ ┌────────┐ ┌──────────────┐                                ║
║  │ 🔍 Search…   │ │+ Filter│ │Sector Fins ✕ │      ◌ Loading   167 issues    ║
║  └──────────────┘ └────────┘ └──────────────┘             └─ ml-auto ─┘      ║
║                                                                       mt-4   ║
║  ┌─ ⑦ minmax(0,1fr) ───────────────────────┐ ┌─ ⑧ 282px ──────────────────┐  ║
║  │ STATUS │ ISSUER    │ PRICED │ TICKER │… │ │ ╭────────────────────────╮ │  ║
║  │ ● Live │ Orange SA │ 23 Jul │ ORAFP  │  │ │ │ Orange SA       [Live] │ │  ║
║  │ ○ Pricd│ SAP SE    │ 20 May │ SAP    │  │ │ │ Telecoms · BBB+ / Baa1 │ │  ║
║  │ ○ Pricd│ Santander │ 10 Jun │ SANTAN │  │ │ │ ─────────────────────  │ │  ║
║  │        │           │        │        │  │ │ │ STRUCTURE   SIZE       │ │  ║
║  │  IssuanceGrid · h-[560px] · infinite   │ │ │ EUR 10Y     EUR 500m   │ │  ║
║  │  pinned: status + issuer               │ │ │ COUPON      PRICING    │ │  ║
║  │                                        │ │ │ ┌────┬─────┬─────────┐ │ │  ║
║  │                                        │ │ │ │ 143│  6  │  3.3x   │ │ │  ║
║  │                                        │ │ │ └────┴─────┴─────────┘ │ │  ║
║  │                                        │ │ │ LEADS · EXECUTION READ │ │  ║
║  └────────────────────────────────────────┘ │ ╰────────────────────────╯ │  ║
║                                     gap-7 → │  sticky top-[76px]         │  ║
║                                             └────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

| # | Region | Does | Spec |
| --- | --- | --- | --- |
| ① | Top bar | Switches dataset and view mode; hosts the toolbar slot | [Top bar](#top-bar) |
| ② | Header | Headline volume plus deals, average, largest | [Hero](#hero) |
| ③ | Range control | Sets the date window for everything below | [Segmented control](#segmented-control) |
| ④ | Volume chart | Gross supply over time; stack menu and granularity tabs; bands click to filter | [Bar chart](#bar-chart) |
| ⑤ | Mix donut | Composition by dimension; segments and rows click to filter | [Donut](#donut) |
| ⑥ | Filter bar | Free-text search, filter popover, clause chips, row count | [Filter bar](#filter-bar) |
| ⑦ | Grid | Paged, sortable table of individual deals | [AG Grid theme](#ag-grid-theme) |
| ⑧ | Detail panel | The selected deal in full | [Detail card](#detail-card) |

Only ⑧ is a bordered card. Everything else is separated by whitespace and two
hairlines: one under ① once scrolled, one above ⑥.

**Reading order.** The eye should land on the hero figure, then the charts, then
the table. That is why the eyebrow label above the hero is 10px `stone-400` and
the figure is 32px `stone-950` — the label names the number, it does not compete
with it.

**Responsive collapse.** Below `xl` the two chart columns stack full width and
the detail panel moves below the grid. Below `lg` the header stacks, putting the
range control under the stats. The top bar's dataset tabs scroll horizontally
rather than wrapping.

**Optional regions.** ⑤ and ⑧ can each be switched off by the host through
`DisplayPrefs`. With ⑤ hidden, ④ takes the full twelve columns. With ⑧ hidden,
⑦ spans the full width.

**In `Data` view mode**, ④ and ⑤ are not rendered at all, and ⑧ widens from
282px to 300px.

Where each region gets its data, and what every control does, is in
[02-functional-spec.md](./02-functional-spec.md). What each looks like while
loading is in [05-loading.md](./05-loading.md).

---

## Principles

**White canvas, no cards.** The page background is pure white. Charts sit
directly on it with no container, no border and no shadow. Regions are separated
by whitespace and, where a boundary is genuinely needed, a single hairline.

**One contained surface.** The detail panel is the only bordered card in the
layout. That is what makes it read as a distinct object rather than another
region.

**Warm neutrals.** The greys are Tailwind's `stone` ramp throughout. It is
warmer than `gray` or `zinc`, and mixing ramps is immediately visible against
the white.

**Hairlines at low opacity.** Structural rules are `stone-200/70` or
`stone-200/80`, never full-strength. A solid `stone-200` line reads as a border
and reintroduces the boxed-in feel.

**Controls recede until wanted.** Dimension menus render as plain captions with
a small chevron and only gain a background on hover.

**Opacity over movement.** Anything that shares a line box with text fades; it
does not translate. Only overlays, which own their space, are allowed to scale.

---

## Colour

### Neutrals

| Token | Use |
| --- | --- |
| `white` | Page canvas, grid background, card fill, active segment |
| `stone-50` | Metric well inside the detail card, legend row hover |
| `stone-100` | Segmented control track, view tabs, filter chips, icon wells |
| `stone-200` | Input borders, the divider inside the segmented control |
| `stone-200/70` | Section rules, detail card border |
| `stone-200/80` | Stat dividers, top bar hairline once scrolled |
| `stone-300` | Disabled segment text, input placeholders |
| `stone-400` | All caption and label text, inactive nav, icons |
| `stone-500` | Secondary body text, inactive segment labels |
| `stone-600` | Legend labels, body copy |
| `stone-800` | Values, hovered labels |
| `stone-950` | Headline figures, active nav, primary names |

`stone-400` carries almost every label on the page. It is deliberately low
contrast — labels are there to be found when looked for, not read first.

### Chart ramp

Five sequential tokens, blue, darkening toward the front of the series:

```css
--chart-1: oklch(0.52 0.17 258);
--chart-2: oklch(0.62 0.13 250);
--chart-3: oklch(0.71 0.1 245);
--chart-4: oklch(0.79 0.07 242);
--chart-5: oklch(0.87 0.045 240);
```

A stack can hold more bands than there are tokens, so band colours are
**generated** by interpolating between the two endpoints. Any band count spans
the same visual range instead of running out and repeating.

```ts
const RAMP_START = { l: 0.52, c: 0.17, h: 258 };
const RAMP_END = { l: 0.87, c: 0.045, h: 240 };
const OTHER_COLOR = '#e7e5e4';

function rampColor(index: number, count: number) {
  const t = count <= 1 ? 0 : index / (count - 1);
  const mix = (from: number, to: number) => from + (to - from) * t;
  return `oklch(${mix(RAMP_START.l, RAMP_END.l).toFixed(3)} ${mix(
    RAMP_START.c,
    RAMP_END.c,
  ).toFixed(3)} ${mix(RAMP_START.h, RAMP_END.h).toFixed(1)})`;
}
```

Interpolate in **oklch**, not hex or hsl. Perceptual lightness is what makes the
ramp read as evenly stepped; the same interpolation in sRGB bunches up in the
middle.

Colours are assigned by volume rank, so a stack always reads darkest at the
bottom. The `Other` band is fixed at `#e7e5e4` — outside the ramp, so it never
competes with a real category.

### Status

| Status | Dot (grid) | Badge (detail card) |
| --- | --- | --- |
| Live | `bg-emerald-500` | `bg-emerald-50 text-emerald-700` |
| Monitoring | `bg-amber-500` | `bg-amber-50 text-amber-700` |
| Priced | `bg-stone-300` | `bg-stone-100 text-stone-600` |

Priced is deliberately grey. Most rows are priced, and colouring them would turn
the status column into noise. In the grid, Live and Monitoring rows also get
`text-stone-800` against Priced's `text-stone-500`.

Invalid input is `border-red-300 text-red-600`. That is the only other colour on
the page.

---

## Typography

The system font stack throughout. Three signatures do most of the work.

**The eyebrow label.** Every section caption:

```
text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400
```

Wide tracking is what makes 10px uppercase legible. Smaller variants drop to
`tracking-[0.1em]` at 10px, `tracking-[0.09em]` at 10px inside the detail card,
and `tracking-[0.08em]` at 9px for metric captions.

**Negative tracking on figures.** Large numerals tighten as they grow:

| Size | Tracking | Used for |
| --- | --- | --- |
| `text-[32px]` | `tracking-[-0.04em]` | Hero volume |
| `text-xl` | `tracking-[-0.04em]` | Donut centre, detail metrics |
| `text-sm` | `tracking-[-0.01em]` | Detail card title |

**Tabular numerals.** `tabular-nums` on every figure that sits in a column or
updates in place: stat values, grid numerics, legend percentages, date inputs,
row counts. Without it, digits jitter as data changes.

Full scale:

| Class | Weight | Colour | Use |
| --- | --- | --- | --- |
| `text-[32px]` | `font-semibold` | `stone-950` | Hero volume |
| `text-xl` | `font-semibold` | `stone-950` | Donut centre, detail metrics |
| `text-sm` | `font-semibold` | `stone-950` | Detail card title |
| `text-sm` | `font-medium` | `stone-800` | Stat values |
| `text-xs` | `font-medium` | — | Nav items, view tabs |
| `text-xs` | — | `stone-500`/`stone-600` | Body copy |
| `text-[11px]` | — | `stone-600` | Legend labels, chips, date input |
| `text-[11px]` | `font-medium` | `stone-500` | Dimension menu triggers |
| `text-[10px]` | `font-medium` | — | Segmented buttons |
| `text-[10px]` | — | `stone-400` | Captions, percentages |
| `text-[9px]` | `font-medium` | `stone-400` | Date field labels |

---

## Layout

### Page frame

```
mx-auto w-full max-w-[1800px] px-5 py-7 lg:px-8
```

The top bar repeats `max-w-[1800px] px-5 lg:px-8` on its inner element so the
navigation aligns to the same gutters as the content beneath it.

### Vertical rhythm

| Gap | Between |
| --- | --- |
| `mt-2` | Eyebrow label and stat strip |
| `mt-3` | Chart and its caption; chart and the stack legend |
| `mt-4` | Filter bar and grid |
| `mt-5` | Control bar and chart band; section rule and filter bar |
| `mt-6` | Blocks inside the detail card |
| `mt-8` | Header and chart section |
| `mt-10` | Chart section and table section |

### Chart section

```
mt-8 grid gap-9 xl:grid-cols-12 xl:gap-12
```

Bar chart `xl:col-span-8`, donut `xl:col-span-4`. When the donut is hidden the
bar takes `xl:col-span-12`. Below `xl` they stack full width.

### The chart band

Both charts and both chart skeletons occupy the same fixed height:

```ts
export const CHART_BAND = 372;
```

The bar chart uses `height`, the donut uses `minHeight`. That asymmetry is
deliberate: the donut's legend expands on demand, and a fixed height would clip
it. `minHeight` lets the column grow and push the table down instead.

```tsx
// bar
<div className={`mt-5 ${isRefreshing ? 'dash-stale' : ''}`} style={{ height: CHART_BAND }}>

// donut
<div className={`mt-5 flex flex-col justify-center ${isRefreshing ? 'dash-stale' : ''}`}
     style={{ minHeight: CHART_BAND }}>
```

### Control bar alignment

Each chart's controls sit in a `ChartBar` directly above it. Both reserve
`min-h-8`, which is what puts the two charts on the same baseline even though
one bar has a label and the other does not.

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

The empty `<span aria-hidden />` is load-bearing. `justify-between` needs two
children to push the controls right.

### Table section

```
mt-10 border-t border-stone-200/70 pt-5
```

Grid and detail panel:

```
mt-4 grid gap-7 xl:grid-cols-[minmax(0,1fr)_282px]
```

The panel widens to `300px` in the data-focused view mode, and the whole
constraint drops when the panel is hidden. `minmax(0,1fr)` rather than `1fr` —
without the zero minimum the grid refuses to shrink below its content width and
overflows the page.

The grid itself is fixed at `h-[560px]`. The detail panel is
`xl:sticky xl:top-[76px]`, clearing the 48px top bar plus its gutter.

---

## Components

### Top bar

```tsx
<div className={`sticky top-0 z-20 border-b bg-white/70 backdrop-blur-xl transition-colors duration-200 ${
  scrolled ? 'border-stone-200/80' : 'border-transparent'
}`}>
```

White-on-white has no edge at rest, so the hairline is earned by scrolling.
`border-b` is always present and only its colour animates — toggling the border
itself would shift the layout by a pixel.

`bg-white/70` with `backdrop-blur-xl` is the glass effect. Both are required;
the blur does nothing without translucency.

```ts
export function useScrolled() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const scroller = node.closest('[data-dashboard-scroll]');
    const target: HTMLElement | Window = scroller instanceof HTMLElement ? scroller : window;
    const read = () =>
      setScrolled((target instanceof Window ? window.scrollY : target.scrollTop) > 2);

    read();
    target.addEventListener('scroll', read, { passive: true });
    return () => target.removeEventListener('scroll', read);
  }, []);

  return { ref, scrolled };
}
```

The listener is `passive`, and the state is a boolean rather than a scroll
offset — subscribing to the continuous value would re-render the shell on every
frame of a scroll.

Nav items are 48px tall with an underline drawn by a pseudo-element that is
always present and only changes opacity:

```
relative h-12 whitespace-nowrap text-xs font-medium transition-colors
after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-stone-900 after:opacity-0
```

Active adds `text-stone-950 after:opacity-100`; inactive is
`text-stone-400 hover:text-stone-700`.

### Hero

```tsx
const STRIP_BOX = 'mt-2 flex min-h-9 items-end';

<div className={`${STRIP_BOX} flex-wrap gap-x-7 gap-y-2`}>
  <span className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-stone-950">
    {formatBn(stats.totalVolume)}
  </span>
  <div className="flex items-end gap-6">
    <Stat label="Deals" value={stats.dealCount.toLocaleString()} />
    <Stat label="Average" value={formatMm(stats.averageSize)} />
    <Stat label="Largest" value={formatMm(stats.largest.volume)} suffix={stats.largest.ticker} />
  </div>
</div>
```

`items-end` aligns the 32px figure and the small stats on a shared baseline.
`leading-none` is required, or the figure's line box pushes it off that
baseline.

Supporting stats are separated by left borders rather than dots:

```
border-l border-stone-200/80 pl-6 first:border-l-0 first:pl-0
```

The skeleton shares `STRIP_BOX`, which is what guarantees no shift when data
arrives:

```tsx
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
```

Formatting promotes units automatically:

```ts
export function formatBn(value: number) {
  return value >= 1000 ? `€${(value / 1000).toFixed(2)}tn` : `€${value.toFixed(1)}bn`;
}

export function formatMm(value: number) {
  return value >= 1000 ? `€${(value / 1000).toFixed(1)}bn` : `€${Math.round(value)}m`;
}
```

### Segmented control

Used for the date presets and the granularity tabs.

```tsx
// track
inline-flex w-fit items-center rounded-lg bg-stone-100   // + p-0.5 (md) or p-[3px] (sm)

// button
rounded-md font-medium transition-colors
h-7 px-2.5 text-[10px]      // md
h-[22px] px-2 text-[10px]   // sm

// states
active:   bg-white text-stone-900 shadow-sm
disabled: cursor-not-allowed text-stone-300
default:  text-stone-500 hover:text-stone-800
```

Set `aria-pressed` on each button and `role="group"` with an `aria-label` on the
track. Disabled buttons carry a `title` explaining why.

A `mx-1 h-4 w-px bg-stone-200` divider separates the presets from the custom
range trigger inside the same track.

### Dimension menu trigger

Quiet by default, so it reads as a caption until approached:

```tsx
<button className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium
  text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15">
  <span className="text-stone-400">Stack</span>
  <span>{value ? DIMENSION_LABELS[value].toLowerCase() : 'off'}</span>
  <ChevronDown className="h-3 w-3 text-stone-400" aria-hidden />
</button>
```

The prefix (`Stack`, `By`) is dimmer than the value, so the eye lands on what is
selected. The value is lowercased, which keeps it reading as prose rather than a
second label.

The popover carries no title — `aria-label` on the content supplies the context
that a visible heading would only repeat.

### Bar chart

```tsx
<BarChart accessibilityLayer data={series} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
  <CartesianGrid vertical={false} stroke="#F1F0EE" />
  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12}
         interval="preserveStartEnd" minTickGap={granularity === 'daily' ? 28 : 12} />
  <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `€${v}bn`} />
  <ChartTooltip cursor={{ fill: 'rgba(120,113,108,0.07)' }} content={…} />
  …
</BarChart>
```

Horizontal gridlines only, at `#F1F0EE` — barely visible, which is the point.
Both axis lines and all tick lines are off. The negative `left: -8` margin pulls
the plot back after Recharts reserves space for the y-axis.

Bars are `maxBarSize={40}` with `animationDuration={450}`. Corner radius is
`[4,4,0,0]` unstacked, and on a stack only the topmost band rounds
(`[3,3,0,0]`) — rounding every band would leave gaps in the column.

Deselected bands drop to `opacity={0.25}`.

### Donut

```tsx
<div className="relative mx-auto h-[184px] w-full max-w-[230px]">
  <PieChart accessibilityLayer>
    <Pie data={slices} dataKey="volume" nameKey="category"
         innerRadius={62} outerRadius={82} paddingAngle={2}
         strokeWidth={0} animationDuration={450}>
      {slices.map((slice) => (
        <Cell key={slice.category} fill={slice.fill}
              opacity={activeOf(slice.category) === false ? 0.2 : 1}
              className="cursor-pointer transition-opacity"
              onClick={() => onToggle(slice.category)} />
      ))}
    </Pie>
  </PieChart>
  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
    <span className="text-xl font-semibold tracking-[-0.04em] text-stone-950">…</span>
    <span className="mt-0.5 text-[10px] text-stone-400">…</span>
  </div>
</div>
```

A 20px ring (62→82) with `paddingAngle={2}` and no stroke. `strokeWidth={0}`
matters — Recharts' default stroke draws a white outline that reads as a gap on
top of the padding angle.

The centre label is absolutely positioned and `pointer-events-none`, so it never
intercepts a click meant for a segment.

Layout is two-column at `sm` and single-column at `xl`, because at full width
the donut sits in the narrow right-hand column:

```
grid content-center gap-4 sm:grid-cols-[minmax(180px,0.8fr)_1fr] xl:grid-cols-1
```

### Legends

Two shapes, one hook. The bar chart uses horizontal chips; the donut uses rows
with percentages.

```
// bar chips
mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-11

// donut rows
flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left
transition-colors hover:bg-stone-50
```

`pl-11` on the chip row aligns it with the plot area, clearing the 52px y-axis.

Swatches are `h-2 w-2 shrink-0 rounded-[2px]` in both. Deselected entries get
`opacity-40`. Both set `aria-pressed`.

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

`limit + 1`, not `limit`. Collapsing a single leftover trades a real name for a
line that says "1 more", which is strictly less information.

Limits: 8 chips on the bar, 6 rows on the donut. Both legends are keyed by the
active dimension so switching dimension resets them to collapsed.

### Detail card

The only bordered surface:

```
rounded-xl border border-stone-200/70 bg-white px-5 py-5 xl:sticky xl:top-[76px] xl:self-start
```

Inside, four blocks separated by `mt-6`: header with badge, a two-column
definition list, a metric well, and notes. The metric well is the one filled
region on the page:

```
mt-6 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-3 py-4 text-center
```

### Filter bar

```
flex flex-wrap items-center gap-2
```

Search is `min-w-[200px] flex-1 sm:max-w-[280px]` with an `h-8` input, a
`pl-8` inset for the icon, and the icon at
`absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400`.

The filter trigger and chips share the `h-8` height and a `stone-100` tint:

```
// trigger
h-8 gap-1.5 bg-stone-100/70 text-[11px] text-stone-600 hover:bg-stone-100 hover:text-stone-900

// chip
inline-flex h-8 items-center rounded-lg bg-stone-100/80 pr-1 text-[11px] text-stone-700
```

The chip is two buttons in one shell: the label reopens the editor, the `X`
removes the clause. Status text (`Loading`, row count) is pushed right with
`ml-auto` at `text-[11px] text-stone-400`.

### Popover internals

Editors share a header and a footer.

```
// header
flex items-center justify-between gap-2 border-b border-stone-100 px-2.5 py-2
// title: text-[11px] font-semibold text-stone-800
// hint:  mt-0.5 text-[10px] text-stone-400

// footer
border-t border-stone-100 px-2.5 py-2.5
```

Internal rules are `stone-100`, one step lighter than the page's `stone-200/70`
— inside a small overlay a full-weight rule dominates.

Date fields:

```
h-7 w-[104px] rounded-md border bg-white px-2 text-[11px] tabular-nums text-stone-800
transition-colors placeholder:tracking-tight placeholder:text-stone-300
focus:outline-none focus:ring-2 focus:ring-stone-900/10

valid:   border-stone-200 focus:border-stone-300
invalid: border-red-300 text-red-600
```

The format hint below is always visible at `mt-1.5 text-[10px] text-stone-400`,
switching to `text-red-600` with `role="alert"` when parsing fails. It is
permanent rather than conditional because it is the only signal that the field
accepts typing at all.

---

## AG Grid theme

Built with `themeQuartz.withParams`. The goal is a grid that looks like part of
the page rather than an embedded widget.

```ts
const THEME_PARAMS = {
  accentColor: '#2563eb',
  backgroundColor: '#ffffff',
  borderColor: '#F0EFEE',
  browserColorScheme: 'light',
  columnBorder: false,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 12,
  foregroundColor: '#44403c',
  headerBackgroundColor: '#ffffff',
  headerColumnBorder: false,
  headerFontSize: 10,
  headerFontWeight: 600,
  headerRowBorder: { style: 'solid', width: 1, color: '#E7E5E4' },
  headerTextColor: '#a8a29e',
  rowBorder: { style: 'solid', width: 1, color: '#F1F1F0' },
  rowHoverColor: '#F8F8F7',
  selectedRowBackgroundColor: '#EEF4FF',
  wrapperBorder: false,
  wrapperBorderRadius: 0,
} as const;
```

| Param | Why |
| --- | --- |
| `wrapperBorder: false`, `wrapperBorderRadius: 0` | Removes the outer frame so the grid sits on the canvas |
| `columnBorder`, `headerColumnBorder: false` | No vertical rules; alignment alone separates columns |
| `rowBorder` `#F1F1F0` | Barely-there dividers; anything darker turns the table into a ledger |
| `headerRowBorder` `#E7E5E4` | The one line strong enough to read as structure |
| `headerTextColor` `#a8a29e` | Matches `stone-400` labels elsewhere |
| `headerFontSize: 10`, `headerFontWeight: 600` | Matches the eyebrow label signature |
| `backgroundColor: #ffffff` | Must equal the page, or pinned columns show as a panel |
| `rowHoverColor` `#F8F8F7` | Perceptible while scanning, invisible at rest |
| `selectedRowBackgroundColor` `#EEF4FF` | The only chromatic fill in the grid |
| `foregroundColor` `#44403c` | `stone-700` |

Header text is uppercased by writing `headerName` in capitals rather than with
CSS, so AG Grid measures the real string.

Density switches spacing and heights together:

```ts
const DENSITY = {
  comfortable: { theme: themeQuartz.withParams({ ...THEME_PARAMS, spacing: 6 }), rowHeight: 42, headerHeight: 38 },
  compact:     { theme: themeQuartz.withParams({ ...THEME_PARAMS, spacing: 4 }), rowHeight: 32, headerHeight: 32 },
};
```

Build these once at module scope. `withParams` produces a new theme object, and
calling it during render remounts the grid on every pass.

Two behaviours need CSS the theme API cannot reach — resize handles that would
otherwise reinstate the column rules, and the height of shimmer bars in loading
rows. Both are in the [stylesheet](#stylesheet).

Status is a dot rather than a pill, because a pill on every row reads as a
column of badges:

```tsx
<span className={`flex h-full items-center gap-2 ${style.text}`}>
  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
  {value}
</span>
```

---

## Motion

Everything is short, and nothing that shares a line with text moves.

| Animation | Duration | Easing | Properties |
| --- | --- | --- | --- |
| `pop-in` (overlay open) | 140ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `opacity`, `scale(0.97→1)` |
| `pop-out` (overlay close) | 90ms | `ease-in` | `opacity` |
| `dash-fade-soft` (refresh indicator) | 260ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `opacity` |
| `sk-sweep` (skeleton shimmer) | 1600ms, infinite | `cubic-bezier(0.4, 0, 0.2, 1)` | `transform` |
| `dash-stale` (dimming) | 180ms | `ease` | `opacity`, `filter` |
| Top bar hairline | 200ms | default | `border-color` |
| Recharts series | 450ms | Recharts default | — |

`cubic-bezier(0.16, 1, 0.3, 1)` is the house curve: fast out, long settle.

**The refresh indicator fades but never translates.** It remounts whenever data
ticks, so with a `translateY` it would spend most of its visible life mid-slide
and read as misaligned against the title beside it. This is the single most
common way to make the header look broken.

**Overlays scale from their trigger.** Radix exposes
`--radix-popover-content-transform-origin`; using it is what makes the popover
appear to come from the button rather than from its own centre.

**The shimmer is a moving gradient, not a pulse.** Skeleton groups stagger by
120ms and 240ms so a cluster reads as one surface rather than several blinking
rectangles.

Every animation is disabled under `prefers-reduced-motion`, with the shimmer
falling back to a flat `#eeedec` fill rather than nothing.

---

## Stylesheet

Global CSS, in full. Everything here is required.

```css
/* ---------------------------------------------------------------------------
   Loading: shimmering skeletons for first paint, a quiet dimmed state for
   refreshes of data that is already on screen.
   --------------------------------------------------------------------------- */

.sk-shimmer {
  position: relative;
  overflow: hidden;
  background: #f2f1f0;
}

.sk-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.75) 50%, transparent 100%);
  transform: translateX(-100%);
  animation: sk-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes sk-sweep {
  to {
    transform: translateX(100%);
  }
}

/* Staggering the sweep makes a group of skeletons read as one surface. */
.sk-stagger > *:nth-child(2n)::after {
  animation-delay: 120ms;
}

.sk-stagger > *:nth-child(3n)::after {
  animation-delay: 240ms;
}

/* Data stays readable while the next response lands. */
.dash-stale {
  opacity: 0.45;
  filter: saturate(0.55);
  transition: opacity 180ms ease, filter 180ms ease;
}

/* Opacity only. Anything sharing a line box with text can't afford to be
   translated in: the indicator remounts as data ticks, so it would spend much
   of its visible life mid-slide and read as misaligned against the title. */
.dash-fade-soft {
  animation: dash-fade-soft 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dash-fade-soft {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Overlays settle in from their trigger rather than appearing all at once. */
[data-slot='popover-content'] {
  transform-origin: var(--radix-popover-content-transform-origin);
  animation: pop-in 140ms cubic-bezier(0.16, 1, 0.3, 1);
}

[data-slot='popover-content'][data-state='closed'] {
  animation: pop-out 90ms ease-in;
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes pop-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* AG Grid loading rows: same rhythm as the card skeletons. */
.issuance-grid .ag-row-loading .sk-shimmer {
  height: 9px;
}

/* Resize handles read as column rules at rest, so only show them on hover. */
.issuance-grid .ag-header-cell-resize::after {
  background-color: transparent;
  transition: background-color 120ms ease;
}

.issuance-grid .ag-header-cell-resize:hover::after {
  background-color: #d6d3d1;
}

@media (prefers-reduced-motion: reduce) {
  .sk-shimmer::after {
    animation: none;
  }

  .sk-shimmer {
    background: #eeedec;
  }

  .dash-fade-soft,
  [data-slot='popover-content'] {
    animation: none;
  }

  .dash-stale {
    transition: none;
  }
}
```

Plus the chart tokens, inside the light theme block:

```css
:root {
  --chart-1: oklch(0.52 0.17 258);
  --chart-2: oklch(0.62 0.13 250);
  --chart-3: oklch(0.71 0.1 245);
  --chart-4: oklch(0.79 0.07 242);
  --chart-5: oklch(0.87 0.045 240);
}

@theme inline {
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
}
```

No AG Grid stylesheet import is needed. The Theming API injects its own styles
from the theme object, and importing the legacy `ag-grid.css` alongside it
produces conflicting rules.

---

## Chart wrapper

`ChartContainer` and `ChartTooltipContent` in full. The tooltip diverges
substantially from the stock shadcn version: it caps rows, drops empty series,
ranks by the hovered point's own values, and takes a footer. All four are used.

```tsx
import * as React from 'react';
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string }>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('Chart components must be used inside ChartContainer');
  return context;
}

export function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>['children'];
}) {
  const colorVariables = Object.entries(config).reduce<React.CSSProperties>(
    (variables, [key, item]) => {
      if (item.color) {
        (variables as Record<string, string>)[`--color-${key}`] = item.color;
      }
      return variables;
    },
    {},
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        className={cn(
          'flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70 [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none',
          className,
        )}
        style={{ ...colorVariables, ...style }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsTooltip;

type TooltipItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  payload?: Record<string, unknown>;
};

function numericValue(value: TooltipItem['value']) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  nameKey,
  valueFormatter,
  labelFormatter,
  footer,
  maxRows,
  hideEmpty = false,
  rankRows = false,
  emptyLabel = 'No data',
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: React.ReactNode;
  className?: string;
  hideLabel?: boolean;
  nameKey?: string;
  valueFormatter?: (value: TooltipItem['value'], item: TooltipItem) => React.ReactNode;
  labelFormatter?: (label: React.ReactNode, payload: TooltipItem[]) => React.ReactNode;
  /** Rendered under the rows — a stack total, for instance. */
  footer?: (payload: TooltipItem[]) => React.ReactNode;
  /** Rows past this count collapse into a single summary line. */
  maxRows?: number;
  /** Drop series that contributed nothing to this point. */
  hideEmpty?: boolean;
  /** Order by this point's own values rather than the series order. */
  rankRows?: boolean;
  emptyLabel?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  const rows = payload.map((item, index) => {
    const payloadName = nameKey && item.payload ? item.payload[nameKey] : item.name ?? item.dataKey;
    const key = String(payloadName ?? item.dataKey ?? 'value');
    const itemConfig = config[key] ?? config[String(item.dataKey ?? '')];
    return {
      id: `${key}-${index}`,
      label: itemConfig?.label ?? key,
      color: item.color ?? itemConfig?.color,
      value: item.value,
      numeric: numericValue(item.value),
      item,
    };
  });

  const present = hideEmpty ? rows.filter((row) => row.numeric !== 0) : rows;
  const ordered = rankRows ? [...present].sort((a, b) => b.numeric - a.numeric) : present;

  // Collapsing a single row would trade it for a line that says less.
  const collapse = maxRows !== undefined && ordered.length > maxRows + 1;
  const shown = collapse ? ordered.slice(0, maxRows) : ordered;
  const rest = collapse ? ordered.slice(maxRows) : [];
  const restTotal = rest.reduce((sum, row) => sum + row.numeric, 0);

  const renderValue = (value: TooltipItem['value'], item: TooltipItem) => {
    if (valueFormatter) return valueFormatter(value, item);
    if (Array.isArray(value)) return value.join('–');
    return value != null ? String(value) : '—';
  };

  return (
    <div
      className={cn(
        'grid min-w-32 max-w-[17rem] gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-2 text-xs shadow-lg',
        className,
      )}
    >
      {!hideLabel && label != null && (
        <p className="font-medium text-foreground">
          {labelFormatter ? labelFormatter(label, payload) : String(label)}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-muted-foreground">{emptyLabel}</p>
      ) : (
        shown.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 font-mono font-medium tabular-nums text-foreground">
              {renderValue(row.value, row.item)}
            </span>
          </div>
        ))
      )}

      {rest.length > 0 && (
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0" aria-hidden />
            <span className="truncate">{rest.length} more</span>
          </span>
          <span className="shrink-0 font-mono tabular-nums">
            {renderValue(restTotal, rest[0].item)}
          </span>
        </div>
      )}

      {footer && <div className="mt-0.5 border-t border-border/70 pt-1.5">{footer(payload)}</div>}
    </div>
  );
}
```

`max-w-[17rem]` with `truncate` on labels is what stops a long category name
from stretching the tooltip across the chart. The `min-w-32` keeps a
single-series tooltip from collapsing to the width of its number.

Why the tooltip behaviour is needed at all is covered in
[02-functional-spec.md](./02-functional-spec.md#high-cardinality-dimensions).
