import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { describeSpec, type CompsPayload, type CompsSpec } from '../contract';
import { execute } from '../execute';
import { AsOfStamp, BlockSection, Metric, ratingColour } from '../primitives';
import { CompsFilters } from './CompsFilters';
import { CompsScatter } from './CompsScatter';
import { CompsTable } from './CompsTable';

/** Fixed so the skeleton and the loaded chart occupy identical space. */
const CHART_HEIGHT = 340;

function useCompsQuery(spec: CompsSpec) {
  const [payload, setPayload] = useState<CompsPayload | null>(null);
  const [pending, setPending] = useState(true);
  const hasData = useRef(false);
  const key = JSON.stringify(spec);

  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    execute(spec, controller.signal)
      .then((result) => {
        hasData.current = true;
        setPayload(result);
        setPending(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setPending(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { payload, isFirstLoad: pending && !hasData.current, isRefreshing: pending && hasData.current };
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-stone-500">
      {(['AA', 'A', 'BBB'] as const).map((band) => (
        <span key={band} className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: ratingColour(band) }}
            aria-hidden
          />
          {band}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-px w-4 border-t border-dashed border-stone-400" aria-hidden />
        median
      </span>
    </div>
  );
}

/**
 * The live form of a comps run. Same spec the agent would emit, executed fresh
 * against the dataset rather than replayed from a frozen payload.
 */
export function CompsWorkspace({
  spec,
  onSpecChange,
}: {
  spec: CompsSpec;
  onSpecChange: (next: CompsSpec) => void;
}) {
  const { payload, isFirstLoad, isRefreshing } = useCompsQuery(spec);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // A new peer set invalidates the selection; it may not be in the results.
  const specKey = JSON.stringify(spec);
  useEffect(() => setSelectedId(null), [specKey]);

  const subject = payload?.subject;

  return (
    <div className="min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-[-0.025em] text-stone-900">Comps</h2>
          <p className="mt-1 text-xs text-stone-500">{describeSpec(spec)}</p>
        </div>
        <AsOfStamp asOf={spec.asOf} source="Issuance" className="shrink-0 sm:pt-1" />
      </header>

      <div className="mt-5">
        <CompsFilters
          spec={spec}
          onChange={onSpecChange}
          subjectLabel={subject ? `${subject.point.ticker} ${subject.point.tenorLabel}` : undefined}
          onClearSubject={() => onSpecChange({ ...spec, subject: undefined })}
        />
      </div>

      {/* With a subject the headline is how it priced; without, it's the market. */}
      <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
        {isFirstLoad || !payload ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-2 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-2 w-24" />
            </div>
          ))
        ) : subject ? (
          <>
            <Metric
              label="Reoffer spread"
              value={String(subject.point.spread)}
              unit="bp"
              benchmark={subject.spread}
              direction="lower-better"
            />
            <Metric
              label="Concession"
              value={String(subject.point.nip)}
              unit="bp"
              benchmark={subject.nip}
              direction="lower-better"
            />
            <Metric
              label="Book cover"
              value={String(subject.point.coverage)}
              unit="x"
              benchmark={subject.coverage}
              direction="higher-better"
            />
            <Metric label="Comparables" value={String(payload.stats.count)} unit=" deals" />
          </>
        ) : (
          <>
            <Metric label="Median spread" value={String(payload.stats.medianSpread)} unit="bp" />
            <Metric
              label="Interquartile"
              value={`${payload.stats.q1Spread}–${payload.stats.q3Spread}`}
              unit="bp"
            />
            <Metric label="Median cover" value={String(payload.stats.medianCoverage)} unit="x" />
            <Metric label="Comparables" value={String(payload.stats.count)} unit=" deals" />
          </>
        )}
      </div>

      <div className={`mt-8 transition-opacity duration-200 ${isRefreshing ? 'opacity-50' : ''}`}>
        <BlockSection
          label="Spread against tenor"
          hint="Dot area is deal size · shaded band is the interquartile range by tenor"
          action={<Legend />}
        >
          <div style={{ height: CHART_HEIGHT }}>
            {isFirstLoad || !payload ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <CompsScatter
                payload={payload}
                selectedId={selectedId}
                onSelect={setSelectedId}
                height={CHART_HEIGHT}
              />
            )}
          </div>
        </BlockSection>
      </div>

      <div className={`mt-9 transition-opacity duration-200 ${isRefreshing ? 'opacity-50' : ''}`}>
        <BlockSection
          label="Comparable deals"
          hint={
            payload
              ? `${payload.points.length} tranches · click a row or a dot to link the two`
              : undefined
          }
        >
          {isFirstLoad || !payload ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          ) : payload.points.length === 0 ? (
            <p className="py-10 text-center text-xs text-stone-500">
              No comparable deals in this window. Widen the filters or the lookback.
            </p>
          ) : (
            <CompsTable
              points={payload.points}
              selectedId={selectedId}
              subjectId={subject?.point.id}
              onSelect={setSelectedId}
              medianSpread={payload.stats.medianSpread}
            />
          )}
        </BlockSection>
      </div>
    </div>
  );
}
