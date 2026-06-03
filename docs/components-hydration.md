# Self‑Hydrating Domain Components — Implementation Spec

A portable pattern for **data components that "write themselves in"**: the frame lands
first, skeletons fill every slot, labels resolve, then live values and charts draw in.
Built around one timing hook (`useHydration`) and one cross‑fade wrapper (`Hydrate`), then
applied to a catalogue of bond‑issuance components (KPI cards, donuts, bar charts, deal
snapshots, secondary‑market panels).

Stack assumed: **React + TypeScript + Tailwind CSS + Recharts**. No other deps.
All data is mock/local — wire to real APIs where each component reads its module data.

> **Lineage:** any headline figure here can be made *traceable* — clicking it slides in a
> provenance canvas showing the SQL + source rows behind the number. That layer is a
> separate concern; see **[`data-lineage.md`](./data-lineage.md)**. The only seam is §8.

---

## 1. Concepts & file map

| Concern | Artifact | Section |
|---|---|---|
| Timing engine (frame → labels → data → done) | `useHydration` | 3 |
| Cross‑fade skeleton → content | `Hydrate`, `Skeleton*` | 4 |
| Shared anatomy every component follows | — | 5 |
| Component catalogue (the archetypes) | §6.1–6.7 | 6 |
| Composing a view (stagger, controls) | lab view | 7 |
| Making a figure traceable | `Traceable` seam | 8 |

Suggested folder:

```
components/
  useHydration.ts          // timing engine
  Skeleton.tsx             // SkeletonBlock/Text/Circle + Hydrate
  data.ts                  // typed mock data (one export per component)
  KpiCard.tsx              // §6.1
  KpiStrip.tsx             // §6.2
  Donut.tsx                // §6.3
  BarBreakdown.tsx         // §6.4
  StackedBar.tsx           // §6.5
  PerformancePanel.tsx     // §6.6
  DealSnapshot.tsx         // §6.7
```

---

## 2. The mental model

Components don't pop in fully formed; they resolve through ordered **phases** so a banker
sees structure before numbers. The same component renders identically in `progressive`
(staged) and `instant` (jump to done) modes — only the timing differs. Layout never shifts:
every slot reserves its final size with a skeleton of the same footprint.

```
frame ── bordered card exists
  └─ scaffold ── skeleton placeholders for every slot
       └─ labels ── static titles/legends resolve
            └─ data ── real values + charts draw in
                 └─ done ── trailing animations (sparklines) settle
```

---

## 3. `useHydration` — the timing engine

Advances an index through `HYDRATION_PHASES` on a timer. `mode:'instant'` jumps to the end
(use for reduced‑motion or re‑renders). Bump `runId` to replay. `delay` staggers siblings
so a grid builds in a wave rather than all at once.

```ts
import { useEffect, useState } from 'react';

export const HYDRATION_PHASES = ['frame', 'scaffold', 'labels', 'data', 'done'] as const;
export type HydrationPhase = (typeof HYDRATION_PHASES)[number];
export type HydrationMode = 'progressive' | 'instant';

const LAST = HYDRATION_PHASES.length - 1;

export function useHydration({
  mode, runId, delay = 0, stepMs = 380,
}: { mode: HydrationMode; runId: number; delay?: number; stepMs?: number }) {
  const [index, setIndex] = useState(mode === 'instant' ? LAST : 0);

  useEffect(() => {
    if (mode === 'instant') { setIndex(LAST); return; }
    setIndex(0);
    const timers = Array.from({ length: LAST }, (_, i) =>
      window.setTimeout(() => setIndex(i + 1), delay + stepMs * (i + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, [mode, runId, delay, stepMs]);

  return {
    phase: HYDRATION_PHASES[index],
    /** True once the sequence has reached (or passed) the given phase. */
    atLeast: (p: HydrationPhase) => index >= HYDRATION_PHASES.indexOf(p),
    done: index >= LAST,
  };
}
```

Every component takes the same four props and calls the hook once:

