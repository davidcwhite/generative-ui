import { allocationByType, allocationSummary } from '../dealTearSheetData';
import { useHydration, type HydrationMode } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';

interface AllocationByTypeProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

export function AllocationByType({ mode, runId, delay = 0 }: AllocationByTypeProps) {
  const { atLeast } = useHydration({ mode, runId, delay });

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="min-h-[2.75rem]">
        <Hydrate ready={atLeast('scaffold')} skeleton={<SkeletonText className="h-3.5 w-44" />}>
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Allocations by investor type</h3>
            <p className="mt-0.5 text-xs text-stone-500">Share of allocation with average fill rate</p>
          </div>
        </Hydrate>
      </div>

      <ul className="mt-4 space-y-3">
        {allocationByType.map((row) => (
          <li key={row.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-stone-600">
                <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-3 w-32" />}>
                  <span>{row.name}</span>
                </Hydrate>
              </span>
              <span className="text-stone-400">
                <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3 w-20" />}>
                  <span>
                    <span className="font-semibold text-stone-900">{row.pct}%</span>
                    {' · '}
                    {Math.round(row.fillRate * 100)}% fill
                  </span>
                </Hydrate>
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: atLeast('data') ? `${row.pct}%` : '0%',
                  backgroundColor: row.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-stone-100 pt-3">
        {[
          { label: 'Investors', value: `${allocationSummary.totalInvestors}` },
          { label: 'Avg fill rate', value: `${Math.round(allocationSummary.avgFillRate * 100)}%` },
          { label: 'Granularity', value: allocationSummary.granularity },
        ].map((stat) => (
          <div key={stat.label}>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
              <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-12" />}>
                <span>{stat.label}</span>
              </Hydrate>
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-stone-800">
              <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3.5 w-10" />}>
                <span>{stat.value}</span>
              </Hydrate>
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}
