# Trust Cascade Panel — portable React/Vite kit

A docked provenance panel for verifying cited figures without leaving a chat.
The hierarchy is fixed and user-legible:

```txt
response dropdown -> component/figure dropdown -> query-step dropdown -> SQL + rows
```

Use this as a standalone React + Vite + Tailwind v4 feature. The kit has no UI,
animation, or icon dependencies beyond React.

## Files

```txt
cascade/
  lineage.ts          # data contract + selectors
  cascade-panel.css   # motion primitives
  icons.tsx           # inline SVG icons
  primitives.tsx      # Dropdown, Crossfade, SqlBlock, RowsTable
  Traceable.tsx       # inline cited-figure trigger + preview
  CascadePanel.tsx    # 3-dropdown evidence panel
  CascadeDock.tsx     # split layout, resize, keyboard navigation
```

## UX Contract

- The chat stays visible; the panel docks as a right split instead of a modal.
- Clicking a figure opens/repoints the panel; clicking the same open figure closes it.
- In-panel dropdowns always repoint and never dismiss the panel.
- Panel width defaults to `46%`, expands to `68%`, and can be dragged between `38%` and `72%`.
- Only the data area scrolls; header, headline, and query selector stay fixed.
- Motion is local: width transition for the dock, opacity crossfade for evidence, transform/opacity for menus.
- The visible affordance is quiet: citation chip + dotted underline on figures, text-like dropdowns with chevrons.

## 1. Data Contract

```ts
// lineage.ts
export type StepKind = 'filter' | 'join' | 'aggregate' | 'derive' | 'assumption';

export const STEP_KIND_LABEL: Record<StepKind, string> = {
  filter: 'Filter',
  join: 'Join',
  aggregate: 'Aggregate',
  derive: 'Derive',
  assumption: 'Assumption',
};

export interface LineageRow {
  cells: (string | number)[];
  contributes?: boolean; // false -> muted + struck through
  emphasis?: boolean; // result row
}

export interface LineageTable {
  caption: string;
  columns: string[];
  numericCols?: number[];
  rows: LineageRow[];
  note?: string;
}

export interface QueryStep {
  id: string;
  label: string;
  kind: StepKind;
  sql: string;
  table: LineageTable;
}

export interface FigureValue {
  label: string;
  value: string;
  emphasis?: boolean;
}

export interface FigureSource {
  name: string;
  system: string;
  tier: 1 | 2 | 3;
  rowCount: number;
  asOf: string;
}

export interface FigureLineage {
  id: string;
  title: string;
  values: FigureValue[];
  steps: QueryStep[];
  source?: FigureSource;
}

export interface ResponseGroup {
  id: string;
  question: string;
  figureIds: string[];
}

export interface LineageRegistry {
  responses: ResponseGroup[];
  figures: Record<string, FigureLineage>;
}

export function headlineValue(fig: FigureLineage) {
  return fig.values.find((v) => v.emphasis) ?? fig.values[0];
}

export function resultStepIndex(fig: FigureLineage): number {
  const head = headlineValue(fig);
  const byValue = fig.steps.findIndex((s) =>
    s.table.rows.some((r) => r.emphasis && r.cells.some((c) => String(c) === head?.value)),
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
export const allFigureIds = (reg: LineageRegistry) => reg.responses.flatMap((r) => r.figureIds);
```

## 2. CSS

Import once after `@import "tailwindcss";`.

```css
/* cascade-panel.css */
.cf-enter { animation: cf-fade-in 350ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.cf-leave { animation: cf-fade-out 350ms cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes cf-fade-in { from { opacity: 0; } }
@keyframes cf-fade-out { to { opacity: 0; } }

.dd-menu {
  transform-origin: top left;
  transition:
    opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.dd-menu[data-state='open'] { opacity: 1; transform: translateY(0) scale(1); }
.dd-menu[data-state='closed'] { opacity: 0; transform: translateY(-4px) scale(0.97); }

@starting-style {
  .dd-menu[data-state='open'] { opacity: 0; transform: translateY(-4px) scale(0.97); }
}

@keyframes lab-fade-in { from { opacity: 0; transform: translateY(4px); } }
.lab-fade-in { animation: lab-fade-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }

@media (prefers-reduced-motion: reduce) {
  .cf-enter, .cf-leave, .lab-fade-in { animation: none; }
  .dd-menu { transition: none; }
}
```

Do not use `document.startViewTransition` for this panel. It snapshots the whole
document root and causes page-wide jitter; the `Crossfade` below scopes the
dissolve to the panel body.

## 3. Icons

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

## 4. Primitives

