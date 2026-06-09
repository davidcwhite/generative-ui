import { useEffect, useState } from 'react';
import { primarySource, transformKindLabel } from '../../data-lineage-v2/lineageData';
import {
  CloseIcon,
  CollapseIcon,
  ExpandIcon,
} from '../../issuance-components/icons';
import { MetaLine, RowsTable, SqlBlock, resultStepIndex, type TrustPanelProps } from './shared';

/**
 * Variant B — "Index".
 * A slim document-style rail of the answer's assets on the left; the query
 * chain as a vertical timeline accordion — the whole derivation visible at a
 * glance, one step expanded in place.
 */
export function IndexPanel({
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

  return (
    <div className="flex h-full bg-white">
      {/* Asset index rail */}
      <nav
        aria-label="Assets in this answer"
        className="w-44 shrink-0 overflow-y-auto border-r border-stone-100 py-4"
      >
        {assets.map((a) => {
          const active = a.id === activeId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAsset(a.id)}
              aria-current={active ? 'true' : undefined}
              className="group relative block w-full px-4 py-2.5 text-left"
            >
              <span
                className={`absolute bottom-2 left-0 top-2 w-0.5 rounded-full transition-colors ${
                  active ? 'bg-stone-900' : 'bg-transparent'
                }`}
                aria-hidden
              />
              <span
                className={`block truncate text-xs transition-colors ${
                  active ? 'font-medium text-stone-900' : 'text-stone-400 group-hover:text-stone-600'
                }`}
              >
                {a.title}
              </span>
              {a.value && (
                <span
                  className={`mt-0.5 block text-sm font-semibold tabular-nums tracking-tight transition-colors ${
                    active ? 'text-stone-900' : 'text-stone-300 group-hover:text-stone-500'
                  }`}
                >
                  {a.value}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Window controls */}
        <div className="flex items-center justify-end gap-1 px-3 pt-3">
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

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Headline */}
          <div key={`head-${lineage.id}`} className="lab-fade-in pb-5 pt-1">
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

          {/* Query timeline accordion */}
          <ol key={`steps-${lineage.id}`} className="lab-fade-in relative">
            <span
              className="absolute bottom-2 left-[9px] top-2 w-px bg-stone-200"
              aria-hidden
            />
            {steps.map((s, i) => {
              const active = i === stepIdx;
              return (
                <li key={s.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setStepIdx(i)}
                    aria-expanded={active}
                    className="group flex w-full items-baseline gap-3 py-2 text-left"
                  >
                    <span
                      className={`relative z-10 flex h-[19px] w-[19px] shrink-0 items-center justify-center self-center rounded-full text-[10px] tabular-nums ring-1 transition-colors ${
                        active
                          ? 'bg-stone-900 text-white ring-stone-900'
                          : 'bg-white text-stone-400 ring-stone-200 group-hover:text-stone-600 group-hover:ring-stone-300'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm transition-colors ${
                        active ? 'font-medium text-stone-900' : 'text-stone-500 group-hover:text-stone-700'
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="shrink-0 text-[11px] text-stone-300">
                      {transformKindLabel(s.kind)}
                    </span>
                  </button>
                  {active && (
                    <div className="lab-fade-in space-y-4 pb-4 pl-8 pt-1">
                      <SqlBlock sql={s.sql} />
                      <RowsTable table={s.table} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
