import { useCallback, useState } from 'react';
import { kpis } from './issuanceData';
import type { HydrationMode } from './useHydration';
import { KpiCard } from './components/KpiCard';
import { CurrencyDonut } from './components/CurrencyDonut';
import { SupplyStackedBar } from './components/SupplyStackedBar';
import { DealSnapshot } from './components/DealSnapshot';
import { SecondaryPerformancePanel } from './components/SecondaryPerformancePanel';
import { ReplayIcon } from './icons';

const MODE_OPTIONS: { id: HydrationMode; label: string }[] = [
  { id: 'progressive', label: 'Progressive' },
  { id: 'instant', label: 'Instant' },
];

export function IssuanceComponentsLabView() {
  const [mode, setMode] = useState<HydrationMode>('progressive');
  const [runId, setRunId] = useState(0);

  const replay = useCallback(() => setRunId((id) => id + 1), []);

  // Switching mode also restarts the sequence so the change is visible.
  const handleModeChange = useCallback((next: HydrationMode) => {
    setMode(next);
    setRunId((id) => id + 1);
  }, []);

  const shared = { mode, runId };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
      {/* Header */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Components · Issuance UX
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-stone-950">
              Components that write themselves in
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Bond-issuance cards, charts and a deal snapshot that hydrate in stages —
              the frame lands first, labels resolve, then live data and charts draw in.
              Modeled on the Perplexity Finance look, built with Recharts.
            </p>
          </div>

          {/* Controls */}
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

      {/* KPI row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <KpiCard key={kpi.id} kpi={kpi} delay={index * 90} {...shared} />
        ))}
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CurrencyDonut delay={380} {...shared} />
        <SupplyStackedBar delay={470} {...shared} />
      </section>

      {/* Deal + secondary row */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DealSnapshot delay={560} {...shared} />
        <SecondaryPerformancePanel delay={650} {...shared} />
      </section>
    </div>
  );
}