```tsx
// primitives.tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDownIcon } from './icons';
import type { LineageTable } from './lineage';

interface DropdownProps {
  label: ReactNode;
  menuWidth: string;
  menuLabel?: string;
  fitContent?: boolean;
  children: (close: () => void) => ReactNode;
}

export function Dropdown({ label, menuWidth, menuLabel, fitContent = false, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function toggle() {
    if (open) setOpen(false);
    else {
      setMounted(true);
      setOpen(true);
    }
  }

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
    <div ref={ref} className={`relative ${fitContent ? 'w-fit' : 'min-w-0 max-w-full'} ${mounted ? 'z-20' : ''}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`group/dd inline-flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
          fitContent ? 'w-fit' : '-mx-1.5 min-w-0 max-w-full'
        } ${open ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'}`}
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
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MenuItem({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
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
          {...{ inert: '' }}
          className="cf-leave pointer-events-none absolute inset-0 flex flex-col"
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) setLeaving(null); }}
        >
          {leaving.node}
        </div>
      )}
      <div key={id} className="cf-enter absolute inset-0 flex flex-col">{children}</div>
    </div>
  );
}

export function SqlBlock({ sql, tone = 'dark' }: { sql: string; tone?: 'light' | 'dark' }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group/sql relative">
      <pre className={`overflow-x-auto rounded-xl px-4 py-3 font-mono text-[11px] leading-relaxed ${
        tone === 'dark' ? 'bg-black text-stone-100' : 'bg-stone-50 text-stone-600'
      }`}>
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
      {table.note && <p className="mt-2 text-[11px] leading-relaxed text-stone-400">{table.note}</p>}
    </div>
  );
}
```

## 5. Traceable Trigger

```tsx
// Traceable.tsx
import { useRef, useState, type ReactNode } from 'react';
import type { LineageRegistry } from './lineage';
import { figureById, headlineValue } from './lineage';

interface TraceableProps {
  registry: LineageRegistry;
  figureId: string;
  citation?: string;
  active?: boolean;
  revealAll?: boolean;
  onTrace: (figureId: string) => void;
  children: ReactNode;
}

const TIER_DOT: Record<1 | 2 | 3, string> = { 1: 'bg-emerald-500', 2: 'bg-amber-500', 3: 'bg-stone-400' };
const TIER_LABEL: Record<1 | 2 | 3, string> = { 1: 'Confirmed', 2: 'Interim / unverified', 3: 'Reference / modelled' };

