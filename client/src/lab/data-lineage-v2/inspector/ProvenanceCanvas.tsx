import { useEffect, useMemo, useState } from 'react';
import type {
  AssetDescriptor,
  ComponentLineage,
  QueryStep,
  TransformKind,
  UnderlyingTable,
} from '../lineageData';
import { TIER_LABEL, primarySource, transformKindLabel } from '../lineageData';
import {
  ChartIcon,
  CloseIcon,
  CollapseIcon,
  ExpandIcon,
  MetricIcon,
} from '../../issuance-components/icons';

const KIND_STYLE: Record<TransformKind, string> = {
  filter: 'bg-stone-100 text-stone-600 ring-stone-200',
  join: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  aggregate: 'bg-blue-50 text-blue-700 ring-blue-200',
  derive: 'bg-stone-900 text-white ring-stone-900',
  assumption: 'bg-amber-100 text-amber-800 ring-amber-300',
};

const TIER_DOT: Record<1 | 2 | 3, string> = {
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-stone-400',
};

interface ProvenanceCanvasProps {
  lineage: ComponentLineage;
  /** Every traceable asset in the answer, for the switcher. */
  assets: AssetDescriptor[];
  activeId: string;
  onSelectAsset: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function ProvenanceCanvas({
  lineage,
  assets,
  activeId,
  onSelectAsset,
  expanded,
  onToggleExpand,
  onClose,
}: ProvenanceCanvasProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const steps = lineage.steps;
  const headline = lineage.results.find((r) => r.emphasis) ?? lineage.results[0];

  // The single query that produces the headline figure: prefer the step whose
  // emphasised row carries the headline value; else the last step that yields a
  // result; else the final step.
  const resultStepIdx = useMemo(() => {
    const byValue = steps.findIndex((s) =>
      s.table.rows.some((r) => r.emphasis && r.cells.some((c) => String(c) === headline?.value)),
    );
    if (byValue >= 0) return byValue;
    for (let i = steps.length - 1; i >= 0; i -= 1) {
      if (steps[i].table.rows.some((r) => r.emphasis)) return i;
    }
    return steps.length - 1;
  }, [steps, headline?.value]);

  // Land on the result derivation when a new asset is opened.
  useEffect(() => {
    setStepIdx(resultStepIdx);
  }, [lineage.id, resultStepIdx]);

  const source = primarySource(lineage);
  const step = steps[Math.min(stepIdx, steps.length - 1)];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Utility row: asset tabs + window controls */}
      <div className="flex items-center gap-2 border-b border-stone-200 px-3 py-2">
        <AssetTabs assets={assets} activeId={activeId} onSelect={onSelectAsset} />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleExpand}
            className="hidden rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 lg:block"
            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
          >
            {expanded ? <CollapseIcon className="h-4 w-4" /> : <ExpandIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Asset summary: title + headline result + trust strip */}
      <div key={`head-${lineage.id}`} className="lab-fade-in border-b border-stone-200 px-5 pb-4 pt-4">
        <h3 className="text-sm font-semibold text-stone-900">{lineage.title}</h3>
        <p className="mt-0.5 text-xs text-stone-500">{lineage.subtitle}</p>
        {headline && (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-stone-900">
              {headline.value}
            </span>
            <span className="text-xs text-stone-400">{headline.label}</span>
          </div>
        )}
        <TrustStrip
          tier={source.tier}
          tierLabel={TIER_LABEL[source.tier]}
          name={source.name}
          asOf={source.asOf}
          rowCount={source.rowCount}
        />
      </div>

      {/* Body: query plan + the selected query's materialised view */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <QueryPlan steps={steps} value={stepIdx} resultIdx={resultStepIdx} onChange={setStepIdx} />
        <MaterializedView key={`${lineage.id}-${stepIdx}`} step={step} />
      </div>
    </div>
  );
}

/* ── Asset switcher ────────────────────────────────────────────────────── */

function AssetTabs({
  assets,
  activeId,
  onSelect,
}: {
  assets: AssetDescriptor[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Assets in this answer"
      className="flex min-w-0 items-center gap-1 overflow-x-auto"
    >
      {assets.map((a) => {
        const active = a.id === activeId;
        const Glyph = a.kind === 'chart' ? ChartIcon : MetricIcon;
        return (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(a.id)}
            title={a.title}
            className={`group inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'bg-stone-900 text-white'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <Glyph className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-stone-400 group-hover:text-stone-600'}`} />
            <span className="max-w-[8.5rem] truncate">{a.title}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── Trust strip ───────────────────────────────────────────────────────── */

function TrustStrip({
  tier,
  tierLabel,
  name,
  asOf,
  rowCount,
}: {
  tier: 1 | 2 | 3;
  tierLabel: string;
  name: string;
  asOf: string;
  rowCount: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-400">
      <span className="inline-flex items-center gap-1.5 font-medium text-stone-600">
        <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier]}`} aria-hidden />
        {tierLabel}
      </span>
      <Dot />
      <span className="truncate font-mono text-stone-500">{name}</span>
      <Dot />
      <span>{rowCount.toLocaleString()} rows</span>
      <Dot />
      <span>as of {asOf}</span>
    </div>
  );
}

function Dot() {
  return <span className="text-stone-300">·</span>;
}

/* ── Query plan ────────────────────────────────────────────────────────── */

function QueryPlan({
  steps,
  value,
  resultIdx,
  onChange,
}: {
  steps: QueryStep[];
  value: number;
  resultIdx: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">
        {steps.length === 1 ? 'Query the agent ran' : `Queries the agent ran · ${steps.length}`}
      </p>
      <ol className="space-y-1">
        {steps.map((s, i) => {
          const active = i === value;
          const producesResult = i === resultIdx;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onChange(i)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'border-stone-300 bg-stone-50'
                    : 'border-transparent hover:bg-stone-50'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums ${
                    active ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`min-w-0 flex-1 truncate text-xs font-medium ${active ? 'text-stone-900' : 'text-stone-600'}`}>
                  {s.label}
                </span>
                {producesResult && (
                  <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    result
                  </span>
                )}
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset ${KIND_STYLE[s.kind]}`}
                >
                  {transformKindLabel(s.kind)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Materialised view: SQL + underlying rows ──────────────────────────── */

function MaterializedView({ step }: { step: QueryStep }) {
  return (
    <div className="lab-fade-in space-y-3">
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
      <p className="mb-2 flex items-center gap-1.5 text-[11px] text-stone-400">
        <span className="font-medium uppercase tracking-wide text-stone-400">Materialised view</span>
        <Dot />
        <span className="truncate font-mono text-stone-500">{table.caption}</span>
      </p>
      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              {table.columns.map((c, ci) => (
                <th
                  key={c}
                  className={`whitespace-nowrap px-3 py-2 font-medium ${
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
              <tr
                key={ri}
                className={
                  !row.contributes
                    ? 'bg-stone-50/60 text-stone-400'
                    : row.emphasis
                      ? 'bg-amber-50/60'
                      : 'hover:bg-stone-50'
                }
              >
                {row.cells.map((cell, ci) => {
                  const numeric = table.numericCols?.includes(ci);
                  return (
                    <td
                      key={ci}
                      className={`whitespace-nowrap px-3 py-1.5 ${
                        numeric ? 'text-right tabular-nums' : ''
                      } ${ci === 0 ? 'font-medium' : ''} ${
                        row.contributes ? 'text-stone-700' : 'text-stone-400 line-through'
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
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">{table.resultNote}</p>
    </div>
  );
}
