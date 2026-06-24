import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HydrationMode } from '../issuance-components/useHydration';
import { ReplayIcon } from '../issuance-components/icons';
import { Segmented, type SegmentedOption } from './primitives/Segmented';
import { STUDIO_ENTRIES, getEntry, type ComponentKind } from './registry';

const MODE_OPTIONS: SegmentedOption<HydrationMode>[] = [
  { id: 'progressive', label: 'Progressive' },
  { id: 'instant', label: 'Instant' },
];

const KIND_OPTIONS: SegmentedOption<ComponentKind>[] = STUDIO_ENTRIES.map((e) => ({
  id: e.kind,
  label: e.label,
}));

/** Read the deep-linked selection from the URL (?c=kind&v=sample). */
function readInitial(): { kind: ComponentKind; sub: string } {
  if (typeof window === 'undefined') {
    return { kind: STUDIO_ENTRIES[0].kind, sub: STUDIO_ENTRIES[0].samples[0].id };
  }
  const params = new URLSearchParams(window.location.search);
  const entry = getEntry(params.get('c') ?? '');
  const sub = params.get('v');
  const validSub = entry.samples.some((s) => s.id === sub) ? (sub as string) : entry.samples[0].id;
  return { kind: entry.kind, sub: validSub };
}

export function BondIssuanceStudioLabView() {
  const initial = useMemo(readInitial, []);
  const [kind, setKind] = useState<ComponentKind>(initial.kind);
  const [sub, setSub] = useState<string>(initial.sub);
  const [mode, setMode] = useState<HydrationMode>('progressive');
  const [runId, setRunId] = useState(0);

  const entry = getEntry(kind);

  // Keep the URL in sync so the selection is deep-linkable / shareable.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('c', kind);
    params.set('v', sub);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [kind, sub]);

  const replay = useCallback(() => setRunId((id) => id + 1), []);

  const handleKind = useCallback((next: ComponentKind) => {
    setKind(next);
    setSub(getEntry(next).samples[0].id);
    setRunId((id) => id + 1);
  }, []);

  const handleSub = useCallback((next: string) => {
    setSub(next);
    setRunId((id) => id + 1);
  }, []);

  const handleMode = useCallback((next: HydrationMode) => {
    setMode(next);
    setRunId((id) => id + 1);
  }, []);

  const sampleOptions: SegmentedOption<string>[] = entry.samples.map((s) => ({ id: s.id, label: s.label }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:px-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Bond Issuance · Generated UI
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-stone-950 text-pretty">
              Issuance Studio
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 text-pretty">
              Domain-specific responses a model can generate for the DCM desk. Switch the component
              type to preview each one; pick a sample to see different deals and states. Every card
              hydrates in stages — frame first, then labels, then live data.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Segmented options={MODE_OPTIONS} value={mode} onChange={handleMode} ariaLabel="Hydration mode" size="sm" />
            <button
              type="button"
              onClick={replay}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            >
              <ReplayIcon className="h-3.5 w-3.5" />
              Replay
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-stone-100 pt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">Component type</p>
          <Segmented options={KIND_OPTIONS} value={kind} onChange={handleKind} ariaLabel="Component type" size="sm" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-stone-500 text-pretty">{entry.blurb}</p>
          {sampleOptions.length > 1 ? (
            <Segmented options={sampleOptions} value={sub} onChange={handleSub} ariaLabel="Sample" size="sm" />
          ) : (
            <span className="text-xs text-stone-400">Sample · {entry.samples[0].label}</span>
          )}
        </div>

        <div key={`${kind}:${sub}:${runId}`} className="mx-auto w-full max-w-2xl">
          {entry.render(sub, { mode, runId })}
        </div>
      </section>
    </div>
  );
}
