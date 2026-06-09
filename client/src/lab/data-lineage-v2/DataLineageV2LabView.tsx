import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { HydrationMode } from '../issuance-components/useHydration';
import { ReplayIcon, SearchInspectIcon } from '../issuance-components/icons';
import { ProvenanceCanvas } from './inspector/ProvenanceCanvas';
import { assetDescriptors, getLineage, type ComponentLineage } from './lineageData';
import { ProvOversubscription } from './components/ProvOversubscription';
import { ProvAllocationDonut } from './components/ProvAllocationDonut';
import { ProvConcessionMetric } from './components/ProvConcessionMetric';

const MODE_OPTIONS: { id: HydrationMode; label: string }[] = [
  { id: 'progressive', label: 'Progressive' },
  { id: 'instant', label: 'Instant' },
];

export interface TraceWiring {
  active: boolean;
  revealAll: boolean;
  onTrace: (id: string) => void;
}

export function DataLineageV2LabView() {
  const [mode, setMode] = useState<HydrationMode>('progressive');
  const [runId, setRunId] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [revealAll, setRevealAll] = useState(false);

  const replay = useCallback(() => setRunId((id) => id + 1), []);

  const handleModeChange = useCallback((next: HydrationMode) => {
    setMode(next);
    setRunId((id) => id + 1);
  }, []);

  const handleTrace = useCallback(
    (id: string) => setActiveId((current) => (current === id ? null : id)),
    [],
  );

  // Switcher / keyboard selection always repoints (never toggles closed).
  const selectAsset = useCallback((id: string) => setActiveId(id), []);

  const open = activeId !== null;

  // While open, ←/→ cycle across the assets in the answer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      setActiveId((current) => {
        const idx = assetDescriptors.findIndex((a) => a.id === current);
        if (idx < 0) return current;
        const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
        const wrapped = (next + assetDescriptors.length) % assetDescriptors.length;
        return assetDescriptors[wrapped].id;
      });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const activeLineage = activeId ? getLineage(activeId) ?? null : null;

  // Keep the last lineage mounted so the panel can animate closed (slide out)
  // instead of disappearing the instant the selection clears.
  const lastLineageRef = useRef<ComponentLineage | null>(null);
  if (activeLineage) lastLineageRef.current = activeLineage;
  const panelLineage = activeLineage ?? lastLineageRef.current;

  const wiringFor = (id: string): TraceWiring => ({
    active: activeId === id,
    revealAll,
    onTrace: handleTrace,
  });

  const shared = { mode, runId };

  return (
    <div className="flex h-full">
      {/* Left pane: the lab, scrolls independently */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:px-6">
      {/* Header */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Components · Data lineage v2
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-stone-950">
              Every number, traced to its source
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Each figure in the answer carries a source citation. Click one to dock the provenance
              canvas — then toggle across the answer’s assets (or press ←/→) and step through the
              few queries the agent ran, each with the materialised data view beneath it.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRevealAll((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                revealAll
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
              aria-pressed={revealAll}
            >
              <SearchInspectIcon className="h-3.5 w-3.5" />
              Inspect
            </button>
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

      {/* Components grid (reflows as the split opens) */}
      <div
        className={`grid gap-4 ${
          open
            ? expanded
              ? 'grid-cols-1'
              : 'grid-cols-1 xl:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        <Card active={activeId === 'oversubscription'}>
          <ProvOversubscription delay={0} {...shared} trace={wiringFor('oversubscription')} />
        </Card>
        <Card active={activeId === 'allocation-geography'}>
          <ProvAllocationDonut delay={120} {...shared} trace={wiringFor('allocation-geography')} />
        </Card>
        <Card active={activeId === 'concession-vs-sector'}>
          <ProvConcessionMetric delay={240} {...shared} trace={wiringFor('concession-vs-sector')} />
        </Card>
      </div>
        </div>
      </div>

      {/* Right pane: the provenance canvas splits the whole area, full height.
          Always mounted; its width animates so it slides open/closed smoothly. */}
      <aside
        aria-hidden={!open}
        className={`hidden shrink-0 overflow-hidden border-stone-200 bg-white transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${
          open ? 'border-l' : 'pointer-events-none border-l-0'
        }`}
        style={{ width: open ? (expanded ? '68%' : '44%') : '0%' }}
      >
        {panelLineage && (
          <div
            className={`h-full min-w-[440px] transition-opacity duration-300 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <ProvenanceCanvas
              lineage={panelLineage}
              assets={assetDescriptors}
              activeId={panelLineage.id}
              onSelectAsset={selectAsset}
              expanded={expanded}
              onToggleExpand={() => setExpanded((v) => !v)}
              onClose={() => {
                setActiveId(null);
                setExpanded(false);
              }}
            />
          </div>
        )}
      </aside>
    </div>
  );
}

function Card({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${
        active ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'
      }`}
    >
      {children}
    </div>
  );
}
