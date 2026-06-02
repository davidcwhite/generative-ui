import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  secondaryPerf,
  secondaryPrevClose,
  secondarySummary,
} from '../issuanceData';
import { useHydration, type HydrationMode } from '../useHydration';
import { Hydrate, SkeletonText } from '../Skeleton';
import { TrendDownIcon } from '../icons';

interface SecondaryPerformancePanelProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

export function SecondaryPerformancePanel({
  mode,
  runId,
  delay = 0,
}: SecondaryPerformancePanelProps) {
  const { atLeast } = useHydration({ mode, runId, delay });

  const last = secondaryPerf[secondaryPerf.length - 1];
  const isUp = last.price >= secondaryPrevClose;
  const lineColor = isUp ? '#10b981' : '#ef4444';
  const priceChange = last.price - secondaryPrevClose;
  const spreadChange = secondarySummary.currentSpread - secondarySummary.reofferSpread;

  const stats: { label: string; value: string }[] = [
    { label: 'Reoffer spread', value: `+${secondarySummary.reofferSpread} bps` },
    {
      label: 'Current spread',
      value: `+${secondarySummary.currentSpread.toFixed(1)} bps`,
    },
    { label: 'Cash price', value: last.price.toFixed(2) },
    { label: 'Bid/offer', value: '100.39 / 100.43' },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      {/* Header — Perplexity-style price + change */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-h-[3.25rem] flex-1">
          <Hydrate
            ready={atLeast('labels')}
            skeleton={
              <div className="space-y-1.5">
                <SkeletonText className="h-3 w-28" />
                <SkeletonText className="h-6 w-32" />
              </div>
            }
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Secondary performance
              </p>
              <h3 className="mt-0.5 text-sm font-semibold text-stone-900">
                {secondarySummary.bondName}
              </h3>
              <div className="mt-1 flex items-baseline gap-2">
                <Hydrate
                  ready={atLeast('data')}
                  skeleton={<SkeletonText className="h-7 w-24" />}
                >
                  <span className="text-2xl font-semibold tracking-tight text-stone-900">
                    {last.price.toFixed(2)}
                  </span>
                </Hydrate>
                <Hydrate
                  ready={atLeast('data')}
                  skeleton={<SkeletonText className="h-4 w-20" />}
                >
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-medium ${
                      isUp ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {priceChange.toFixed(2)} ({spreadChange.toFixed(1)} bps)
                  </span>
                </Hydrate>
              </div>
            </div>
          </Hydrate>
        </div>
        <Hydrate
          ready={atLeast('data')}
          skeleton={<SkeletonText className="h-6 w-20 rounded-full" />}
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <TrendDownIcon className="h-3.5 w-3.5" />
            {secondarySummary.trend}
          </span>
        </Hydrate>
      </div>

      {/* Chart */}
      <div className="mt-3 h-52">
        {atLeast('data') ? (
          <div className="lab-fade-in h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={secondaryPerf}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="secondary-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 10, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  domain={['dataMin - 0.05', 'dataMax + 0.05']}
                  tick={{ fontSize: 10, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <ReferenceLine
                  y={secondaryPrevClose}
                  stroke="#a8a29e"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: `Reoffer ${secondaryPrevClose.toFixed(2)}`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#a8a29e',
                  }}
                />
                <Tooltip
                  formatter={(value: number | undefined, name) => {
                    const v = typeof value === 'number' ? value : 0;
                    return name === 'price'
                      ? [v.toFixed(2), 'Price']
                      : [`+${v} bps`, 'Spread'];
                  }}
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
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill="url(#secondary-fill)"
                  isAnimationActive
                  animationDuration={800}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          // Chart frame + axis tick scaffold
          <div className="flex h-full w-full gap-2">
            <div className="flex flex-col justify-between py-1">
              {[0, 1, 2, 3].map((tick) => (
                <SkeletonText key={tick} className="h-2 w-8" />
              ))}
            </div>
            <div className="relative flex-1 rounded-lg border border-dashed border-stone-200">
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-stone-200" />
            </div>
          </div>
        )}
      </div>

      {/* Summary stat row */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-stone-100 pt-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
              <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-14" />}>
                <span>{stat.label}</span>
              </Hydrate>
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-stone-800">
              <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3.5 w-12" />}>
                <span>{stat.value}</span>
              </Hydrate>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
