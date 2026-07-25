import { ArrowUpRight } from 'lucide-react';
import { describeSpec, type BlockInstance, type CompsPayload, type CompsSpec } from '../contract';
import { AsOfStamp, Metric } from '../primitives';
import { CompsScatter } from './CompsScatter';

/**
 * The chat form of a comps run.
 *
 * Not a shrunken dashboard. A block in a conversation is read once, in passing,
 * while scrolling — so it carries one answer, at most three numbers, one visual
 * and one way out. Everything else lives behind Open, where there is room for
 * it and the user has asked for it.
 */

const INLINE_CHART_HEIGHT = 92;

function drift(payload: CompsPayload, live: CompsPayload) {
  const before = payload.stats.medianSpread;
  const after = live.stats.medianSpread;
  return Math.abs(after - before) >= 1 ? after - before : 0;
}

export function CompsInline({
  instance,
  onOpen,
  live,
}: {
  instance: BlockInstance;
  onOpen: (spec: CompsSpec) => void;
  /** Current execution of the same spec, used only to detect drift. */
  live?: CompsPayload;
}) {
  const spec = instance.spec as CompsSpec;
  const payload = instance.payload as CompsPayload;
  const subject = payload.subject;
  const moved = live ? drift(payload, live) : 0;

  const headline = subject
    ? `${subject.point.ticker} ${subject.point.tenorLabel} priced at ${subject.point.spread}bp`
    : `${payload.stats.count} comparable deals`;

  return (
    <figure className="my-3 w-full max-w-[560px] overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="px-4 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              Comps
            </p>
            <p className="mt-1 truncate text-sm font-semibold tracking-[-0.02em] text-stone-900">
              {headline}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-stone-500">{describeSpec(spec)}</p>
          </div>

          <button
            type="button"
            onClick={() => onOpen(spec)}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-stone-100 px-2.5 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
          >
            Open
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </button>
        </div>

        {/* Three numbers is the ceiling. A fourth turns a glance into a read. */}
        <div className="mt-3.5 grid grid-cols-3 gap-4">
          {subject ? (
            <>
              <Metric
                size="compact"
                label="Spread"
                value={String(subject.point.spread)}
                unit="bp"
                benchmark={subject.spread}
              />
              <Metric
                size="compact"
                label="Concession"
                value={String(subject.point.nip)}
                unit="bp"
                benchmark={subject.nip}
              />
              <Metric
                size="compact"
                label="Cover"
                value={String(subject.point.coverage)}
                unit="x"
                benchmark={subject.coverage}
                direction="higher-better"
              />
            </>
          ) : (
            <>
              <Metric size="compact" label="Median" value={String(payload.stats.medianSpread)} unit="bp" />
              <Metric
                size="compact"
                label="Interquartile"
                value={`${payload.stats.q1Spread}–${payload.stats.q3Spread}`}
                unit="bp"
              />
              <Metric size="compact" label="Deals" value={String(payload.stats.count)} />
            </>
          )}
        </div>
      </div>

      {/* Axis-free sparkline of the same cloud: shape only, detail on Open. */}
      <div className="mt-2 px-2">
        <CompsScatter payload={payload} height={INLINE_CHART_HEIGHT} minimal />
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-4 py-2">
        <AsOfStamp asOf={spec.asOf} source="Issuance" frozen />
        {payload.truncated && (
          <span className="text-[10px] text-stone-400">
            showing {payload.points.length} of {payload.stats.count}
          </span>
        )}
        {moved !== 0 && (
          <span className="text-[10px] font-medium text-amber-600">
            market has moved {moved > 0 ? '+' : ''}
            {moved.toFixed(0)}bp since
          </span>
        )}
      </figcaption>
    </figure>
  );
}
