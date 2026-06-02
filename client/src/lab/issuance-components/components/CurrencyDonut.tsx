import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { currencyMix } from '../issuanceData';
import { useHydration, type HydrationMode } from '../useHydration';
import { Hydrate, SkeletonText } from '../Skeleton';

interface CurrencyDonutProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

export function CurrencyDonut({ mode, runId, delay = 0 }: CurrencyDonutProps) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const total = currencyMix.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="min-h-[2.75rem]">
        <Hydrate
          ready={atLeast('scaffold')}
          skeleton={<SkeletonText className="h-3.5 w-48" />}
        >
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              Global DCM issuance by currency
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Share of Q1 debt capital markets volume
            </p>
          </div>
        </Hydrate>
      </div>

      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative h-44 w-44 shrink-0">
          {atLeast('data') ? (
            <div className="lab-fade-in h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currencyMix}
                    dataKey="value"
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
                    {currencyMix.map((slice) => (
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
                <span className="text-lg font-semibold text-stone-900">{total}%</span>
                <span className="text-[10px] uppercase tracking-wide text-stone-400">
                  charted
                </span>
              </div>
            </div>
          ) : (
            // Ring outline placeholder while arcs are pending
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-40 w-40 rounded-full border-[14px] border-stone-100" />
            </div>
          )}
        </div>

        <div className="w-full flex-1">
          <Hydrate
            ready={atLeast('labels')}
            skeleton={
              <div className="space-y-2">
                {currencyMix.map((slice) => (
                  <div key={slice.name} className="flex items-center gap-2">
                    <SkeletonText className="h-3 w-3 rounded-full" />
                    <SkeletonText className="h-3 w-24" />
                  </div>
                ))}
              </div>
            }
          >
            <ul className="space-y-1.5">
              {currencyMix.map((slice) => (
                <li
                  key={slice.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2 text-stone-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    {slice.name}
                  </span>
                  <span className="font-medium text-stone-900">
                    {atLeast('data') ? `${slice.value}%` : '—'}
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
