import { useState } from 'react';
import { useHydration } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Card, CardEyebrow, CardTitle, StatusChip } from '../primitives/Card';
import { MetricStat } from '../primitives/MetricStat';
import { Segmented, type SegmentedOption } from '../primitives/Segmented';
import { useReducedMotion } from '../useReducedMotion';
import { fmtCcyMm, fmtMult, fmtPct } from '../format';
import type { IssuanceComponentProps } from '../types';
import type { AllocationBreakdown, AllocationSummaryData } from '../data/book';

type BreakdownId = AllocationBreakdown['id'];

function StackedBar({
  breakdown,
  ready,
  reduced,
}: {
  breakdown: AllocationBreakdown;
  ready: boolean;
  reduced: boolean;
}) {
  const summary = breakdown.segments.map((s) => `${s.label} ${s.pct}%`).join(', ');
  return (
    <div
      className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100"
      role="img"
      aria-label={`${breakdown.label}: ${summary}`}
    >
      {breakdown.segments.map((segment) => (
        <div
          key={segment.label}
          className={reduced ? '' : 'transition-[width] duration-700 ease-out'}
          style={{ width: ready ? `${segment.pct}%` : '0%', backgroundColor: segment.color }}
        />
      ))}
    </div>
  );
}

function BreakdownList({
  breakdown,
  currency,
  labelsReady,
  dataReady,
}: {
  breakdown: AllocationBreakdown;
  currency: string;
  labelsReady: boolean;
  dataReady: boolean;
}) {
  return (
    <ul className="mt-3 space-y-2">
      {breakdown.segments.map((segment) => (
        <li key={segment.label} className="flex items-center gap-3 text-sm">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: segment.color }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-stone-700">
            <Hydrate ready={labelsReady} skeleton={<SkeletonText className="h-3 w-28" />}>
              <span>{segment.label}</span>
            </Hydrate>
          </span>
          <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-stone-900">
            <Hydrate ready={dataReady} skeleton={<SkeletonText className="ml-auto h-3 w-8" />}>
              <span>{fmtPct(segment.pct)}</span>
            </Hydrate>
          </span>
          <span className="w-20 shrink-0 text-right tabular-nums text-stone-500">
            <Hydrate ready={dataReady} skeleton={<SkeletonText className="ml-auto h-3 w-12" />}>
              <span>{fmtCcyMm(segment.allocatedMm, currency)}</span>
            </Hydrate>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AllocationSummary({
  data,
  mode,
  runId,
  delay = 0,
}: IssuanceComponentProps<AllocationSummaryData>) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const reduced = useReducedMotion();
  const [active, setActive] = useState<BreakdownId>('investorType');

  const tabs: SegmentedOption<BreakdownId>[] = data.breakdowns.map((b) => ({ id: b.id, label: b.label }));
  const breakdown = data.breakdowns.find((b) => b.id === active) ?? data.breakdowns[0];
  const labelsReady = atLeast('labels');
  const dataReady = atLeast('data');

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-h-[2.75rem] flex-1">
          <Hydrate
            ready={labelsReady}
            skeleton={
              <div className="space-y-1.5">
                <SkeletonText className="h-4 w-40" />
                <SkeletonText className="h-2.5 w-28" />
              </div>
            }
          >
            <div>
              <CardEyebrow>Allocation Summary</CardEyebrow>
              <CardTitle>{data.bondName}</CardTitle>
            </div>
          </Hydrate>
        </div>
        <Hydrate ready={dataReady} skeleton={<SkeletonText className="h-6 w-20 rounded-full" />}>
          <StatusChip tone="good">{fmtMult(data.bookCoverage)} covered</StatusChip>
        </Hydrate>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <MetricStat label="Allocated" value={fmtCcyMm(data.dealSizeMm, data.currency)} size="sm" labelReady={labelsReady} valueReady={dataReady} />
        <MetricStat label="Orderbook" value={fmtCcyMm(data.orderbookMm, data.currency)} size="sm" labelReady={labelsReady} valueReady={dataReady} />
        <MetricStat label="Accounts" value={String(data.accounts)} size="sm" labelReady={labelsReady} valueReady={dataReady} />
        <MetricStat label="Avg fill" value={fmtPct(data.avgFillPct)} size="sm" labelReady={labelsReady} valueReady={dataReady} />
      </dl>

      <div className="mt-4 border-t border-stone-100 pt-4">
        <Hydrate ready={labelsReady} skeleton={<SkeletonText className="h-8 w-64 rounded-xl" />}>
          <Segmented options={tabs} value={active} onChange={setActive} ariaLabel="Allocation breakdown" size="sm" />
        </Hydrate>

        <div className="mt-4">
          <StackedBar breakdown={breakdown} ready={dataReady} reduced={reduced} />
          <BreakdownList breakdown={breakdown} currency={data.currency} labelsReady={labelsReady} dataReady={dataReady} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-3 text-xs">
        <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
          <span className="text-stone-500">Real money</span>
          <Hydrate ready={dataReady} skeleton={<SkeletonText className="h-3 w-10" />}>
            <span className="font-semibold tabular-nums text-stone-900">{fmtPct(data.realMoneyPct)}</span>
          </Hydrate>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
          <span className="text-stone-500">Top-10 concentration</span>
          <Hydrate ready={dataReady} skeleton={<SkeletonText className="h-3 w-10" />}>
            <span className="font-semibold tabular-nums text-stone-900">{fmtPct(data.top10Pct)}</span>
          </Hydrate>
        </div>
      </div>
    </Card>
  );
}
