import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { HydrationMode } from '../issuance-components/useHydration';
import { ReplayIcon } from '../issuance-components/icons';
import {
  assetDescriptors,
  getLineage,
  type ComponentLineage,
} from '../data-lineage-v2/lineageData';
import { ProvOversubscription } from './components/ProvOversubscription';
import { ProvAllocationDonut } from './components/ProvAllocationDonut';
import { ProvConcessionMetric } from './components/ProvConcessionMetric';
import { SegmentsPanel } from './panels/SegmentsPanel';
import { IndexPanel } from './panels/IndexPanel';

const MODE_OPTIONS: { id: HydrationMode; label: string }[] = [
  { id: 'progressive', label: 'Progressive' },
  { id: 'instant', label: 'Instant' },
];

type Variant = 'segments' | 'index';

const VARIANT_COPY: Record<Variant, { name: string; blurb: string }> = {
  segments: {
    name: 'Segments',
    blurb:
      'Click a figure to dock the trust panel. Assets toggle through a quiet segmented control; the query chain reads as underline tabs — one focus at a time.',
  },
  index: {
    name: 'Index',
    blurb:
      'Click a figure to dock the trust panel. Assets sit in a document-style index rail; the query chain is a timeline you expand in place.',
  },
};

export function TrustPanelSegmentsLabView() {
  return <TrustPanelLabView variant="segments" />;
}

export function TrustPanelIndexLabView() {
  return <TrustPanelLabView variant="index" />;
}

function TrustPanelLabView({ variant }: { variant: Variant }) {
  const [mode, setMode] = useState<HydrationMode>('progressive');
  const [runId, setRunId] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const replay = useCallback(() => setRunId((id) => id + 1), []);

  const handleModeChange = useCallback((next: HydrationMode) => {
    setMode(next);
    setRunId((id) => id + 1);
  }, []);

  const handleTrace = useCallback(
    (id: string) => setActiveId((current) => (current === id ? null : id)),
    [],
  );

  // Panel switcher always repoints (never toggles closed).
  const selectAsset = useCallback((id: string) => setActiveId(id), []);

  const open = activeId !== null;

  // While open, ←/→ cycle across the assets in the answer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
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

  const wiringFor = (id: string) => ({
    active: activeId === id,
    revealAll: false,
    onTrace: handleTrace,
  });

  const shared = { mode, runId };
  const Panel = variant === 'segments' ? SegmentsPanel : IndexPanel;
  const copy = VARIANT_COPY[variant];

  return (
    <div className="flex h-full">
      {/* Left pane: the lab, scrolls independently */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:px-6">
          {/* Header */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              Components · Trust panel · {copy.name}
            </p>
            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-950">
                  A calmer way to trust the numbers
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{copy.blurb}</p>
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
              <ProvAllocationDonut
                delay={120}
                {...shared}
                trace={wiringFor('allocation-geography')}
              />
            </Card>
            <Card active={activeId === 'concession-vs-sector'}>
              <ProvConcessionMetric
                delay={240}
                {...shared}
                trace={wiringFor('concession-vs-sector')}
              />
            </Card>
          </div>
        </div>
      </div>

      {/* Right pane: the trust panel splits the whole area, full height.
          Always mounted; its width animates so it slides open/closed smoothly. */}
      <aside
        aria-hidden={!open}
        className={`hidden shrink-0 overflow-hidden border-stone-200 bg-white transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${
          open ? 'border-l' : 'pointer-events-none border-l-0'
        }`}
        style={{ width: open ? (expanded ? '68%' : '46%') : '0%' }}
      >
        {panelLineage && (
          <div
            className={`h-full min-w-[480px] transition-opacity duration-300 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Panel
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
        active ? 'border-stone-300 shadow-md' : 'border-stone-200'
      }`}
    >
      {children}
    </div>
  );
}
