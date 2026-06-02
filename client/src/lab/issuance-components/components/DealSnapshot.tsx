import { dealSnapshot, type DealSnapshotData } from '../issuanceData';
import { useHydration, type HydrationMode } from '../useHydration';
import { Hydrate, SkeletonText } from '../Skeleton';

interface DealSnapshotProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

interface Term {
  label: string;
  value: (d: DealSnapshotData) => string;
}

const TERMS: Term[] = [
  { label: 'Size', value: (d) => `${d.currency} ${(d.dealSizeMm / 1000).toFixed(2)}bn` },
  { label: 'Tenor', value: (d) => `${d.tenor} · ${d.maturity}` },
  { label: 'Coupon', value: (d) => `${d.couponPct.toFixed(3)}%` },
  { label: 'Reoffer spread', value: (d) => `+${d.finalSpreadBps} bps` },
  { label: 'Guidance', value: (d) => `+${d.guidanceBps} bps area` },
  { label: 'New issue concession', value: (d) => `${d.newIssueConcessionBps} bps` },
  { label: 'Orderbook', value: (d) => `${d.currency} ${(d.orderbookMm / 1000).toFixed(1)}bn` },
  { label: 'Format', value: (d) => `${d.format} · ${d.esg}` },
  { label: 'Bookrunners', value: (d) => d.leads },
  { label: 'Use of proceeds', value: (d) => d.useOfProceeds },
];

export function DealSnapshot({ mode, runId, delay = 0 }: DealSnapshotProps) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const d = dealSnapshot;
  const coveragePct = Math.min(100, (d.bookCoverage / 5) * 100);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-h-[2.75rem] flex-1">
          <Hydrate
            ready={atLeast('labels')}
            skeleton={
              <div className="space-y-1.5">
                <SkeletonText className="h-4 w-40" />
                <SkeletonText className="h-2.5 w-24" />
              </div>
            }
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Deal snapshot
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-stone-900">
                {d.issuer}
              </h3>
              <p className="text-xs text-stone-500">
                {d.ticker} · {d.rating} · {d.currency}
              </p>
            </div>
          </Hydrate>
        </div>
        <Hydrate
          ready={atLeast('labels')}
          skeleton={<SkeletonText className="h-6 w-16 rounded-full" />}
        >
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {d.status}
          </span>
        </Hydrate>
      </div>

      {/* Key terms */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {TERMS.map((term) => (
          <div key={term.label} className={term.label === 'Bookrunners' || term.label === 'Use of proceeds' ? 'col-span-2' : ''}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
              <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-16" />}>
                <span>{term.label}</span>
              </Hydrate>
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-stone-800">
              <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3.5 w-20" />}>
                <span>{term.value(d)}</span>
              </Hydrate>
            </dd>
          </div>
        ))}
      </dl>

      {/* Book coverage bar */}
      <div className="mt-4 border-t border-stone-100 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-stone-500">Book coverage</span>
          <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3 w-10" />}>
            <span className="font-semibold text-stone-900">{d.bookCoverage.toFixed(2)}x</span>
          </Hydrate>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-stone-800 transition-[width] duration-700 ease-out"
            style={{ width: atLeast('data') ? `${coveragePct}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  );
}
