import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { allocationByGeography } from '../dealTearSheetData';
import { useHydration, type HydrationMode } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';

interface AllocationGeographyProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

export function AllocationGeography({ mode, runId, delay = 0 }: AllocationGeographyProps) {
  const { atLeast } = useHydration({ mode, runId, delay });

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="min-h-[2.75rem]">
        <Hydrate ready={atLeast('scaffold')} skeleton={<SkeletonText className="h-3.5 w-44" />}>
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Allocations by geography</h3>
            <p className="mt-0.5 text-xs text-stone-500">Share of final allocation by investor region</p>
          </div>
        </Hydrate>
      </div>

      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          {atLeast('data') ? (
            <div className="lab-fade-in h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationByGeography}
                    dataKey="pct"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={1.5}
                    stroke="none"
                    isAnimationActive
                    animationDuration={700}
                  >
                    {allocationByGeography.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined, name) => [`${value ?? 0}%`, name]}
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                      padding: '6px 10px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs uppercase tracking-wide text-stone-400">by</span>
                <span className="text-sm font-semibold text-stone-900">geography</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-40 w-40 rounded-full border-[14px] border-stone-100" />
            </div>
          )}
        </div>

        <div className="w-full flex-1">
          <Hydrate
            ready={atLeast('labels')}
            skeleton={
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {allocationByGeography.map((slice) => (
                  <div key={slice.name} className="flex items-center gap-2">
                    <SkeletonText className="h-3 w-3 rounded-full" />
                    <SkeletonText className="h-3 w-16" />
                  </div>
                ))}
              </div>
            }
          >
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {allocationByGeography.map((slice) => (
                <li key={slice.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-stone-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    {slice.name}
                  </span>
                  <span className="font-medium text-stone-900">
                    {atLeast('data') ? `${slice.pct}%` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </Hydrate>
        </div>
      </div>
    </div>
  );
}