```ts
interface HydrationProps { mode: HydrationMode; runId: number; delay?: number; }
const { atLeast } = useHydration({ mode, runId, delay });
```

---

## 4. `Skeleton` + `Hydrate`

```css
/* global stylesheet */
@keyframes lab-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.lab-shimmer {
  background-image: linear-gradient(90deg,#f5f5f4 0%,#ebeae8 20%,#e7e5e4 40%,#ebeae8 60%,#f5f5f4 80%);
  background-size: 200% 100%;
  animation: lab-shimmer 1.5s ease-in-out infinite;
}
@keyframes lab-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.lab-fade-in { animation: lab-fade-in 0.45s cubic-bezier(0.22,1,0.36,1) both; }

@media (prefers-reduced-motion: reduce) { .lab-shimmer, .lab-fade-in { animation: none; } }
```

```tsx
export const SkeletonBlock  = ({ className = '' }) => <div className={`lab-shimmer rounded-md ${className}`} />;
export const SkeletonText   = ({ className = '' }) => <div className={`lab-shimmer rounded ${className}`} />;
export const SkeletonCircle = ({ className = '' }) => <div className={`lab-shimmer rounded-full ${className}`} />;

/** Cross-fades skeleton → content. Keep the skeleton the SAME size as the content. */
export function Hydrate({ ready, skeleton, children }: {
  ready: boolean; skeleton: React.ReactNode; children: React.ReactNode;
}) {
  if (!ready) return <>{skeleton}</>;
  return <div className="lab-fade-in">{children}</div>;
}
```

---

## 5. Shared anatomy (applies to every component)

These rules make the catalogue consistent. Learn them once; §6 just varies the content.

- **Card shell:** `rounded-2xl border border-stone-200 bg-white p-5 shadow-sm` (use `p-4`
  for compact tiles).
- **Reserve height:** wrap the title block in a `min-h-[…]` div so the card doesn't grow
  when the label lands. Same for value rows (`h-4`/`h-7`) and chart areas (fixed `h-*`).
- **Gate per slot, not per card:** title on `atLeast('scaffold')` or `'labels'`; values on
  `'data'`; trailing sparklines on `'done'`. Slots light up in sequence.
- **Charts:** render only at `atLeast('data')`; otherwise draw a **same‑size scaffold**
  (a ring outline for donuts, gridlines for bars, a dashed frame for time series). Use
  Recharts `isAnimationActive` + `animationDuration` (~650–800ms) for the draw‑in.
- **Numbers:** `tabular-nums`, `font-semibold tracking-tight`, `text-stone-900`.
- **Tooltip (dark):** `#1c1917` bg, white text, `borderRadius: 8`, `fontSize: 12`,
  `padding: '6px 10px'`. Reads cleanly on light cards.
- **Trend colour:** up/positive `text-emerald-600` / `#10b981`; down `text-red-600` /
  `#ef4444`; flat `text-stone-500` / `#a8a29e`.
- **Bars that fill:** animate width with `transition-[width] duration-700 ease-out` from
  `0%` → `${pct}%`, flipped on `atLeast('data')`.

---

## 6. Component catalogue

Seven archetypes cover a DCM dashboard. Each lists **when to use**, the **data shape**, and
the **hydration recipe** (which slot resolves at which phase).

### 6.1 Metric card with sparkline (`KpiCard`)

Single headline KPI: label → big value + delta chip → trailing sparkline.

```ts
interface Kpi { id: string; label: string; value: string; delta: string;
  trend: 'up' | 'down' | 'flat'; spark: number[]; }   // spark = relative series, no axis
```

| Slot | Phase |
|---|---|
| label | `labels` |
| value + delta chip | `data` |
| sparkline (Recharts `AreaChart`, gradient fill) | `done` |

