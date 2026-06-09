import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { allocationByGeography } from '../../deal-snapshot/dealTearSheetData';
import { useHydration, type HydrationMode } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Traceable } from '../Traceable';
import type { TraceWiring } from '../Traceable';

const COMPONENT_ID = 'allocation-geography';

interface ProvProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
  trace: TraceWiring;
}

export function ProvAllocationDonut({ mode, runId, delay = 0, trace }: ProvProps) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const top = allocationByGeography.slice(0, 5);

  return (
    <div>
      <div className="min-h-[2.25rem]">
        <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-3 w-40" />}>
          <div>
            <Traceable componentId={COMPONENT_ID} citation="S1" {...trace}>
              <p className="text-sm font-semibold text-stone-900">Allocations by geography</p>
            </Traceable>
            <p className="mt-0.5 text-xs text-stone-500">Share of final allocation by region</p>
          </div>
        </Hydrate>
      </div>

      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
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
                    innerRadius={38}
                    outerRadius={60}
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
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-28 w-28 rounded-full border-[11px] border-stone-100" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <Hydrate
            ready={atLeast('labels')}
            skeleton={
              <div className="space-y-2">
                {top.map((s) => (
                  <SkeletonText key={s.name} className="h-3 w-full" />
                ))}
              </div>
            }
          >
            <ul className="space-y-1">
              {top.map((slice) => (
                <li key={slice.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-stone-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
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
