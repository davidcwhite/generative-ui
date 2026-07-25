import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { CompsSpec, DealFlashPayload, DealFlashSpec } from '../contract';
import { execute } from '../execute';
import { MarketBackdrop } from '../MarketBackdrop';
import { AsOfStamp, BlockSection, Metric, RatingDot } from '../primitives';
import { PricingLadder } from './PricingLadder';
import { StatusBadge } from './StatusBadge';
import { TrancheTable } from './TrancheTable';

function useDealFlash(spec: DealFlashSpec) {
  const [payload, setPayload] = useState<DealFlashPayload | null>(null);
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

  return { payload, isFirstLoad: pending && !hasData.current };
}

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

export function DealFlashWorkspace({
  spec,
  onSpecChange,
  onOpenComps,
}: {
  spec: DealFlashSpec;
  onSpecChange: (next: DealFlashSpec) => void;
  onOpenComps: (spec: CompsSpec) => void;
}) {
  const { payload, isFirstLoad } = useDealFlash(spec);

  if (isFirstLoad || !payload) {
    return (
      <div className="min-w-0 space-y-8">
        <Skeleton className="h-7 w-72" />
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-2 w-16" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  const { deal, focus, tranches } = payload;
  const multi = tranches.length > 1;
  const priced = focus.reofferSpread !== null;
  /** The tightest level the deal has actually reached: guidance, else IPT. */
  const talk =
    [...focus.stages].reverse().find((stage) => stage.reached && stage.spread !== null)?.spread ??
    null;

  return (
    <div className="min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-[-0.025em] text-stone-900">
              {deal.issuer}
            </h2>
            <StatusBadge status={deal.status} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <RatingDot band={deal.ratingBand} />
              {deal.rating}
            </span>
            <span aria-hidden>·</span>
            <span>{deal.sector}</span>
            <span aria-hidden>·</span>
            <span>{longDate(deal.pricingDate)}</span>
            <span aria-hidden>·</span>
            <span>{deal.leads.join(', ')}</span>
          </p>
        </div>
        <AsOfStamp asOf={spec.asOf} source="Issuance" className="shrink-0 sm:pt-1" />
      </header>

      {/* Tranche switching is a control, not a filter, so it sits with the deal. */}
      {multi && (
        <div className="mt-5 inline-flex items-center rounded-md bg-stone-100 p-0.5">
          {tranches.map((tranche) => (
            <button
              key={tranche.id}
              type="button"
              aria-pressed={tranche.id === focus.id}
              onClick={() => onSpecChange({ ...spec, trancheId: tranche.id })}
              className={`h-6 rounded px-2.5 text-[11px] font-medium transition-colors ${
                tranche.id === focus.id
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {tranche.tenorLabel}
            </button>
          ))}
        </div>
      )}

      {/* The metric set follows the lifecycle, not just the values. A deal in
          the market has a book and a level of talk; leading with two greyed-out
          "Pending" tiles would waste the row on figures that don't exist yet. */}
      <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
        <Metric
          label="Size"
          value={focus.sizeMm === null ? 'Benchmark' : focus.sizeMm.toLocaleString()}
          unit={focus.sizeMm === null ? undefined : `m ${deal.currency}`}
          pending={focus.sizeMm === null}
        />
        {priced ? (
          <>
            <Metric
              label="Reoffer spread"
              value={String(focus.reofferSpread)}
              unit="bp"
              benchmark={payload.spread}
            />
            <Metric
              label="Book cover"
              value={String(focus.coverage)}
              unit="x"
              benchmark={payload.coverage}
              direction="higher-better"
            />
            <Metric
              label="Concession"
              value={String(focus.nipBp)}
              unit="bp"
              benchmark={payload.nip}
            />
          </>
        ) : (
          <>
            <Metric
              label="Current talk"
              value={talk === null ? 'Awaited' : String(talk)}
              unit={talk === null ? undefined : 'bp'}
              pending={talk === null}
            />
            <Metric
              label="Book"
              value={focus.bookMm === null ? 'Building' : focus.bookMm.toLocaleString()}
              unit={focus.bookMm === null ? undefined : `m ${deal.currency}`}
              pending={focus.bookMm === null}
            />
            <Metric
              label="Cover"
              value={focus.coverage === null ? 'Building' : String(focus.coverage)}
              unit={focus.coverage === null ? undefined : 'x'}
              pending={focus.coverage === null}
            />
          </>
        )}
      </div>

      <div className="mt-9 grid gap-x-12 gap-y-9 lg:grid-cols-[minmax(0,1fr)_260px]">
        <BlockSection
          label="Pricing"
          hint="How the deal moved from initial thoughts to the print"
          action={
            <button
              type="button"
              onClick={() => onOpenComps(payload.compsSpec)}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-stone-100 px-2.5 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              See comps
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </button>
          }
        >
          <div className="mx-auto max-w-lg py-3">
            <PricingLadder stages={focus.stages} compressionBp={focus.compressionBp} />
          </div>
        </BlockSection>

        <BlockSection label="Terms">
          <dl className="divide-y divide-stone-100 text-xs">
            {[
              ['Format', focus.format],
              ['Tenor', focus.tenorLabel],
              ['Maturity', longDate(focus.maturity)],
              ['Coupon', focus.coupon === null ? 'Pending' : `${focus.coupon}%`],
              [
                'Book',
                focus.bookMm === null
                  ? 'Building'
                  : `${deal.currency} ${focus.bookMm.toLocaleString()}m`,
              ],
              ['Bookrunners', deal.leads.join(', ')],
            ].map(([term, value]) => (
              <div key={term} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="shrink-0 text-stone-400">{term}</dt>
                <dd className="truncate text-right font-medium text-stone-800">{value}</dd>
              </div>
            ))}
          </dl>
        </BlockSection>
      </div>

      <div className="mt-10">
        <BlockSection
          label="Market on the day"
          hint="iBoxx EUR corporates, six weeks to pricing · execution reads against the tape, not against history"
        >
          <div className="max-w-3xl">
            <MarketBackdrop
              series={payload.market.series}
              level={payload.market.level}
              changeWeekBp={payload.market.changeWeekBp}
              markerDate={deal.pricingDate}
              markerLabel={priced ? 'priced' : 'today'}
              height={76}
            />
          </div>
        </BlockSection>
      </div>

      {multi && (
        <div className="mt-10">
          <BlockSection
            label="Tranches"
            hint={
              payload.totalSizeMm === null
                ? `${tranches.length} tranches`
                : `${tranches.length} tranches · ${deal.currency} ${payload.totalSizeMm.toLocaleString()}m total`
            }
          >
            <TrancheTable
              tranches={tranches}
              currency={deal.currency}
              focusId={focus.id}
              onFocus={(trancheId) => onSpecChange({ ...spec, trancheId })}
            />
          </BlockSection>
        </div>
      )}
    </div>
  );
}
