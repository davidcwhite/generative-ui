import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supplyBySegment, supplySegments } from '../issuanceData';
import { useHydration, type HydrationMode } from '../useHydration';
import { Hydrate, SkeletonText } from '../Skeleton';

interface SupplyStackedBarProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

export function SupplyStackedBar({ mode, runId, delay = 0 }: SupplyStackedBarProps) {
  const { atLeast } = useHydration({ mode, runId, delay });

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="min-h-[2.75rem]">
        <Hydrate
          ready={atLeast('scaffold')}
          skeleton={<SkeletonText className="h-3.5 w-52" />}
        >
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              EUR bank bond supply by segment
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Covered bonds, senior unsecured & bank capital (€bn)
            </p>
          </div>
        </Hydrate>
      </div>

      <div className="mt-3 h-56">
        {atLeast('data') ? (
          <div className="lab-fade-in h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={supplyBySegment}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: '#78716c' }}
                  axisLine={{ stroke: '#e7e5e4' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `€${v}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  formatter={(value: number | undefined, name) => [`€${value ?? 0}bn`, name]}
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                    padding: '6px 10px',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#d6d3d1' }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
                {supplySegments.map((segment, index) => (
                  <Bar
                    key={segment.key}
                    dataKey={segment.key}
                    name={segment.label}
                    stackId="supply"
                    fill={segment.color}
                    isAnimationActive
                    animationDuration={650}
                    animationBegin={index * 180}
                    radius={
                      index === supplySegments.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                    }
                    maxBarSize={64}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          // Axis + gridline scaffold while bars are pending
          <div className="flex h-full w-full flex-col justify-between pb-6">
            {[0, 1, 2, 3].map((line) => (
              <div key={line} className="flex items-center gap-2">
                <SkeletonText className="h-2 w-6" />
                <div className="h-px flex-1 bg-stone-100" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
