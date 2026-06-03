# Provenance & Data‑Lineage UI — Implementation Spec

A portable pattern for **traceable figures**: any headline number carries a source citation;
clicking it slides a full‑height **provenance canvas** in from the right (split screen)
showing the SQL query chain and the underlying rows behind the number. The goal is banker
trust — a figure is never invented, it's an explicit source + query chain you can inspect.

Stack assumed: **React + TypeScript + Tailwind CSS**. No charting dep needed for the canvas.

> **Prerequisite:** this builds on the self‑hydrating components in
> **[`components-hydration.md`](./components-hydration.md)** — that doc owns `useHydration`,
> `Skeleton`/`Hydrate`, and the host components whose figures become traceable. This doc
> covers only the lineage layer: `Traceable`, the split screen, the canvas, and the data
> contract.

---

## 1. Concepts & file map

| Concern | Artifact | Section |
|---|---|---|
| Inline "trace" affordance on a figure | `Traceable` | 3 |
| Split‑screen container + slide animation | `LineageView` | 4 |
| Provenance canvas (header → step selector → SQL + table) | `ProvenanceCanvas` | 5 |
| Step dropdown (scales to N query steps) | `QueryStepMenu` | 5.2 |
| Data model / backend contract | `lineageData.ts` types | 6 |
| Wiring to real data | seams | 7 |

```
lineage/
  Traceable.tsx            // inline citation chip + hover underline
  LineageView.tsx          // split-screen container + selection state
  ProvenanceCanvas.tsx     // right panel: SQL + underlying table
  lineageData.ts           // types + (mock) provenance content
  components/              // your traceable charts/metrics (see components-hydration.md)
```

---

## 2. How a component becomes traceable

The host component (a KPI card, donut, etc. from `components-hydration.md`) wraps its
**headline value** in `<Traceable>` and accepts a `trace` prop the container supplies. That
is the entire integration surface:

```tsx
const COMPONENT_ID = 'allocation-geography';   // must match a ComponentLineage.id

<Traceable componentId={COMPONENT_ID} citation="S1" {...trace}>
  <p className="text-sm font-semibold text-stone-900">Allocations by geography</p>
</Traceable>
```

For a KPI, wrap the number instead of the title. Everything else about building the
component (hydration phases, skeletons, charts) is in `components-hydration.md`.

---

## 3. `Traceable` — the inline affordance

Wraps a figure with a dotted‑underline‑on‑hover and a small superscript **citation chip**
(e.g. `S1`). Click opens / repoints the canvas. No chrome on the card itself.

```tsx
import type { ReactNode } from 'react';

export interface TraceWiring {     // passed from the container to every component
  active: boolean;                 // is THIS figure the one open in the canvas
  revealAll: boolean;              // global "Inspect" toggle shows all chips at once
  onTrace: (componentId: string) => void;
}

export function Traceable({ componentId, citation, active = false, revealAll = false, onTrace, children }: {
  componentId: string; citation?: string; children: ReactNode;
} & TraceWiring) {
  const chipVisible = revealAll || active;
  return (
    <button type="button" onClick={() => onTrace(componentId)} title="Trace this figure to its source"
      className={`group/trace inline-flex items-start gap-0.5 rounded-md text-left transition-colors ${active ? 'bg-stone-900/[0.04]' : ''}`}>
      <span className={`-mb-px border-b border-dashed transition-colors ${
        active ? 'border-stone-400' : 'border-transparent group-hover/trace:border-stone-300'}`}>
        {children}
      </span>
      {citation && (
        <span className={`mt-0.5 inline-flex h-3.5 items-center rounded px-1 align-super text-[9px] font-semibold leading-none ring-1 ring-inset transition-all ${
          active ? 'bg-stone-900 text-white ring-stone-900'
                 : `bg-stone-100 text-stone-500 ring-stone-200 ${chipVisible ? 'opacity-100' : 'opacity-0 group-hover/trace:opacity-100'}`}`}>
          {citation}
        </span>
      )}
    </button>
  );
}
```

---

## 4. Split‑screen container + slide animation

The container owns selection state and renders two panes side by side. **Key animation
trick:** the right `<aside>` is *always mounted*; only its `width` animates (`0% → 44% →
68%`). Keep the last‑selected lineage in a ref so it stays rendered while sliding closed.

