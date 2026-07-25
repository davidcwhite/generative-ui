import { ArrowUpRight } from 'lucide-react';
import type { BlockInstance, BlockSpec, DealFlashPayload } from '../contract';
import { AsOfStamp, Metric } from '../primitives';
import { PricingLadder } from './PricingLadder';
import { StatusBadge } from './StatusBadge';

/**
 * Deal Flash at chat scale.
 *
 * The ladder does the work here. Two blocks in the same conversation have to be
 * distinguishable at a glance while scrolling, and a rung diagram reads as
 * "one deal, this is where it got to" from across the room in a way that a
 * second scatter plot never would.
 */
export function DealFlashInline({
  instance,
  onOpen,
}: {
  instance: BlockInstance;
  onOpen: (spec: BlockSpec) => void;
}) {
  const payload = instance.payload as DealFlashPayload;
  const { deal, focus, tranches } = payload;

  const size =
    focus.sizeMm === null ? 'benchmark size' : `${deal.currency} ${focus.sizeMm.toLocaleString()}m`;
  const priced = focus.reofferSpread !== null;
  const talk =
    [...focus.stages].reverse().find((stage) => stage.reached && stage.spread !== null)?.spread ??
    null;

  return (
    <figure className="my-3 w-full max-w-[560px] overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="px-4 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              Deal flash
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold tracking-[-0.02em] text-stone-900">
                {deal.issuer} · {size} {focus.tenorLabel}
              </p>
              <StatusBadge status={deal.status} />
            </div>
            <p className="mt-0.5 truncate text-[11px] text-stone-500">
              {deal.rating} · {deal.sector}
              {tranches.length > 1 && ` · ${tranches.length} tranches`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpen(instance.spec)}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-stone-100 px-2.5 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
          >
            Open
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </button>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-4">
          {priced ? (
            <>
              <Metric
                size="compact"
                label="Reoffer"
                value={String(focus.reofferSpread)}
                unit="bp"
                benchmark={payload.spread}
              />
              <Metric
                size="compact"
                label="Cover"
                value={String(focus.coverage)}
                unit="x"
                benchmark={payload.coverage}
                direction="higher-better"
              />
              <Metric
                size="compact"
                label="Concession"
                value={String(focus.nipBp)}
                unit="bp"
                benchmark={payload.nip}
              />
            </>
          ) : (
            <>
              <Metric
                size="compact"
                label="Current talk"
                value={talk === null ? 'Awaited' : String(talk)}
                unit={talk === null ? undefined : 'bp'}
                pending={talk === null}
              />
              <Metric
                size="compact"
                label="Book"
                value={focus.bookMm === null ? 'Building' : focus.bookMm.toLocaleString()}
                unit={focus.bookMm === null ? undefined : `m ${deal.currency}`}
                pending={focus.bookMm === null}
              />
              <Metric
                size="compact"
                label="Cover"
                value={focus.coverage === null ? 'Building' : String(focus.coverage)}
                unit={focus.coverage === null ? undefined : 'x'}
                pending={focus.coverage === null}
              />
            </>
          )}
        </div>

        <div className="mt-4 pb-1">
          <PricingLadder stages={focus.stages} compressionBp={focus.compressionBp} size="compact" />
        </div>
      </div>

      <figcaption className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 px-4 py-2">
        <AsOfStamp asOf={instance.spec.asOf} source="Issuance" frozen />
      </figcaption>
    </figure>
  );
}