```tsx
export function KpiCard({ kpi, mode, runId, delay = 0 }: { kpi: Kpi } & HydrationProps) {
  const { atLeast } = useHydration({ mode, runId, delay });
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="min-h-[2.25rem]">
        <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-28" />}>
          <p className="text-xs font-medium text-stone-500">{kpi.label}</p>
        </Hydrate>
      </div>
      <div className="mt-3">
        <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-7 w-24" />}>
          <span className="text-2xl font-semibold tracking-tight text-stone-900">{kpi.value}</span>
        </Hydrate>
        {/* delta chip on 'data', sparkline AreaChart on 'done' (skeleton = full-width shimmer) */}
      </div>
    </div>
  );
}
```

### 6.2 KPI strip (`KpiStrip`)

A row of compact tiles for the headline numbers of one deal. No charts — label / value /
context only. Tiles share a phase, so the whole strip resolves together.

```ts
interface DealKpi { id: string; label: string; value: string; context: string; positive?: boolean; }
```

Layout `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`. `positive` flips the value to
`text-emerald-600`. Slots: `label` → `labels`; `value` + `context` → `data`.

### 6.3 Donut + legend (`Donut`)

Composition breakdown (currency mix, allocation by geography). Donut on the left, legend
list on the right; both read the same array.

```ts
interface Slice { name: string; value: number; color: string; }   // value = %
```

| Slot | Phase |
|---|---|
| title/subtitle | `scaffold` |
| legend rows (names) | `labels` |
| arcs (`PieChart`/`Pie`, `innerRadius` 52, `outerRadius` 80) + legend % | `data` |

Donut scaffold (keeps footprint): `<div className="h-40 w-40 rounded-full border-[14px] border-stone-100" />`.
Optional center label absolutely positioned over the ring. Tooltip formatter:
`(v: number | undefined, n) => [`${v ?? 0}%`, n]`.

### 6.4 Horizontal bar breakdown (`BarBreakdown`)

Ranked shares with a secondary metric (e.g. allocation % + fill rate). Pure CSS bars — no
chart lib — so each row's width animates independently.

```ts
interface Bar { name: string; pct: number; fillRate: number; color: string; }
```

Per row: name (`labels`) and `pct`/fill (`data`); the bar track is always rendered and its
inner fill animates `width: atLeast('data') ? `${pct}%` : '0%'`. Close with a 3‑up summary
stat row (`totalInvestors`, `avgFillRate`, `granularity`) under a `border-t`.

### 6.5 Stacked / grouped bar chart (`StackedBar`)

Category comparison over a few periods (supply by segment). Recharts stacked `BarChart`;
each series animates in with a stagger.

```ts
interface SupplyDatum { period: string; coveredBonds: number; seniorUnsecured: number; bankCapital: number; }
const segments = [{ key, label, color }, …] as const;   // drives <Bar> per series
```

- Title on `scaffold`; chart on `data`; scaffold = 4 horizontal gridlines.
- `<Bar stackId="supply" isAnimationActive animationDuration={650} animationBegin={i*180}>`
  — the `animationBegin` stagger makes segments stack in sequence.
- Round only the top series: `radius={i === last ? [4,4,0,0] : [0,0,0,0]}`, `maxBarSize={64}`.
- `CartesianGrid` horizontal only (`vertical={false}`), axes hairline (`#e7e5e4`).

### 6.6 Time‑series performance panel (`PerformancePanel`)

Perplexity‑style market panel: header (name + big price + change + trend chip), area chart
with a reoffer reference line, then a 4‑up summary stat grid.

```ts
interface Point { t: string; price: number; spread: number; }
const summary = { bondName, reofferSpread, currentSpread, currentPrice, trend };
const prevClose = 100.0;   // reference line
```

| Slot | Phase |
|---|---|
| name + label | `labels` |
| price + change + trend chip | `data` |
| `AreaChart` (gradient fill, `ReferenceLine y={prevClose}`) | `data` |
| summary stats (reoffer/current spread, price, bid/offer) | `labels`/`data` |

Colour the line by direction: `last.price >= prevClose ? '#10b981' : '#ef4444'`. Chart
scaffold = a dashed frame with a mid gridline. YAxis `domain={['dataMin - 0.05','dataMax + 0.05']}`.

