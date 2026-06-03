import { useEffect, useId, useRef, useState } from 'react';
import type { ComponentLineage, QueryStep, TransformKind, UnderlyingTable } from '../lineageData';
import { transformKindLabel } from '../lineageData';
import {
  ChevronDownIcon,
  CloseIcon,
  CollapseIcon,
  ExpandIcon,
} from '../../issuance-components/icons';

const KIND_STYLE: Record<TransformKind, string> = {
  filter: 'bg-stone-100 text-stone-600 ring-stone-200',
  join: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  aggregate: 'bg-blue-50 text-blue-700 ring-blue-200',
  derive: 'bg-stone-900 text-white ring-stone-900',
  assumption: 'bg-amber-100 text-amber-800 ring-amber-300',
};

interface ProvenanceCanvasProps {
  lineage: ComponentLineage;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function ProvenanceCanvas({
  lineage,
  expanded,
  onToggleExpand,
  onClose,
}: ProvenanceCanvasProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const steps = lineage.steps;

  useEffect(() => {
    setStepIdx(0);
  }, [lineage.id]);

  const headline = lineage.results.find((r) => r.emphasis) ?? lineage.results[0];
  const asOf = lineage.sources.reduce((a, b) => (a.asOf.length >= b.asOf.length ? a : b)).asOf;
  const step = steps[Math.min(stepIdx, steps.length - 1)];

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
                <span className="text-stone-400"> · </span>
                {lineage.subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
        <p className="mt-2 text-right text-[10px] text-stone-400">as of {asOf}</p>
      </div>

      {/* Step selector */}
      <div className="flex h-11 items-center border-b border-stone-200 px-4">
        <div className="flex items-baseline gap-3">
          <span className="text-[13px] font-medium leading-4 text-stone-400">Source data</span>
          {steps.length > 0 && (
            <QueryStepMenu steps={steps} value={stepIdx} onChange={setStepIdx} />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <DataTab
          key={`${lineage.id}-${stepIdx}`}
          step={step}
          stepIndex={stepIdx}
          stepCount={steps.length}
        />
      </div>
    </div>
  );
}

/* ── Query step menu ───────────────────────────────────────────────────── */

function QueryStepMenu({
  steps,
  value,
  onChange,
}: {
  steps: QueryStep[];
  value: number;
  onChange: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const step = steps[Math.min(value, steps.length - 1)];

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (steps.length === 1) {
    return <span className="text-[13px] font-medium leading-4 text-stone-800">{step.label}</span>;
  }

  return (
    <div ref={rootRef} className="relative inline-flex items-baseline">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="-mx-1 inline-flex max-w-[10rem] items-baseline gap-1.5 rounded-md px-1 py-0 text-[13px] font-medium leading-4 text-stone-800 transition-colors hover:bg-stone-100 sm:max-w-[13rem]"
      >
        <span className="truncate leading-4">{step.label}</span>
        <span className="shrink-0 tabular-nums font-normal leading-4 text-stone-400">
          {value + 1}/{steps.length}
        </span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 self-center text-stone-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <ul
          id={menuId}
          role="listbox"
          aria-label="Query steps"
          className="absolute left-0 top-full z-20 mt-1 max-h-60 w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {steps.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(i);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  i === value ? 'bg-stone-50 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span className="w-5 shrink-0 tabular-nums text-stone-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset ${KIND_STYLE[s.kind]}`}
                >
                  {transformKindLabel(s.kind)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Source data body ──────────────────────────────────────────────────── */

function DataTab({
  step,
  stepIndex,
  stepCount,
}: {
  step: QueryStep;
  stepIndex: number;
  stepCount: number;
}) {
  return (
    <div className="lab-fade-in space-y-4">
      {stepCount > 1 && (
        <p className="text-[11px] text-stone-400">
          Query {stepIndex + 1} of {stepCount}
          <span
            className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 font-medium ring-1 ring-inset ${KIND_STYLE[step.kind]}`}
          >
            {transformKindLabel(step.kind)}
          </span>
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
