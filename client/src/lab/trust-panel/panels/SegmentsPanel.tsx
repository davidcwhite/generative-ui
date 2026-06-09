import { useEffect, useState } from 'react';
import { primarySource, transformKindLabel } from '../../data-lineage-v2/lineageData';
import {
  CloseIcon,
  CollapseIcon,
  ExpandIcon,
} from '../../issuance-components/icons';
import { MetaLine, RowsTable, SqlBlock, resultStepIndex, type TrustPanelProps } from './shared';

/**
 * Variant A — "Segments".
 * Asset toggle is a quiet segmented control; queries are underline text tabs.
 * One focus at a time, everything else recedes into stone greys.
 */
export function SegmentsPanel({
  lineage,
  assets,
  activeId,
  onSelectAsset,
  expanded,
  onToggleExpand,
  onClose,
}: TrustPanelProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const steps = lineage.steps;

  useEffect(() => {
    setStepIdx(resultStepIndex(lineage));
  }, [lineage]);

  const headline = lineage.results.find((r) => r.emphasis) ?? lineage.results[0];
  const source = primarySource(lineage);
  const step = steps[Math.min(stepIdx, steps.length - 1)];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Utility row: segmented asset control + window controls */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="inline-flex min-w-0 rounded-xl bg-stone-100 p-0.5">
          {assets.map((a) => {
            const active = a.id === activeId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectAsset(a.id)}
                title={a.title}
                aria-pressed={active}
                className={`min-w-0 truncate rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {a.title}
              </button>
            );
          })}
        </div>
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

      {/* Headline */}
      <div key={`head-${lineage.id}`} className="lab-fade-in px-6 pb-5 pt-6">
        <p className="text-sm font-medium text-stone-900">{lineage.title}</p>
        {headline && (
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-stone-900">
              {headline.value}
            </span>
            <span className="text-xs text-stone-400">{headline.label}</span>
          </p>
        )}
        <div className="mt-3">
          <MetaLine source={source} />
        </div>
      </div>

      {/* Query stepper: quiet underline tabs */}
      <div className="border-b border-stone-200 px-6">
        <nav className="-mb-px flex items-center gap-5" aria-label="Query steps">
          {steps.map((s, i) => {
            const active = i === stepIdx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIdx(i)}
                aria-current={active ? 'true' : undefined}
                className={`flex items-baseline gap-1.5 border-b-2 pb-2.5 text-xs transition-colors ${
                  active
                    ? 'border-stone-900 font-medium text-stone-900'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                <span className="tabular-nums text-[11px] opacity-60">{i + 1}</span>
                {s.label}
              </button>
            );
          })}
          <span className="ml-auto pb-2.5 text-[11px] text-stone-300">
            {transformKindLabel(step.kind)}
          </span>
        </nav>
      </div>

      {/* Selected query: SQL + rows */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div key={`${lineage.id}-${stepIdx}`} className="lab-fade-in space-y-4">
          <SqlBlock sql={step.sql} />
          <RowsTable table={step.table} />
        </div>
      </div>
    </div>
  );
}
