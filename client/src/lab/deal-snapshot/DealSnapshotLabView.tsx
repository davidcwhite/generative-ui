import { useCallback, useState } from 'react';
import type { HydrationMode } from '../issuance-components/useHydration';
import { ReplayIcon } from '../issuance-components/icons';
import { DealHeader } from './components/DealHeader';
import { DealKpiStrip } from './components/DealKpiStrip';
import { AllocationGeography } from './components/AllocationGeography';
import { AllocationByType } from './components/AllocationByType';
import { SecondaryTradingPanel } from './components/SecondaryTradingPanel';

const MODE_OPTIONS: { id: HydrationMode; label: string }[] = [
  { id: 'progressive', label: 'Progressive' },
  { id: 'instant', label: 'Instant' },
];

export function DealSnapshotLabView() {
  const [mode, setMode] = useState<HydrationMode>('progressive');
  const [runId, setRunId] = useState(0);

  const replay = useCallback(() => setRunId((id) => id + 1), []);
  const handleModeChange = useCallback((next: HydrationMode) => {
    setMode(next);
    setRunId((id) => id + 1);
  }, []);

  const shared = { mode, runId };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
      {/* Header / controls */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Components · Deal Snapshot
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-stone-950">
              Deal tear sheet
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              A single-deal view that hydrates section by section: deal KPIs, allocation
              breakdowns by geography and investor type, and secondary-market trading
              performance. Same hydrate-on-render engine as the issuance lab.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-0.5">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleModeChange(option.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === option.id
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                  aria-pressed={mode === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={replay}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
            >
              <ReplayIcon className="h-3.5 w-3.5" />
              Replay
            </button>
          </div>
        </div>
      </section>

      {/* Deal header */}
      <DealHeader delay={0} {...shared} />

      {/* KPI strip */}
      <DealKpiStrip delay={90} {...shared} />

      {/* Allocations */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AllocationGeography delay={300} {...shared} />
        <AllocationByType delay={390} {...shared} />
      </section>

      {/* Secondary trading */}
      <SecondaryTradingPanel delay={500} {...shared} />
    </div>
  );
}