### 6.7 Deal snapshot / tear sheet (`DealSnapshot`)

The dense single‑deal summary: header (issuer + status chip + term chips) and a key‑terms
definition list, closing with a coverage bar.

```ts
interface DealMeta { issuer; bondName; isin; rating; currency; format; esg; status; pricingDate; }
// + a TERMS[] map: { label, value: (d) => string } so values format from one record
```

- Header title on `labels`; status pill + chip row on `data`.
- Terms as a `<dl className="grid grid-cols-2">`; long fields (`Bookrunners`,
  `Use of proceeds`) span `col-span-2`. `dt` resolves at `labels`, `dd` at `data`.
- Coverage bar: track always present, inner fill animates to
  `${min(100, coverage/5*100)}%` on `data`.

---

## 7. Composing a view

A lab view owns `mode` + `runId`, passes `{ mode, runId }` to every child, and **staggers**
`delay` so the page builds top‑to‑bottom in a wave. Mode toggle + Replay also bump `runId`.

```tsx
export function DealTearSheet() {
  const [mode, setMode] = useState<HydrationMode>('progressive');
  const [runId, setRunId] = useState(0);
  const replay = () => setRunId((id) => id + 1);
  const onMode = (m: HydrationMode) => { setMode(m); setRunId((id) => id + 1); };
  const shared = { mode, runId };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      {/* header with Progressive/Instant toggle + Replay → onMode / replay */}
      <DealHeader delay={0} {...shared} />
      <KpiStrip   delay={90} {...shared} />
      <section className="grid gap-4 lg:grid-cols-2">
        <Donut         delay={300} {...shared} />
        <BarBreakdown  delay={390} {...shared} />
      </section>
      <PerformancePanel delay={500} {...shared} />
    </div>
  );
}
```

Stagger guidance: ~90ms between same‑row tiles, ~150–200ms between rows. A KPI row of four
at `delay = i * 90` reads as a left‑to‑right sweep.

---

## 8. Making a figure traceable (the lineage seam)

To let a banker verify a number, wrap its **headline value** (or title) in `<Traceable>` and
give the component a stable `componentId`. Clicking opens the provenance canvas. The host
component is unchanged otherwise — hydration and lineage are orthogonal.

```tsx
import { Traceable } from './Traceable';            // see data-lineage.md §4
import type { TraceWiring } from './LineageView';   // { active, revealAll, onTrace }

const COMPONENT_ID = 'oversubscription';

export function CoverMetric({ trace, ...hyd }: { trace: TraceWiring } & HydrationProps) {
  const { atLeast } = useHydration(hyd);
  return (
    <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-7 w-20" />}>
      <Traceable componentId={COMPONENT_ID} citation="S1" {...trace}>
        <span className="text-2xl font-semibold tabular-nums text-stone-900">3.28x</span>
      </Traceable>
    </Hydrate>
  );
}
```

- `componentId` must match a `ComponentLineage.id` in the lineage data layer.
- The container (`LineageView`) supplies `trace` per component and renders the canvas.
- Everything about the panel, slide animation, SQL/table layout, and data contract lives in
  **[`data-lineage.md`](./data-lineage.md)**.

---

## 9. Checklist for a new project

- [ ] Add the CSS keyframes (§4) to the global stylesheet.
- [ ] Copy `useHydration` and `Skeleton` (`SkeletonBlock/Text/Circle` + `Hydrate`).
- [ ] Build each component to take `{ mode, runId, delay }`, call the hook once, gate every
      slot with `atLeast(phase)`, and reserve heights so nothing jumps.
- [ ] Render charts only at `atLeast('data')` with a same‑size scaffold; animate with
      Recharts `isAnimationActive`.
- [ ] Compose a view that owns `mode`/`runId` and staggers `delay`; add Mode toggle + Replay.
- [ ] Respect `prefers-reduced-motion` (CSS handles it; also offer `mode='instant'`).
- [ ] (Optional) Wrap headline figures in `Traceable` → see **[`data-lineage.md`](./data-lineage.md)**.
```
