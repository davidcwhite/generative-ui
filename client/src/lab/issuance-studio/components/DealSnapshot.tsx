import { useHydration } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Card, CardEyebrow, CardSubtitle, CardTitle, StatusChip } from '../primitives/Card';
import { useReducedMotion } from '../useReducedMotion';
import { fmtBps, fmtCcyMm, fmtDate, fmtMult, fmtPct, fmtSpread } from '../format';
import type { IssuanceComponentProps } from '../types';
import type { DealSnapshotData, DealStatus } from '../data/deal';

const STATUS_TONE: Record<DealStatus, 'good' | 'watch' | 'neutral'> = {
  priced: 'good',
  launched: 'good',
  guidance: 'watch',
  announced: 'neutral',
};

const STATUS_LABEL: Record<DealStatus, string> = {
  priced: 'Priced',
  launched: 'Launched',
  guidance: 'Guidance',
  announced: 'Announced',
};

interface Term {
  label: string;
  value: (d: DealSnapshotData) => string;
  wide?: boolean;
}

// Hoisted: static config never needs to be rebuilt per render.
const TERMS: Term[] = [
  { label: 'Size', value: (d) => fmtCcyMm(d.dealSizeMm, d.currency) },
  { label: 'Tenor', value: (d) => `${d.tenor} · ${fmtDate(d.maturity)}` },
  { label: 'Coupon', value: (d) => (d.couponPct == null ? 'TBD' : fmtPct(d.couponPct, 3)) },
  {
    label: 'Reoffer spread',
    value: (d) => (d.finalSpreadBps == null ? `${fmtBps(d.guidanceBps)} area` : fmtSpread(d.finalSpreadBps)),
  },
  { label: 'IPT', value: (d) => `${fmtBps(d.iptBps)} area` },
  {
    label: 'New issue concession',
    value: (d) => (d.newIssueConcessionBps == null ? 'Pending' : fmtBps(d.newIssueConcessionBps)),
  },
  { label: 'Orderbook', value: (d) => (d.orderbookMm > 0 ? fmtCcyMm(d.orderbookMm, d.currency) : 'Building…') },
  { label: 'Format', value: (d) => `${d.format} · ${d.esg}` },
  { label: 'Bookrunners', value: (d) => d.leads, wide: true },
  { label: 'Use of proceeds', value: (d) => d.useOfProceeds, wide: true },
];

export function DealSnapshot({ data, mode, runId, delay = 0 }: IssuanceComponentProps<DealSnapshotData>) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const reduced = useReducedMotion();
  const priced = data.status === 'priced' || data.status === 'launched';
  const coveragePct = Math.min(100, (data.bookCoverage / 5) * 100);

  return (
    <Card>
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
              <CardEyebrow>Deal Snapshot</CardEyebrow>
              <CardTitle>{data.issuer}</CardTitle>
              <CardSubtitle>
                {data.ticker} · {data.rating} · {data.currency}
              </CardSubtitle>
            </div>
          </Hydrate>
        </div>
        <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-6 w-16 rounded-full" />}>
          <StatusChip tone={STATUS_TONE[data.status]}>{STATUS_LABEL[data.status]}</StatusChip>
        </Hydrate>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {TERMS.map((term) => (
          <div key={term.label} className={term.wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
              <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-16" />}>
                <span>{term.label}</span>
              </Hydrate>
            </dt>
            <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-stone-800">
              <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3.5 w-20" />}>
                <span>{term.value(data)}</span>
              </Hydrate>
            </dd>
          </div>
        ))}
      </dl>

      {priced && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-stone-500">Book coverage</span>
            <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3 w-10" />}>
              <span className="font-semibold tabular-nums text-stone-900">{fmtMult(data.bookCoverage)}</span>
            </Hydrate>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-label="Book coverage"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={Number(data.bookCoverage.toFixed(2))}
            aria-valuetext={fmtMult(data.bookCoverage)}
          >
            <div
              className={`h-full rounded-full bg-stone-800 ${reduced ? '' : 'transition-[width] duration-700 ease-out'}`}
              style={{ width: atLeast('data') ? `${coveragePct}%` : '0%' }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