```tsx
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ProvenanceCanvas } from './ProvenanceCanvas';
import { getLineage, type ComponentLineage } from './lineageData';
import type { HydrationMode } from '../components/useHydration';

export interface TraceWiring { active: boolean; revealAll: boolean; onTrace: (id: string) => void; }

export function LineageView() {
  const [mode] = useState<HydrationMode>('progressive');
  const [runId] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [revealAll] = useState(false);

  const onTrace = useCallback(
    (id: string) => setActiveId((cur) => (cur === id ? null : id)),   // click again to close
    [],
  );

  const open = activeId !== null;
  const active = activeId ? getLineage(activeId) ?? null : null;

  // Keep last lineage mounted so the panel can animate *closed*, not vanish.
  const lastRef = useRef<ComponentLineage | null>(null);
  if (active) lastRef.current = active;
  const panelLineage = active ?? lastRef.current;

  const wiringFor = (id: string): TraceWiring => ({ active: activeId === id, revealAll, onTrace });
  const shared = { mode, runId };

  return (
    <div className="flex h-full">
      {/* LEFT: content, scrolls independently. Grid reflows as the split opens. */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
          <div className={`grid gap-4 ${
            open ? (expanded ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2')
                 : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            <Card active={activeId === 'allocation-geography'}>
              <AllocationDonut delay={0} {...shared} trace={wiringFor('allocation-geography')} />
            </Card>
            {/* ...more traceable components... */}
          </div>
        </div>
      </div>

      {/* RIGHT: always mounted; width animates → smooth slide. lg+ only. */}
      <aside aria-hidden={!open}
        className={`hidden shrink-0 overflow-hidden border-stone-200 bg-white lg:block
          transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]
          ${open ? 'border-l' : 'pointer-events-none border-l-0'}`}
        style={{ width: open ? (expanded ? '68%' : '44%') : '0%' }}>
        {panelLineage && (
          <div className={`h-full min-w-[440px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
            <ProvenanceCanvas lineage={panelLineage} expanded={expanded}
              onToggleExpand={() => setExpanded((v) => !v)}
              onClose={() => { setActiveId(null); setExpanded(false); }} />
          </div>
        )}
      </aside>
    </div>
  );
}

function Card({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${
      active ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'}`}>
      {children}
    </div>
  );
}
```

**Why these choices**
- Animate `width` (not mount/unmount) → the panel glides; the flex sibling reflows in lockstep.
- `min-w-[440px]` inner + `overflow-hidden` outer → content is revealed left‑to‑right, no squish.
- `ease-[cubic-bezier(0.22,1,0.36,1)]` (ease‑out‑expo‑ish) over ~420ms feels "sublime".
- Split is `lg`‑only; on small screens fall back to a bottom sheet or full‑screen route.
- Expand toggle widens 44% → 68% for wide source tables.

---

## 5. `ProvenanceCanvas` — the lineage view layout

Top‑to‑bottom: **header** (title + figure + as‑of + expand/close) → **step selector**
(scales to N query steps via a dropdown) → **body** (SQL block, then the underlying table).
One query step at a time, full width for the data.

### 5.1 Shell + header + step selector

```tsx
export function ProvenanceCanvas({ lineage, expanded, onToggleExpand, onClose }: {
  lineage: ComponentLineage; expanded: boolean; onToggleExpand: () => void; onClose: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => setStepIdx(0), [lineage.id]);   // reset when a new figure is traced
  const steps = lineage.steps;
  const headline = lineage.results.find((r) => r.emphasis) ?? lineage.results[0];
  const asOf = lineage.sources.reduce((a, b) => (a.asOf.length >= b.asOf.length ? a : b)).asOf;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-stone-900">{lineage.title}</h3>
            {headline && (
              <p className="mt-0.5 text-xs text-stone-500">
                <span className="font-semibold text-stone-800">{headline.value}</span>
                <span className="text-stone-400"> · </span>{lineage.subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={onToggleExpand} className="hidden rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 lg:block">⤢</button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">✕</button>
          </div>
        </div>
        <p className="mt-2 text-right text-[10px] text-stone-400">as of {asOf}</p>
      </div>

      {/* Step selector — align label + dropdown on the SAME text baseline */}
      <div className="flex h-11 items-center border-b border-stone-200 px-4">
        <div className="flex items-baseline gap-3">
          <span className="text-[13px] font-medium leading-4 text-stone-400">Source data</span>
          {steps.length > 0 && <QueryStepMenu steps={steps} value={stepIdx} onChange={setStepIdx} />}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <DataTab key={`${lineage.id}-${stepIdx}`} step={steps[Math.min(stepIdx, steps.length - 1)]}
                 stepIndex={stepIdx} stepCount={steps.length} />
      </div>
    </div>
  );
}
```

> **Baseline alignment gotcha:** to align a plain label with a padded dropdown button, put
> both in a `flex items-baseline` group, give both identical text metrics
> (`text-[13px] leading-4 font-medium`), zero the button's vertical padding, and
> `self-center` only the chevron icon (icons have no text baseline).

### 5.2 Step dropdown (scales to any number of steps)

A breadcrumb‑style trigger (`Step label  n/total ⌄`) opening a `listbox`. Collapses to plain
text when there's a single step. Closes on outside‑click / Escape.

```tsx
function QueryStepMenu({ steps, value, onChange }: {
  steps: QueryStep[]; value: number; onChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const step = steps[Math.min(value, steps.length - 1)];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (steps.length === 1) return <span className="text-[13px] font-medium leading-4 text-stone-800">{step.label}</span>;

  return (
    <div ref={ref} className="relative inline-flex items-baseline">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="-mx-1 inline-flex max-w-[13rem] items-baseline gap-1.5 rounded-md px-1 text-[13px] font-medium leading-4 text-stone-800 hover:bg-stone-100">
        <span className="truncate leading-4">{step.label}</span>
        <span className="shrink-0 tabular-nums font-normal leading-4 text-stone-400">{value + 1}/{steps.length}</span>
        <span className={`self-center transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 max-h-60 w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          {steps.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === value}>
              <button onClick={() => { onChange(i); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${i === value ? 'bg-stone-50 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}>
                <span className="w-5 shrink-0 tabular-nums text-stone-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset ${KIND_STYLE[s.kind]}`}>{s.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 5.3 Body: SQL block + underlying table

The hero. SQL in a dark mono block; below it the **underlying rows** with contributing rows
in normal weight and **excluded rows greyed + struck through** so the `WHERE` clause is
visible in the data. A one‑line `resultNote` ties the rows back to the figure.

```tsx
function DataTab({ step, stepIndex, stepCount }: { step: QueryStep; stepIndex: number; stepCount: number }) {
  return (
    <div className="lab-fade-in space-y-4">
      {stepCount > 1 && (
        <p className="text-[11px] text-stone-400">
          Query {stepIndex + 1} of {stepCount}
          <span className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 font-medium ring-1 ring-inset ${KIND_STYLE[step.kind]}`}>{step.kind}</span>
        </p>
      )}
      <pre className="overflow-x-auto rounded-xl bg-stone-900 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-stone-100">
        <code>{step.sql}</code>
      </pre>
      <StepTable table={step.table} />
    </div>
  );
}

function StepTable({ table }: { table: UnderlyingTable }) {
  return (
    <div>
      <p className="mb-2 truncate font-mono text-[11px] text-stone-500">{table.caption}</p>
      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 text-stone-500">
            <tr>{table.columns.map((c, ci) => (
              <th key={c} className={`whitespace-nowrap px-3 py-2 font-medium ${table.numericCols?.includes(ci) ? 'text-right' : ''}`}>{c}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {table.rows.map((row, ri) => (
              <tr key={ri} className={!row.contributes ? 'bg-stone-50/60 text-stone-400'
                                       : row.emphasis ? 'bg-amber-50/60' : 'hover:bg-stone-50'}>
                {row.cells.map((cell, ci) => {
                  const numeric = table.numericCols?.includes(ci);
                  return (
                    <td key={ci} className={`whitespace-nowrap px-3 py-1.5
                      ${numeric ? 'text-right tabular-nums' : ''} ${ci === 0 ? 'font-medium' : ''}
                      ${row.contributes ? 'text-stone-700' : 'text-stone-400 line-through'}`}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">{table.resultNote}</p>
    </div>
  );
}
```

---

## 6. Data model (`lineageData.ts`)

The contract a junior dev wires to a real backend. The figure is **never invented**: a
source + an explicit, ordered query chain produces it, and each step carries the rows it ran
over.

```ts
export type SourceTier = 1 | 2 | 3;             // 1 confirmed · 2 unaudited · 3 modelled
export type TransformKind = 'filter' | 'join' | 'aggregate' | 'derive' | 'assumption';

export interface DataSource {
  id: string;           // citation id shown in the chip, e.g. "S1"
  name: string; system: string; tier: SourceTier;
  owner: string; asOf: string; freshness: string; rowCount: number; description: string;
}

export interface UnderlyingRow {
  cells: (string | number)[];
  contributes: boolean;   // false → greyed + struck through (excluded by WHERE)
  emphasis?: boolean;     // highlight the result/headline row
}

export interface UnderlyingTable {
  caption: string; columns: string[];
  numericCols?: number[];           // right-align + tabular-nums
  rows: UnderlyingRow[]; resultNote: string;
}

/** One stage of the query chain. Click-through in the canvas. */
export interface QueryStep {
  id: string; label: string;        // short, e.g. "Live orders"
  kind: TransformKind; sql: string; table: UnderlyingTable;
}

export interface ResultValue { label: string; value: string; citation?: string; emphasis?: boolean; }

export interface ComponentLineage {
  id: string;                       // matches Traceable componentId
  title: string; subtitle: string;
  sources: DataSource[];
  results: ResultValue[];           // headline + supporting figures
  formula: string;
  steps: QueryStep[];               // the query chain (1..N)
}

export const lineageComponents: ComponentLineage[] = [ /* ... */ ];
export const getLineage = (id: string) => lineageComponents.find((c) => c.id === id);
```

Example `steps` for an "oversubscription = book ÷ deal size" metric (3 SQL steps):

```ts
steps: [
  { id: 'Q1', label: 'Pull orders', kind: 'filter',
    sql: `SELECT investor, type, order_size, status
FROM bookbuild.orders WHERE deal_id = 'X' ORDER BY order_size DESC;`,
    table: { caption: 'bookbuild.orders', columns: ['Investor','Type','€m','Status'], numericCols: [2],
      resultNote: 'Pulled orders excluded in the next step.',
      rows: [ { cells: ['Aldgate AM','AM',250,'live'], contributes: true },
              { cells: ['Sable Fund','HF',90,'pulled'], contributes: false } ] } },
  { id: 'Q2', label: 'Final book', kind: 'aggregate', sql: `SELECT SUM(order_size) ... GROUP BY status;`,
    table: { /* ... emphasis row = live total ... */ } as any },
  { id: 'Q3', label: 'Cover ratio', kind: 'derive', sql: `SELECT 4.10 / final_size ...;`,
    table: { /* ... */ } as any },
],
```

Shared style map used across canvas + dropdown:

```ts
const KIND_STYLE: Record<TransformKind, string> = {
  filter:     'bg-stone-100 text-stone-600 ring-stone-200',
  join:       'bg-indigo-50 text-indigo-700 ring-indigo-200',
  aggregate:  'bg-blue-50 text-blue-700 ring-blue-200',
  derive:     'bg-stone-900 text-white ring-stone-900',
  assumption: 'bg-amber-100 text-amber-800 ring-amber-300',
};
```

---

## 7. Wiring to real data

Replace the mock layer at three seams:
1. **`getLineage(id)`** → fetch provenance for a figure id (lazy on first trace is fine).
2. **`QueryStep.sql` / `table`** → the real executed SQL and a *sample* of source rows
   (paginate the full set in production; mark `contributes`/`emphasis` server‑side).
3. **`DataSource.tier` / `asOf`** → from your catalog/metadata so trust + freshness are real.

The UI contract (`ComponentLineage`) is the only thing components depend on — keep it stable
and the rest is drop‑in.

---

## 8. Checklist for a new project

- [ ] First set up the components per **[`components-hydration.md`](./components-hydration.md)**.
- [ ] Copy `Traceable`, `LineageView`, `ProvenanceCanvas`, and the `lineageData` types.
- [ ] Wrap each headline figure in `Traceable`; give the component a stable `componentId`
      matching a `ComponentLineage.id`; pass `trace` from `LineageView`.
- [ ] Implement `getLineage` against your API; mark `contributes`/`emphasis` server‑side.
- [ ] Verify: click figure → slide open ~420ms, step dropdown, SQL + struck‑through excluded
      rows, expand toggle, click‑again/✕ to slide closed.
- [ ] Add a small‑screen fallback (bottom sheet / route) since the split is `lg`‑only.
```
