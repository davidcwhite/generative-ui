# Trust Cascade Panel — portable implementation kit

A docked, slide-open **provenance panel** that lets a user verify any cited figure
without leaving the conversation. Click a figure in an answer and a full-height
panel slides in from the right. Inside, three nested dropdowns mirror the
conversation hierarchy:

```
Response  ▸  Component (figure)  ▸  Query step  →  SQL + underlying rows
```

Each level is an independent selector, so the panel chrome never grows with the
amount of data behind a figure. This document is a **drop-in kit**: copy the
types, CSS, and components below into any React + Vite app (Tailwind v4 assumed)
and wire them to your own data.

---

## 0. Contents

1. [UX model & principles](#1-ux-model--principles)
2. [Visual anatomy](#2-visual-anatomy)
3. [File manifest](#3-file-manifest)
4. [Data contract](#4-data-contract)
5. [CSS & motion](#5-css--motion)
6. [Icons](#6-icons)
7. [Primitives — Dropdown, Crossfade, SqlBlock, RowsTable](#7-primitives)
8. [Inline trigger — Traceable](#8-inline-trigger--traceable)
9. [The panel — CascadePanel](#9-the-panel--cascadepanel)
10. [The host — CascadeDock](#10-the-host--cascadedock)
11. [Integration guide](#11-integration-guide)
12. [State & interaction model](#12-state--interaction-model)
13. [Design tokens](#13-design-tokens)
14. [Accessibility checklist](#14-accessibility-checklist)
15. [Gotchas & best practices](#15-gotchas--best-practices)

---

## 1. UX model & principles

The feature is built around five rules. They are the reason it feels calm rather
than busy, and they should survive any restyle.

1. **Verify in place.** The panel docks beside the conversation as a split; it
   never covers it with a modal. Reading the answer and inspecting its evidence
   happen side by side.
2. **The panel mirrors the conversation.** Its hierarchy is
   `response → component → query step`. A user who understood the chat already
   understands the panel.
3. **Selectors, not navigation.** Every dropdown *repoints* the same panel — it
   never opens a second one or pushes a new view. Clicking another figure in the
   chat also repoints the open panel instead of stacking.
4. **Chrome is fixed-size; content scrolls.** Each level is a compact dropdown,
   so a figure with 2 query steps and a figure with 20 produce identically sized
   headers. Only the rows area scrolls.
5. **Quiet by default, obvious on intent.** Figures look like prose until
   hovered (dotted underline + citation chip). Dropdowns look like text until
   hovered (subtle wash + chevron). Nothing competes with the answer for
   attention until the user reaches for it.

**Progressive disclosure ladder** (cheapest → most detailed):

```
prose figure → hover underline+chip → hover source preview card → click → docked panel → step dropdown → SQL + rows
```

---

## 2. Visual anatomy

```
┌─────────────────────────────────────────────┬───────────────────────────────┐
│  CONVERSATION (host app)                     │  CASCADE PANEL (slides in)     │
│                                              │                                │
│  …the book closed 3.28x covered…             │ ┌───────────────────────────┐ │
│            └─ Traceable figure ─┘            │ │ ▸ Response 1  · question  ⤢ ✕│ │  ← response dropdown + window controls
│                                              │ ├───────────────────────────┤ │
│  [ figure card ]   [ figure card ]           │ │ ▸ Oversubscription          │ │  ← component dropdown (panel title)
│                                              │ │   3.28x   final book cover  │ │  ← headline value + label
│                                              │ │                             │ │
│                                              │ │ ▸ 2 · Final book            │ │  ← query-step dropdown (fits content)
│                                              │ │ ┌─────────────────────────┐ │ │
│                                              │ │ │ SELECT … (dark SQL)     │ │ │  ← SqlBlock (tone="dark")
│                                              │ │ └─────────────────────────┘ │ │
│                                              │ │  caption                    │ │
│                                              │ │  ── rows table ──           │ │  ← RowsTable (scrolls)
│                                              │ │  result note                │ │
│                                              │ └───────────────────────────┘ │
└─────────────────────────────────────────────┴───────────────────────────────┘
   width animates 0% → 46% (→ 68% expanded) over 420ms
```

Regions, top to bottom inside the panel:

| Region | Contents | Sizing |
|---|---|---|
| **Header** | Response dropdown (left) · expand/collapse + close (right) | fixed, `z-20` |
| **Headline** | Component dropdown (the panel title) → big headline value + label | fixed, `z-10` |
| **Query** | Query-step dropdown (`1 · Pull orders`), grows to fit its label | fixed |
| **Data** | `SqlBlock` then `RowsTable` | **scrolls** (`overflow-y-auto`) |

The headline + query + data regions are wrapped in a `Crossfade` so any selection
dissolves into the next instead of snapping.

---

## 3. File manifest

The kit is self-contained — no third-party UI/animation libraries. Suggested
layout:

```
cascade/
  lineage.ts          # data types + registry helpers (genericize to your domain)
  cascade-panel.css   # 3 keyframe sets + reduced-motion (import once)
  icons.tsx           # 4 inline SVGs (chevron, close, expand, collapse)
  primitives.tsx      # Dropdown, MenuItem, Crossfade, SqlBlock, RowsTable, MetaLine
  Traceable.tsx       # inline figure trigger + hover source preview
  CascadePanel.tsx    # the docked panel (header → headline → query → data)
  CascadeDock.tsx     # host: slide-open <aside>, open/repoint/close, ←/→ keys
```

**Dependencies:** React 18+ and Tailwind CSS v4 (`@import "tailwindcss";`). The
only browser feature beyond the baseline is CSS `@starting-style` (used for the
dropdown enter animation; degrades to an instant open in older browsers).

---

## 4. Data contract

Genericized to a domain-neutral **provenance** shape: a *figure* exposes one or
more headline *values* and the ordered *query steps* that produced it; each step
carries the SQL it ran and the *rows* it operated on. Responses group figures the
way a chat turn groups its cited numbers.

```ts
// lineage.ts

/** What a query step did — drives the small right-hand label in the dropdown. */
export type StepKind =
  | 'filter'
  | 'join'
  | 'aggregate'
  | 'derive'
  | 'assumption';

export const STEP_KIND_LABEL: Record<StepKind, string> = {
  filter: 'Filter',
  join: 'Join',
  aggregate: 'Aggregate',
  derive: 'Derive',
  assumption: 'Assumption',
};

/** One row of a step's underlying table. */
export interface LineageRow {
  cells: (string | number)[];
  /** Does this row feed the final figure? `false` → struck-through + muted. */
  contributes?: boolean;
  /** Highlight as the result row (subtle background + bold). */
  emphasis?: boolean;
}

export interface LineageTable {
  /** Monospace caption above the table, e.g. the source/query. */
  caption: string;
  columns: string[];
  /** Indices of numeric columns (right-aligned, tabular numerals). */
  numericCols?: number[];
  rows: LineageRow[];
  /** One-line plain-language takeaway under the table. */
  note?: string;
}

/** One stage of the chain behind a figure: a SQL-ish query + the data it made. */
export interface QueryStep {
  id: string;
  /** Short label for the dropdown, e.g. "Final book". */
  label: string;
  kind: StepKind;
  sql: string;
  table: LineageTable;
}

/** A headline number the figure asserts. */
export interface FigureValue {
  label: string;
  value: string;
  /** The primary value shown large at the top. Exactly one should be true. */
  emphasis?: boolean;
}

/** Optional provenance metadata for the hover preview / rail variant. */
export interface FigureSource {
  name: string;
  system: string;
  /** 1 = confirmed, 2 = unverified/interim, 3 = reference/modelled. */
  tier: 1 | 2 | 3;
  rowCount: number;
  asOf: string;
}

/** Everything the panel needs to render one figure. */
export interface FigureLineage {
  id: string;
  /** Shown as the panel title (and inside the component dropdown). */
  title: string;
  values: FigureValue[];
  steps: QueryStep[];
  /** Optional — powers the hover preview card and the rail MetaLine. */
  source?: FigureSource;
}

/** A response groups the figures it cited, in display order. */
export interface ResponseGroup {
  id: string;
  /** The user prompt that produced this response. */
  question: string;
  figureIds: string[];
}
```

### Registry + selectors

Keep figures in a flat registry keyed by id; everything else derives from it.

```ts
// lineage.ts (continued)

export interface LineageRegistry {
  responses: ResponseGroup[];
  figures: Record<string, FigureLineage>;
}

/** The value shown large at the top: the emphasised one, else the first. */
export function headlineValue(fig: FigureLineage): FigureValue | undefined {
  return fig.values.find((v) => v.emphasis) ?? fig.values[0];
}

/**
 * Index of the step that *produces* the headline: prefer the step whose
 * emphasised row contains the headline value, else the last step with any
 * emphasised row, else the final step. This is where the panel lands on open.
 */
export function resultStepIndex(fig: FigureLineage): number {
  const head = headlineValue(fig);
  const byValue = fig.steps.findIndex((s) =>
    s.table.rows.some(
      (r) => r.emphasis && r.cells.some((c) => String(c) === head?.value),
    ),
  );
  if (byValue >= 0) return byValue;
  for (let i = fig.steps.length - 1; i >= 0; i -= 1) {
    if (fig.steps[i].table.rows.some((r) => r.emphasis)) return i;
  }
  return fig.steps.length - 1;
}

export const figureById = (reg: LineageRegistry, id: string) => reg.figures[id];

export const responseForFigure = (reg: LineageRegistry, figureId: string) =>
  reg.responses.find((r) => r.figureIds.includes(figureId));

/** Figures cited in a response, in order. */
export const figuresInResponse = (reg: LineageRegistry, res: ResponseGroup) =>
  res.figureIds.map((id) => reg.figures[id]).filter(Boolean) as FigureLineage[];

/** Flat figure order across the whole conversation (for ←/→ cycling). */
export const allFigureIds = (reg: LineageRegistry) =>
  reg.responses.flatMap((r) => r.figureIds);
```

> **Why land on the result step, not step 1?** The user clicked the *headline*
> figure, so the panel should first show the row that *is* that number; they can
> then walk backwards through the earlier steps to see how it was derived.

---

## 5. CSS & motion

Three independent motions, each scoped so it can never trigger a page-level
reflow. Import this once (e.g. in your root stylesheet) **after**
`@import "tailwindcss";`.

```css
/* cascade-panel.css */

/* (A) Figure crossfade — the outgoing snapshot fades out over the incoming one.
   Pure opacity, scoped to the panel body, so a selection dissolves (no jump). */
.cf-enter { animation: cf-fade-in 350ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.cf-leave { animation: cf-fade-out 350ms cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes cf-fade-in  { from { opacity: 0; } }
@keyframes cf-fade-out { to   { opacity: 0; } }

/* (B) Dropdown menu — creamy open/close, grows down from the trigger. Driven by
   a data-state attribute so the *closing* transition can finish before unmount. */
.dd-menu {
  transform-origin: top left;
  transition:
    opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.dd-menu[data-state='open']   { opacity: 1; transform: translateY(0)    scale(1);    }
.dd-menu[data-state='closed'] { opacity: 0; transform: translateY(-4px) scale(0.97); }

/* @starting-style gives the *enter* its from-state on first mount. */
@starting-style {
  .dd-menu[data-state='open'] { opacity: 0; transform: translateY(-4px) scale(0.97); }
}

/* (C) Source-preview hover card — soft fade/rise on open. */
@keyframes lab-fade-in { from { opacity: 0; transform: translateY(4px); } }
.lab-fade-in { animation: lab-fade-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }

/* Respect the user. Note (A) must fully disable so the ghost never lingers —
   see the Crossfade component, which also skips the ghost under reduced motion. */
@media (prefers-reduced-motion: reduce) {
  .cf-enter, .cf-leave, .lab-fade-in { animation: none; }
  .dd-menu { transition: none; }
}
```

The **panel slide** itself is not in this stylesheet — it lives as Tailwind
arbitrary values on the host `<aside>` (see §10), because the width target is
dynamic. The shared easing curve everywhere is `cubic-bezier(0.22, 1, 0.36, 1)`
(a soft "ease-out-back-ish" decelerate); keep it consistent for a coherent feel.

| Motion | Property | Duration | Curve |
|---|---|---|---|
| Panel slide | `width` | 420ms | `cubic-bezier(0.22,1,0.36,1)` |
| Panel fade-in contents | `opacity` | 300ms | default |
| Figure crossfade | `opacity` | 350ms | `cubic-bezier(0.22,1,0.36,1)` |
| Dropdown open/close | `opacity`+`transform` | 180ms | `cubic-bezier(0.22,1,0.36,1)` |
| Source preview | `opacity`+`transform` | 450ms | `cubic-bezier(0.22,1,0.36,1)` |
| Dropdown chevron flip | `transform` | 200ms | default |

> **Do NOT reach for the View Transitions API here.** `document.startView­Transition`
> animates the *whole document* (`::view-transition-old/new(root)`), which causes a
> visible page-wide jitter on every selection. The `Crossfade` component below gets
> the same "dissolve" effect scoped strictly to the panel body. (This was a real
> bug; the local crossfade is the fix.)

---

## 6. Icons

Dependency-free inline SVGs so the kit ships nothing extra. Single-stroke,
`currentColor`, 24×24.

```tsx
// icons.tsx
interface IconProps { className?: string; }

const base = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export const ChevronDownIcon = ({ className = '' }: IconProps) => (
  <svg className={className} {...base}><path d="M6 9l6 6 6-6" /></svg>
);
export const CloseIcon = ({ className = '' }: IconProps) => (
  <svg className={className} {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const ExpandIcon = ({ className = '' }: IconProps) => (
  <svg className={className} {...base}>
    <path d="M15 9l5-5M20 9V4h-5" /><path d="M9 15l-5 5M4 15v5h5" />
  </svg>
);
export const CollapseIcon = ({ className = '' }: IconProps) => (
  <svg className={className} {...base}>
    <path d="M20 4l-5 5M15 4v5h5" /><path d="M4 20l5-5M9 20v-5H4" />
  </svg>
);
```

---

## 7. Primitives

All five live in `primitives.tsx`. They are deliberately small and unopinionated.

### 7.1 Dropdown + MenuItem — the "quiet" selector

The most important detail of the whole feature. The trigger reads as plain text
until hovered, then shows a `stone-100` wash + a chevron that flips on open. It is
**not** a bordered `<select>`-looking control — that read as "crass" in testing.

Mechanics worth preserving:

- **Two-phase mount** (`mounted` + `open`): on open we mount then flip `open`
  true so `@starting-style` can animate the enter; on close we flip `open` false
  to play the exit transition and only unmount in `onTransitionEnd`. This is what
  makes the close animate instead of vanishing.
- **`z-20` on the wrapper while mounted.** Establishes a stacking context above
  sibling panel content, so the menu is never painted *through* by the headline or
  table below it. (Without this the menu looked semi-transparent.)
- **`fitContent`** lets a trigger grow to its label instead of being clamped — the
  query-step dropdown needs this or long step names truncate / wrap to two lines,
  and a clamped width also clips the hover wash off the chevron. Title-level
  dropdowns leave it `false` so they can truncate gracefully in a narrow panel.
- Closes on outside `mousedown` and on `Escape`.

```tsx
// primitives.tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDownIcon } from './icons';
import type { FigureSource, LineageTable } from './lineage';

interface DropdownProps {
  /** Trigger content (style it yourself — it inherits text color). */
  label: ReactNode;
  /** Tailwind width for the menu panel, e.g. "w-72". */
  menuWidth: string;
  /** Optional small uppercase heading inside the menu. */
  menuLabel?: string;
  /** Let the trigger grow to fit its label (use for the query-step dropdown). */
  fitContent?: boolean;
  /** Render-prop so items can close the menu after selecting. */
  children: (close: () => void) => ReactNode;
}

export function Dropdown({
  label, menuWidth, menuLabel, fitContent = false, children,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function toggle() {
    if (open) setOpen(false);          // play exit; unmount on transitionend
    else { setMounted(true); setOpen(true); } // @starting-style plays the enter
  }
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className={`relative ${fitContent ? 'w-fit' : 'min-w-0 max-w-full'} ${mounted ? 'z-20' : ''}`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`group/dd inline-flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
          fitContent ? 'w-fit' : '-mx-1.5 min-w-0 max-w-full'
        } ${
          open
            ? 'bg-stone-100 text-stone-900'
            : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        <span className={fitContent ? undefined : 'min-w-0 overflow-hidden'}>{label}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform duration-200 group-hover/dd:text-stone-600 ${
            open ? 'rotate-180 text-stone-600' : ''
          }`}
        />
      </button>

      {mounted && (
        <div
          role="menu"
          data-state={open ? 'open' : 'closed'}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && !open) setMounted(false);
          }}
          className="dd-menu absolute left-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg"
        >
          <div className={`${menuWidth} bg-white`}>
            {menuLabel && (
              <p className="px-3 pb-2 pt-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">
                {menuLabel}
              </p>
            )}
            {children(close)}
          </div>
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400 ${
        active ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      {children}
    </button>
  );
}
```

### 7.2 Crossfade — dissolve on selection

Keeps the live `children` on top and interactive; when `id` changes it holds the
previous frame underneath and fades it out. The fading copy is `inert` +
`pointer-events-none` so it never steals focus or clicks. **Under reduced motion
it skips the ghost entirely** — otherwise `onAnimationEnd` never fires and stale
rows would bleed through below shorter new content.

```tsx
// primitives.tsx (continued)
export function Crossfade({ id, children }: { id: string; children: ReactNode }) {
  const [prevId, setPrevId] = useState(id);
  const lastChildren = useRef(children);
  const [leaving, setLeaving] = useState<{ id: string; node: ReactNode } | null>(null);

  if (prevId !== id) {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLeaving({ id: prevId, node: lastChildren.current });
    }
    setPrevId(id);
  }
  useEffect(() => { lastChildren.current = children; });

  return (
    <div className="relative min-h-0 flex-1">
      {leaving && (
        <div
          key={leaving.id}
          {...{ inert: '' }} // React 18 DOM types don't expose `inert` yet
          className="cf-leave pointer-events-none absolute inset-0 flex flex-col"
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) setLeaving(null); }}
        >
          {leaving.node}
        </div>
      )}
      <div key={id} className="cf-enter absolute inset-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
```

> **Key choice:** the parent passes a *composite* key — `` `${figureId}:${stepIdx}` ``
> — so the crossfade fires both when you switch figures **and** when you switch
> query steps within a figure.

### 7.3 SqlBlock — dark code with copy

`tone="dark"` (black background, light text) is the docked-panel default; it makes
the query the visual anchor of the data region. The copy button is invisible until
hover/focus.

```tsx
// primitives.tsx (continued — imports already at top of file)
export function SqlBlock({ sql, tone = 'dark' }: { sql: string; tone?: 'light' | 'dark' }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group/sql relative">
      <pre
        className={`overflow-x-auto rounded-xl px-4 py-3 font-mono text-[11px] leading-relaxed ${
          tone === 'dark' ? 'bg-black text-stone-100' : 'bg-stone-50 text-stone-600'
        }`}
      >
        <code>{sql}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(sql);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 group-hover/sql:opacity-100 ${
          tone === 'dark'
            ? 'bg-stone-800 text-stone-400 hover:text-stone-200 focus-visible:ring-stone-500'
            : 'bg-stone-200 text-stone-500 hover:text-stone-700 focus-visible:ring-stone-400'
        }`}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
```

### 7.4 RowsTable — borderless underlying data

Hairline dividers only; excluded rows are struck-through and muted; the result row
gets a subtle `stone-50` background. Numeric columns right-align with tabular
numerals.

```tsx
// primitives.tsx (continued)
export function RowsTable({ table }: { table: LineageTable }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] text-stone-400">{table.caption}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200">
              {table.columns.map((c, ci) => (
                <th
                  key={c}
                  className={`whitespace-nowrap px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-stone-400 first:pl-0 last:pr-0 ${
                    table.numericCols?.includes(ci) ? 'text-right' : ''
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {table.rows.map((row, ri) => (
              <tr key={ri} className={row.emphasis ? 'bg-stone-50' : ''}>
                {row.cells.map((cell, ci) => {
                  const numeric = table.numericCols?.includes(ci);
                  return (
                    <td
                      key={ci}
                      className={`whitespace-nowrap px-2 py-2 first:pl-0 last:pr-0 ${
                        numeric ? 'text-right tabular-nums' : ''
                      } ${ci === 0 ? 'font-medium' : ''} ${
                        row.contributes === false
                          ? 'text-stone-300 line-through'
                          : row.emphasis
                            ? 'font-medium text-stone-900'
                            : 'text-stone-600'
                      }`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-400">{table.note}</p>
      )}
    </div>
  );
}
```

### 7.5 MetaLine (optional)

A single quiet line of provenance — a colored tier dot, source name, row count,
as-of. The dropdown cascade hides it (the question is enough context), but it's
useful if you build the rail variant or want a one-line provenance footer.

```tsx
// primitives.tsx (continued)
const TIER_DOT: Record<1 | 2 | 3, string> = {
  1: 'bg-emerald-500', 2: 'bg-amber-500', 3: 'bg-stone-400',
};
const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Confirmed', 2: 'Interim / unverified', 3: 'Reference / modelled',
};

export function MetaLine({ source }: { source: FigureSource }) {
  const sep = <span className="text-stone-300" aria-hidden>·</span>;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-stone-400">
      <span className="inline-flex items-center gap-1.5 text-stone-500">
        <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[source.tier]}`} aria-hidden />
        {TIER_LABEL[source.tier]}
      </span>
      {sep}<span>{source.name}</span>
      {sep}<span>{source.rowCount.toLocaleString()} {source.rowCount === 1 ? 'row' : 'rows'}</span>
      {sep}<span>as of {source.asOf}</span>
    </p>
  );
}
```

---

## 8. Inline trigger — Traceable

Wrap any figure inside a sentence or card with `<Traceable>`. It adds the
progressive-disclosure affordance: a dashed underline + citation chip on hover,
a source-preview card after a short dwell, and a click that opens (or repoints)
the panel.

Behaviours to preserve:

- **220 ms hover dwell** before the preview appears — long enough not to flash on
  pass-through, short enough to feel responsive. The timer is cleared on
  leave/click.
- **`z-50` on the wrapper only while previewing.** A bare `relative` wrapper has
  *no* stacking context, so the preview card paints *under* neighbouring charts or
  the next card. Elevating only while open keeps the rest of the layout flat.
- **`aria-label`, never `title`.** The native `title` tooltip renders as a
  translucent OS bubble you cannot style and that fights your own card. Use
  `aria-label` for the accessible name and your own element for the visible hint.
- **The chip** shows when the figure is active or globally "revealed"; otherwise
  it appears on hover. Active state flips it to a solid dark chip.

```tsx
// Traceable.tsx
import { useRef, useState, type ReactNode } from 'react';
import type { LineageRegistry } from './lineage';
import { figureById, headlineValue } from './lineage';

interface TraceableProps {
  registry: LineageRegistry;
  /** Figure this span traces to. */
  figureId: string;
  /** Short citation shown in the superscript chip, e.g. "S1". */
  citation?: string;
  /** This figure is the one currently open in the panel. */
  active?: boolean;
  /** Reveal every citation chip at once (a global "inspect" toggle). */
  revealAll?: boolean;
  /** Open or repoint the panel to this figure. */
  onTrace: (figureId: string) => void;
  children: ReactNode;
}

const TIER_DOT: Record<1 | 2 | 3, string> = {
  1: 'bg-emerald-500', 2: 'bg-amber-500', 3: 'bg-stone-400',
};
const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Confirmed', 2: 'Interim / unverified', 3: 'Reference / modelled',
};

export function Traceable({
  registry, figureId, citation, active = false, revealAll = false, onTrace, children,
}: TraceableProps) {
  const chipVisible = revealAll || active;
  const [preview, setPreview] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const open = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreview(true), 220);
  };
  const close = () => {
    window.clearTimeout(timer.current);
    setPreview(false);
  };

  return (
    <span
      className={`relative inline-flex ${preview ? 'z-50' : ''}`}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      <button
        type="button"
        onClick={() => { close(); onTrace(figureId); }}
        aria-label="Trace this figure to its source"
        className={`group/trace inline-flex items-start gap-0.5 rounded-md text-left transition-colors ${
          active ? 'bg-stone-900/[0.04]' : ''
        }`}
      >
        <span
          className={`-mb-px border-b border-dashed transition-colors ${
            active ? 'border-stone-400' : 'border-transparent group-hover/trace:border-stone-300'
          }`}
        >
          {children}
        </span>
        {citation && (
          <span
            className={`mt-0.5 inline-flex h-3.5 items-center rounded px-1 align-super text-[9px] font-semibold leading-none ring-1 ring-inset transition-all ${
              active
                ? 'bg-stone-900 text-white ring-stone-900'
                : `bg-stone-100 text-stone-500 ring-stone-200 ${
                    chipVisible ? 'opacity-100' : 'opacity-0 group-hover/trace:opacity-100'
                  }`
            }`}
          >
            {citation}
          </span>
        )}
      </button>

      {preview && !active && <SourcePreview registry={registry} figureId={figureId} />}
    </span>
  );
}

function SourcePreview({ registry, figureId }: { registry: LineageRegistry; figureId: string }) {
  const fig = figureById(registry, figureId);
  if (!fig) return null;
  const head = headlineValue(fig);
  const source = fig.source;

  return (
    <div className="lab-fade-in absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-lg">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-xs font-semibold text-stone-900">{fig.title}</p>
        {head && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-900">
            {head.value}
          </span>
        )}
      </div>
      {source && (
        <>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
            <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[source.tier]}`} aria-hidden />
            {TIER_LABEL[source.tier]}
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-stone-500">{source.system}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-stone-400">
            <span>{source.rowCount.toLocaleString()} rows</span>
            <span className="text-stone-300">·</span>
            <span>as of {source.asOf}</span>
          </div>
        </>
      )}
      <p className="mt-2 border-t border-stone-100 pt-2 text-[10px] text-stone-400">
        Click to open the full trace
      </p>
    </div>
  );
}
```

---

## 9. The panel — CascadePanel

The panel renders the three-dropdown cascade and the data. It is **controlled**:
it holds only the local query-step index; the active figure and which response
it's in are derived from props. The host owns "what's open" (see §10).

Structure:

1. **Header** (`z-20`) — the response dropdown + window controls. Sits above
   everything so its menu can overlap the headline.
2. **Crossfade body** (`z-10` headline) — keyed on `figure:step`:
   - **Headline** — the component dropdown *is* the title, then the big value.
   - **Query** — the `fitContent` step dropdown.
   - **Data** — `SqlBlock` + `RowsTable`, the only scrolling region.

Note the **adjust-state-during-render** trick for landing on the result step: when
the figure id changes we reset the step index *during render* via a ref compare,
not in a `useEffect`. An effect would paint one frame of the old step first
(a visible flash); doing it in render is synchronous and flash-free.

```tsx
// CascadePanel.tsx
import { useRef, useState, type ReactNode } from 'react';
import {
  STEP_KIND_LABEL, headlineValue, resultStepIndex,
  type FigureLineage, type LineageRegistry, type ResponseGroup,
} from './lineage';
import { CloseIcon, CollapseIcon, ExpandIcon } from './icons';
import {
  Crossfade, Dropdown, MenuItem, RowsTable, SqlBlock,
} from './primitives';

interface CascadePanelProps {
  registry: LineageRegistry;
  /** The figure currently shown. */
  figure: FigureLineage;
  /** The response that figure belongs to (drives the top dropdown). */
  response: ResponseGroup;
  /** Repoint the panel to another figure (same or different response). */
  onSelectFigure: (figureId: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function CascadePanel({
  registry, figure, response, onSelectFigure, expanded, onToggleExpand, onClose,
}: CascadePanelProps) {
  const [stepIdx, setStepIdx] = useState(() => resultStepIndex(figure));
  const steps = figure.steps;

  // Land on the result step whenever the figure changes — during render, not in
  // an effect, so there's no one-frame flash of the previous figure's step.
  const figureIdRef = useRef(figure.id);
  if (figureIdRef.current !== figure.id) {
    figureIdRef.current = figure.id;
    setStepIdx(resultStepIndex(figure));
  }

  const head = headlineValue(figure);
  const step = steps[Math.min(stepIdx, steps.length - 1)];

  const responses = registry.responses;
  const responseIndex = responses.findIndex((r) => r.id === response.id);
  const figuresHere = response.figureIds
    .map((id) => registry.figures[id])
    .filter(Boolean) as FigureLineage[];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header: response dropdown + window controls */}
      <div className="relative z-20 flex items-center gap-3 px-5 py-2.5">
        <Dropdown
          label={
            <span className="flex min-w-0 items-baseline gap-2 text-[13px] text-stone-700">
              <span className="shrink-0 font-medium text-stone-900">
                Response {responseIndex + 1}
              </span>
              <span className="min-w-0 truncate text-[11px] text-stone-400">
                {response.question}
              </span>
            </span>
          }
          menuWidth="w-80"
          menuLabel="Responses"
        >
          {(close) =>
            responses.map((r, i) => (
              <MenuItem
                key={r.id}
                active={r.id === response.id}
                onClick={() => { onSelectFigure(r.figureIds[0]); close(); }}
              >
                <span className="w-20 shrink-0 font-medium tabular-nums">Response {i + 1}</span>
                <span className="min-w-0 truncate text-stone-500">{r.question}</span>
              </MenuItem>
            ))
          }
        </Dropdown>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
            className="hidden rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 lg:block"
          >
            {expanded ? <CollapseIcon className="h-4 w-4" /> : <ExpandIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body: dissolve on any figure OR step change */}
      <Crossfade id={`${figure.id}:${stepIdx}`}>
        {/* Headline: component dropdown as title, then value */}
        <div className="relative z-10 px-5 pb-5 pt-3">
          <Dropdown
            label={<span className="text-sm font-semibold text-stone-900">{figure.title}</span>}
            menuWidth="w-72"
            menuLabel="Components in this response"
          >
            {(close) =>
              figuresHere.map((f) => {
                const active = f.id === figure.id;
                const v = headlineValue(f);
                return (
                  <MenuItem key={f.id} active={active} onClick={() => { onSelectFigure(f.id); close(); }}>
                    <span className="min-w-0 truncate">{f.title}</span>
                    <span className={`ml-auto shrink-0 pl-3 tabular-nums ${active ? 'text-stone-900' : 'text-stone-400'}`}>
                      {v?.value}
                    </span>
                  </MenuItem>
                );
              })
            }
          </Dropdown>

          {head && (
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-stone-900">{head.value}</span>
              <span className="text-xs text-stone-400">{head.label}</span>
            </p>
          )}
        </div>

        {/* Query: the fit-content step dropdown */}
        <div className="flex items-center gap-3 px-5 pb-4 pt-1.5">
          <Dropdown
            fitContent
            label={
              <span className="flex items-center whitespace-nowrap text-[13px] text-stone-700">
                <span className="shrink-0 tabular-nums text-stone-400">{stepIdx + 1}</span>
                <span className="mx-1.5 shrink-0 text-stone-300">·</span>
                <span className="font-medium">{step.label}</span>
              </span>
            }
            menuWidth="w-72"
            menuLabel={`Queries the agent ran · ${steps.length}`}
          >
            {(close) =>
              steps.map((s, i) => {
                const isResult = i === resultStepIndex(figure);
                return (
                  <MenuItem key={s.id} active={i === stepIdx} onClick={() => { setStepIdx(i); close(); }}>
                    <span className="w-4 shrink-0 tabular-nums text-stone-400">{i + 1}</span>
                    <span className="min-w-0 truncate">{s.label}</span>
                    <span className="ml-auto shrink-0 pl-3 text-[11px] text-stone-400">
                      {isResult ? 'result' : STEP_KIND_LABEL[s.kind]}
                    </span>
                  </MenuItem>
                );
              })
            }
          </Dropdown>
        </div>

        {/* Data: the only scrolling region */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">
          <div className="space-y-4">
            <SqlBlock sql={step.sql} tone="dark" />
            <RowsTable table={step.table} />
          </div>
        </div>
      </Crossfade>
    </div>
  );
}
```

> **Why `Crossfade` wraps headline+query+data but not the header:** the header
> (response dropdown + controls) is stable across selections, so it shouldn't
> flicker. Only the *evidence* dissolves.

---

## 10. The host — CascadeDock

`CascadeDock` owns the split layout and the "what's open" state. It renders your
conversation on the left and the slide-open `<aside>` on the right. Drop your
content in via the `children` render-prop, which receives the wiring each
`Traceable` needs.

The slide itself is the only "special" CSS, and it lives here as Tailwind
arbitrary values because the width target is dynamic:

- `transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]`
- width: `0%` closed → `46%` open → `68%` expanded
- inner wrapper `min-w-[480px]` so the panel never crushes on the way in/out
- contents fade with a separate 300 ms opacity transition
- closed state is `pointer-events-none` + `border-l-0`; `aria-hidden` when closed

Two details that make close/repoint feel right:

- **Keep the last figure mounted** (`lastFigureRef`) so the panel can slide
  *closed* showing its final contents, instead of going blank mid-animation.
- **Selectors repoint, the trigger toggles.** Clicking a figure in the chat
  toggles (click the open one again to close); the panel's own dropdowns always
  repoint (never close). This matches user expectation: in-panel navigation
  shouldn't dismiss the panel.

```tsx
// CascadeDock.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  allFigureIds, figureById, responseForFigure, type LineageRegistry,
} from './lineage';
import { CascadePanel } from './CascadePanel';

/** Wiring handed to each Traceable figure in your content. */
export interface TraceWiring {
  active: boolean;
  revealAll: boolean;
  onTrace: (figureId: string) => void;
}

interface CascadeDockProps {
  registry: LineageRegistry;
  /** Render your conversation; call `wiringFor(figureId)` per Traceable. */
  children: (helpers: {
    activeId: string | null;
    wiringFor: (figureId: string) => TraceWiring;
  }) => ReactNode;
}

export function CascadeDock({ registry, children }: CascadeDockProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const open = activeId !== null;

  // Click a figure: toggle if it's the open one, else open/repoint.
  const onTrace = useCallback(
    (id: string) => setActiveId((cur) => (cur === id ? null : id)),
    [],
  );
  // In-panel selectors always repoint (never toggle closed).
  const selectFigure = useCallback((id: string) => setActiveId(id), []);

  const close = useCallback(() => { setActiveId(null); setExpanded(false); }, []);

  // While open, ←/→ cycle across every figure in the conversation.
  useEffect(() => {
    if (!open) return;
    const ids = allFigureIds(registry);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      setActiveId((cur) => {
        const idx = ids.findIndex((id) => id === cur);
        if (idx < 0) return cur;
        const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
        return ids[(next + ids.length) % ids.length];
      });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, registry]);

  const activeFigure = activeId ? figureById(registry, activeId) ?? null : null;

  // Keep the last figure mounted so the panel can slide closed gracefully.
  const lastFigureRef = useRef(activeFigure);
  if (activeFigure) lastFigureRef.current = activeFigure;
  const panelFigure = activeFigure ?? lastFigureRef.current;
  const panelResponse = panelFigure ? responseForFigure(registry, panelFigure.id) : undefined;

  const wiringFor = (figureId: string): TraceWiring => ({
    active: activeId === figureId,
    revealAll: false,
    onTrace,
  });

  return (
    <div className="flex h-full">
      {/* Left: your conversation */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {children({ activeId, wiringFor })}
      </div>

      {/* Right: the docked panel, a full-height split that animates its width */}
      <aside
        aria-hidden={!open}
        className={`hidden shrink-0 overflow-hidden border-stone-200 bg-white transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${
          open ? 'border-l' : 'pointer-events-none border-l-0'
        }`}
        style={{ width: open ? (expanded ? '68%' : '46%') : '0%' }}
      >
        {panelFigure && panelResponse && (
          <div className={`h-full min-w-[480px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
            <CascadePanel
              registry={registry}
              figure={panelFigure}
              response={panelResponse}
              onSelectFigure={selectFigure}
              expanded={expanded}
              onToggleExpand={() => setExpanded((v) => !v)}
              onClose={close}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
```

> **Responsive note:** the dock is desktop-only (`hidden lg:block`) because a
> 46 % side-by-side split needs width. On smaller screens, render the same
> `CascadePanel` inside a full-screen drawer / bottom sheet instead, reusing every
> inner component unchanged.

---

## 11. Integration guide

Four steps to stand this up in a fresh React + Vite + Tailwind v4 app.

**1. Add the files** from §3 and import the stylesheet once:

```ts
// main.tsx
import './index.css';          // contains: @import "tailwindcss";
import './cascade/cascade-panel.css';
```

**2. Build a registry** that matches the data contract. Each figure is one number
+ the steps that produced it; each response groups the figures it cited:

```ts
// myLineage.ts
import type { LineageRegistry } from './cascade/lineage';

export const registry: LineageRegistry = {
  responses: [
    { id: 'r1', question: 'How did the book look?', figureIds: ['coverage', 'geo'] },
    { id: 'r2', question: 'How did pricing land?',  figureIds: ['concession'] },
  ],
  figures: {
    coverage: {
      id: 'coverage',
      title: 'Oversubscription',
      values: [
        { label: 'final book cover', value: '3.28x', emphasis: true },
        { label: 'final book', value: '$4.10bn' },
      ],
      source: { name: 'Orderbook', system: 'book.orders', tier: 2, rowCount: 184, asOf: '14:05' },
      steps: [
        {
          id: 'q1', label: 'Pull orders', kind: 'filter',
          sql: "SELECT investor, size, status\nFROM orders\nWHERE deal = 'X';",
          table: {
            caption: 'orders — all rows (184, top shown)',
            columns: ['Investor', 'Size', 'Status'], numericCols: [1],
            note: '2 pulled orders excluded next step.',
            rows: [
              { cells: ['Aldgate AM', 250, 'live'], contributes: true },
              { cells: ['Sable Fund', 90, 'pulled'], contributes: false },
            ],
          },
        },
        {
          id: 'q2', label: 'Cover ratio', kind: 'derive',
          sql: 'SELECT 4.10 / 1.25 AS cover; -- 3.28x',
          table: {
            caption: 'derived',
            columns: ['Field', 'Value'],
            rows: [{ cells: ['cover', '3.28x'], contributes: true, emphasis: true }],
          },
        },
      ],
    },
    // geo: { … }, concession: { … }
  },
};
```

**3. Wrap your figures** in `Traceable` and host them in `CascadeDock`. The dock's
render-prop hands you `wiringFor(id)` and the current `activeId`:

```tsx
// App.tsx
import { CascadeDock } from './cascade/CascadeDock';
import { Traceable } from './cascade/Traceable';
import { registry } from './myLineage';

export default function App() {
  return (
    <div className="h-screen">
      <CascadeDock registry={registry}>
        {({ activeId, wiringFor }) => (
          <div className="mx-auto max-w-3xl p-6">
            <p className="text-sm text-stone-600">
              The book closed{' '}
              <Traceable
                registry={registry}
                figureId="coverage"
                citation="S1"
                active={activeId === 'coverage'}
                {...wiringFor('coverage')}
              >
                <span className="font-semibold text-stone-900">3.28× covered</span>
              </Traceable>
              .
            </p>
          </div>
        )}
      </CascadeDock>
    </div>
  );
}
```

> Spread `{...wiringFor(id)}` to pass `onTrace`/`revealAll`, and pass `active`
> explicitly (it drives the underline + chip). You can also wrap a whole chart
> card in `Traceable` — the affordance works for any `children`.

**4. (Optional) Global "inspect" toggle.** Thread a `revealAll` boolean from your
own state down into each `Traceable` to surface every citation chip at once.

---

## 12. State & interaction model

| State | Owner | Notes |
|---|---|---|
| `activeId` (open figure / `null`) | `CascadeDock` | single source of truth for "what's open" |
| `expanded` | `CascadeDock` | 46 % ↔ 68 % width |
| `stepIdx` | `CascadePanel` | local; resets to result step when figure changes |
| `open`/`mounted` | each `Dropdown` | two-phase so close animates |
| `preview` | each `Traceable` | hover-dwell card |

**Interaction matrix:**

| Action | Result |
|---|---|
| Click a figure (closed) | Panel opens, lands on that figure's result step |
| Click the open figure again | Panel closes |
| Click a different figure | Panel **repoints** (no close/reopen) |
| Response dropdown → pick | Repoints to that response's first figure |
| Component dropdown → pick | Repoints to that figure (same response) |
| Query-step dropdown → pick | Swaps step; body crossfades |
| `←` / `→` (panel open) | Cycle prev/next figure across the whole conversation |
| `Esc` | Closes the open dropdown (guarded so it doesn't bubble) |
| Expand button | Widens to 68 % |
| Close button | Dismisses; panel slides out keeping last contents |

Selection model summary: **the trigger toggles; every dropdown repoints.** This
keeps the panel a stable, persistent surface the user steers, not a stack of
views they navigate.

---

## 13. Design tokens

Built entirely on Tailwind's **stone** scale (warm grey) with a near-black anchor.
Swap `stone` for `zinc`/`slate`/`neutral` for a cooler look — keep the *roles*.

| Role | Token | Used for |
|---|---|---|
| Surface | `bg-white` | panel, cards, menus |
| App background | `#fafaf9` (`stone-50`) | page behind cards |
| Hairline | `border-stone-200` / `divide-stone-100` | panel edge, table rules |
| Hover wash | `bg-stone-100` | dropdown trigger, menu items, controls |
| Ink (primary) | `text-stone-900` | headline value, active labels |
| Ink (secondary) | `text-stone-700` | dropdown labels |
| Muted | `text-stone-400` / `text-stone-500` | captions, meta, inactive |
| Anchor | `bg-black text-stone-100` | dark SQL block, active rail dot |
| Focus ring | `ring-2 ring-stone-400` | all interactive elements |
| Tier 1/2/3 dots | `emerald-500` / `amber-500` / `stone-400` | provenance trust level |

**Scale & rhythm**

| Token | Value |
|---|---|
| Panel padding | `px-5` (20px) |
| Corner radii | controls `rounded-lg`, cards/menus `rounded-xl`, outer cards `rounded-2xl` |
| Headline value | `text-3xl font-semibold tracking-tight` |
| Body / labels | `text-sm` (14) / `text-[13px]` |
| Captions / meta | `text-[11px]`, monospace for SQL/captions |
| Menu heading | `text-[10px] font-medium uppercase tracking-wider` |
| Shadows | menu `shadow-lg`, preview `shadow-lg`, rail tooltip `shadow-md` |

**Z-index ladder** (critical — see gotchas):

| Layer | z |
|---|---|
| Panel header (so its menu overlaps the headline) | `z-20` |
| Headline region | `z-10` |
| Any open dropdown wrapper | `z-20` (raised only while `mounted`) |
| Dropdown menu / source preview / rail tooltip | `z-50` |
| `Traceable` wrapper while previewing | `z-50` |

---

## 14. Accessibility checklist

- **Triggers are real `<button>`s** with visible `focus-visible:ring-2`. No
  click-handlers on non-interactive elements.
- **Dropdowns:** `aria-haspopup="menu"` + `aria-expanded` on the trigger;
  `role="menu"` on the panel; `role="menuitem"` on items. Closes on `Escape` and
  outside click.
- **Use `aria-label`, never `title`,** for the trace affordance and icon-only
  buttons. The native `title` tooltip is unstyleable and translucent.
- **Window controls** have explicit labels (`Expand panel` / `Collapse panel` /
  `Close`); the closed `<aside>` is `aria-hidden`.
- **Crossfade ghost** is `inert` + `pointer-events-none` so the outgoing copy is
  out of the tab order and a11y tree.
- **Reduced motion:** every animation is disabled under
  `prefers-reduced-motion: reduce`, and `Crossfade` *skips the ghost entirely*
  (otherwise it would never unmount and stale rows would show through).
- **Keyboard:** `←`/`→` cycling is suppressed while typing in inputs/textareas/
  contenteditable. Tab order is natural top-to-bottom.
- **Color is never the only signal:** excluded rows are struck-through (not just
  greyed); active dropdown items are bold (not just tinted).

---

## 15. Gotchas & best practices

These are the non-obvious decisions — each one is a bug we hit and fixed.

1. **No View Transitions API for the dissolve.** `startViewTransition` snapshots
   and animates the *entire document root*, producing a page-wide jitter on every
   selection. Use the local `Crossfade` (opacity-only, scoped to the panel body).
2. **Dropdowns need their own stacking context.** A menu absolutely-positioned
   over later DOM (headline, table) paints *through* unless its wrapper raises
   `z-index`. Set `z-20` on the wrapper while the menu is mounted; the menu itself
   is `z-50`.
3. **Hover popovers need `z-index` on a `position`ed ancestor.** `relative` alone
   creates no stacking context. The `Traceable` wrapper must add `z-50` while
   previewing or the card hides behind neighbouring charts.
4. **`title` → `aria-label`.** Never use the `title` attribute for hints; it shows
   the OS's translucent bubble you can't style.
5. **Let the step dropdown fit its content.** Clamping the query-step trigger
   width (`max-w` + `truncate`) both wraps long labels to two lines *and* clips the
   hover wash off the chevron. `fitContent` (→ `w-fit`, no `overflow-hidden` on the
   label) fixes both. Title-level dropdowns keep the clamp so they truncate in a
   narrow panel.
6. **Reset the step index during render, not in an effect.** A `useEffect` reset
   paints one frame of the previous figure's step first (a flash). The ref-compare
   in render is synchronous.
7. **Two-phase dropdown unmount.** Track `mounted` separately from `open` and
   unmount in `onTransitionEnd`; otherwise the *close* has no exit animation.
8. **Keep the last figure mounted** in the dock so the panel slides closed showing
   its final state instead of going blank.
9. **One shared easing curve** (`cubic-bezier(0.22,1,0.36,1)`) across slide,
   crossfade, and dropdown. Mixed curves read as "cheap."
10. **Selectors repoint; the trigger toggles.** In-panel navigation must never
    dismiss the panel — only the chat trigger (re-click) and the close button do.
11. **Quiet affordances.** Resist bordered/filled dropdown chrome; the
    text-until-hover treatment tested far better. The signal is the chevron + a
    subtle wash, not a box.

---

*Self-contained kit — no third-party UI, animation, or icon libraries. Requires
React 18+ and Tailwind CSS v4. The only modern CSS feature is `@starting-style`
(progressive enhancement; older browsers just open instantly).*