export function Traceable({ registry, figureId, citation, active = false, revealAll = false, onTrace, children }: TraceableProps) {
  const [preview, setPreview] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const chipVisible = revealAll || active;

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
        className={`group/trace inline-flex items-start gap-0.5 rounded-md text-left transition-colors ${active ? 'bg-stone-900/[0.04]' : ''}`}
      >
        <span className={`-mb-px border-b border-dashed transition-colors ${
          active ? 'border-stone-400' : 'border-transparent group-hover/trace:border-stone-300'
        }`}>
          {children}
        </span>
        {citation && (
          <span className={`mt-0.5 inline-flex h-3.5 items-center rounded px-1 align-super text-[9px] font-semibold leading-none ring-1 ring-inset transition-all ${
            active
              ? 'bg-stone-900 text-white ring-stone-900'
              : `bg-stone-100 text-stone-500 ring-stone-200 ${chipVisible ? 'opacity-100' : 'opacity-0 group-hover/trace:opacity-100'}`
          }`}>
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
        {head && <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-900">{head.value}</span>}
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
      <p className="mt-2 border-t border-stone-100 pt-2 text-[10px] text-stone-400">Click to open the full trace</p>
    </div>
  );
}
```

## 6. CascadePanel

```tsx
// CascadePanel.tsx
import { useRef, useState } from 'react';
import {
  STEP_KIND_LABEL,
  headlineValue,
  resultStepIndex,
  type FigureLineage,
  type LineageRegistry,
  type ResponseGroup,
} from './lineage';
import { CloseIcon, CollapseIcon, ExpandIcon } from './icons';
import { Crossfade, Dropdown, MenuItem, RowsTable, SqlBlock } from './primitives';

interface CascadePanelProps {
  registry: LineageRegistry;
  figure: FigureLineage;
  response: ResponseGroup;
  onSelectFigure: (figureId: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function CascadePanel({ registry, figure, response, onSelectFigure, expanded, onToggleExpand, onClose }: CascadePanelProps) {
  const [stepIdx, setStepIdx] = useState(() => resultStepIndex(figure));
  const figureIdRef = useRef(figure.id);
  if (figureIdRef.current !== figure.id) {
    figureIdRef.current = figure.id;
    setStepIdx(resultStepIndex(figure));
  }

  const steps = figure.steps;
  const head = headlineValue(figure);
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const responseIndex = registry.responses.findIndex((r) => r.id === response.id);
  const figuresHere = response.figureIds.map((id) => registry.figures[id]).filter(Boolean) as FigureLineage[];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="relative z-20 flex items-center gap-3 px-5 py-2.5">
        <Dropdown
          label={
            <span className="flex min-w-0 items-baseline gap-2 text-[13px] text-stone-700">
              <span className="shrink-0 font-medium text-stone-900">Response {responseIndex + 1}</span>
              <span className="min-w-0 truncate text-[11px] text-stone-400">{response.question}</span>
            </span>
          }
          menuWidth="w-80"
          menuLabel="Responses"
        >
          {(close) =>
            registry.responses.map((r, i) => (
              <MenuItem key={r.id} active={r.id === response.id} onClick={() => { onSelectFigure(r.figureIds[0]); close(); }}>
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

      <Crossfade id={`${figure.id}:${stepIdx}`}>
        <div className="relative z-10 px-5 pb-5 pt-3">
          <Dropdown label={<span className="text-sm font-semibold text-stone-900">{figure.title}</span>} menuWidth="w-72" menuLabel="Components in this response">
            {(close) =>
              figuresHere.map((f) => {
                const active = f.id === figure.id;
                return (
                  <MenuItem key={f.id} active={active} onClick={() => { onSelectFigure(f.id); close(); }}>
                    <span className="min-w-0 truncate">{f.title}</span>
                    <span className={`ml-auto shrink-0 pl-3 tabular-nums ${active ? 'text-stone-900' : 'text-stone-400'}`}>
                      {headlineValue(f)?.value}
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
            menuLabel={`Queries · ${steps.length}`}
          >
            {(close) =>
              steps.map((s, i) => (
                <MenuItem key={s.id} active={i === stepIdx} onClick={() => { setStepIdx(i); close(); }}>
                  <span className="w-4 shrink-0 tabular-nums text-stone-400">{i + 1}</span>
                  <span className="min-w-0 truncate">{s.label}</span>
                  <span className="ml-auto shrink-0 pl-3 text-[11px] text-stone-400">
                    {i === resultStepIndex(figure) ? 'result' : STEP_KIND_LABEL[s.kind]}
                  </span>
                </MenuItem>
              ))
            }
          </Dropdown>
        </div>

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

## 7. CascadeDock

```tsx
// CascadeDock.tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { allFigureIds, figureById, responseForFigure, type LineageRegistry } from './lineage';
import { CascadePanel } from './CascadePanel';

const PANEL_DEFAULT_WIDTH = 46;
const PANEL_EXPANDED_WIDTH = 68;
const PANEL_MIN_WIDTH = 38;
const PANEL_MAX_WIDTH = 72;
const PANEL_WIDTH_STEP = 2;

function clampPanelWidth(width: number) {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, width));
}

interface CascadeDockProps {
  registry: LineageRegistry;
  children: (helpers: {
    activeId: string | null;
    wiringFor: (figureId: string) => {
      active: boolean;
      revealAll: boolean;
      onTrace: (figureId: string) => void;
    };
  }) => ReactNode;
}

export function CascadeDock({ registry, children }: CascadeDockProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const resizeFrameRef = useRef<number | null>(null);
  const pendingPanelWidthRef = useRef(panelWidth);
  const open = activeId !== null;
  const expanded = panelWidth >= (PANEL_DEFAULT_WIDTH + PANEL_EXPANDED_WIDTH) / 2;

  const onTrace = useCallback((id: string) => setActiveId((cur) => (cur === id ? null : id)), []);
  const selectFigure = useCallback((id: string) => setActiveId(id), []);
  const close = useCallback(() => { setActiveId(null); }, []);

  useEffect(() => () => {
    if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current);
  }, []);

  const schedulePanelWidth = useCallback((nextWidth: number) => {
    pendingPanelWidthRef.current = clampPanelWidth(nextWidth);
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      setPanelWidth(pendingPanelWidthRef.current);
    });
  }, []);

  const startPanelResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setResizing(true);
    const onMove = (moveEvent: PointerEvent) => {
      schedulePanelWidth(((window.innerWidth - moveEvent.clientX) / window.innerWidth) * 100);
    };
    const stop = () => {
      setResizing(false);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
  }, [schedulePanelWidth]);

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
  const lastFigureRef = useRef(activeFigure);
  if (activeFigure) lastFigureRef.current = activeFigure;
  const panelFigure = activeFigure ?? lastFigureRef.current;
  const panelResponse = panelFigure ? responseForFigure(registry, panelFigure.id) : undefined;

  const wiringFor = (figureId: string) => ({ active: activeId === figureId, revealAll: false, onTrace });

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto">{children({ activeId, wiringFor })}</div>

      <aside
        aria-hidden={!open}
        className={`relative hidden shrink-0 overflow-hidden border-stone-200 bg-white lg:block ${
          open ? 'border-l' : 'pointer-events-none border-l-0'
        } ${resizing ? 'transition-none' : 'transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
        style={{ width: open ? `${panelWidth}%` : '0%' }}
      >
        {open && (
          <div
            role="separator"
            aria-label="Resize lineage panel"
            aria-orientation="vertical"
            aria-valuemin={PANEL_MIN_WIDTH}
            aria-valuemax={PANEL_MAX_WIDTH}
            aria-valuenow={Math.round(panelWidth)}
            tabIndex={0}
            onPointerDown={startPanelResize}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') setPanelWidth((w) => clampPanelWidth(w + PANEL_WIDTH_STEP));
              else if (event.key === 'ArrowRight') setPanelWidth((w) => clampPanelWidth(w - PANEL_WIDTH_STEP));
              else if (event.key === 'Home') setPanelWidth(PANEL_MIN_WIDTH);
              else if (event.key === 'End') setPanelWidth(PANEL_MAX_WIDTH);
              else return;
              event.preventDefault();
            }}
            className="group absolute left-0 top-0 z-30 hidden h-full w-3 cursor-col-resize items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400 lg:flex"
          >
            <span className="h-10 w-px rounded-full bg-stone-200 transition-colors group-hover:bg-stone-400" />
          </div>
        )}

        {panelFigure && panelResponse && (
          <div className={`h-full min-w-[480px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
            <CascadePanel
              registry={registry}
              figure={panelFigure}
              response={panelResponse}
              onSelectFigure={selectFigure}
              expanded={expanded}
              onToggleExpand={() => {
                setPanelWidth((w) => w >= (PANEL_DEFAULT_WIDTH + PANEL_EXPANDED_WIDTH) / 2 ? PANEL_DEFAULT_WIDTH : PANEL_EXPANDED_WIDTH);
              }}
              onClose={close}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
```

## 8. Minimal Integration

```tsx
import { CascadeDock } from './cascade/CascadeDock';
import { Traceable } from './cascade/Traceable';
import { registry } from './myLineage';

export default function App() {
  return (
    <div className="h-screen">
      <CascadeDock registry={registry}>
        {({ activeId, wiringFor }) => (
          <main className="mx-auto max-w-3xl p-6 text-sm text-stone-600">
            The book closed{' '}
            <Traceable
              registry={registry}
              figureId="coverage"
              citation="S1"
              active={activeId === 'coverage'}
              {...wiringFor('coverage')}
            >
              <span className="font-semibold text-stone-900">3.28x covered</span>
            </Traceable>
            .
          </main>
        )}
      </CascadeDock>
    </div>
  );
}
```

## 9. Implementation Checklist

- **Motion:** use `width` for dock open/preset snap, `transition-none` while dragging, `Crossfade` for evidence, `dd-menu` for dropdown enter/exit.
- **Reduced motion:** disable CSS animation and skip the `Crossfade` ghost; otherwise old content can linger without `animationend`.
- **Sizing:** clamp resizable width (`38-72%`), keep `min-w-[480px]`, use `fitContent` only for the query-step trigger, and keep long menu labels truncated.
- **Stacking:** panel header `z-20`, headline `z-10`, mounted dropdown wrapper `z-20`, resize handle `z-30`, menus/previews `z-50`, `Traceable` wrapper `z-50` only while previewing.
- **Accessibility:** real buttons, `aria-expanded`/`aria-haspopup` on dropdown triggers, `role="menu"`/`menuitem`, `role="separator"` + `aria-valuemin/max/now` on resize handle, icon button labels, no `title` attributes.
- **Keyboard:** dropdowns close on `Escape`; panel cycles figures with left/right unless focus is inside input/textarea/contenteditable; resize separator supports left/right/Home/End.
- **React performance:** keep global listeners scoped to open states, use functional state updates, use refs + `requestAnimationFrame` for resize pointer movement, derive `expanded` from `panelWidth`, and reset `stepIdx` during render on figure changes to avoid a one-frame flash.
- **UX rule:** chat trigger toggles; panel selectors repoint. Do not let in-panel navigation dismiss the panel.
