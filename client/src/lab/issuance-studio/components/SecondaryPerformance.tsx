import {
  Area,
  AreaChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useHydration } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { TrendDownIcon, TrendUpIcon } from '../../issuance-components/icons';
import { Card, CardEyebrow, CardTitle, StatusChip } from '../primitives/Card';
import { ChartFigure } from '../primitives/ChartFigure';
import { MetricStat } from '../primitives/MetricStat';
import { useReducedMotion } from '../useReducedMotion';
import { fmtPrice, fmtSpread } from '../format';
import type { IssuanceComponentProps } from '../types';
import type { SecondaryPerfData } from '../data/deal';

export function SecondaryPerformance({
  data,
  mode,
  runId,
  delay = 0,
}: IssuanceComponentProps<SecondaryPerfData>) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const reduced = useReducedMotion();

  // Derived during render (no effect): current read is the series tail.
  const last = data.series[data.series.length - 1];
  const priceChange = last.price - data.reofferPrice;
  const spreadChange = last.spreadBps - data.reofferSpreadBps;
  const tighter = spreadChange < 0;
  const lineColor = tighter ? '#10b981' : '#ef4444';

  const caption = `${data.bondName}: trading at ${fmtPrice(last.price)}, ${tighter ? 'up' : 'down'} ${fmtPrice(Math.abs(priceChange))} from the ${fmtPrice(data.reofferPrice)} reoffer; spread ${tighter ? 'tighter' : 'wider'} by ${Math.abs(spreadChange).toFixed(1)} bps.`;

  return (
    <Card>
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
              <CardEyebrow>Secondary Performance</CardEyebrow>
              <CardTitle>{data.bondName}</CardTitle>
              <div className="mt-1 flex items-baseline gap-2">
                <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-7 w-24" />}>
                  <span className="text-2xl font-semibold tabular-nums tracking-tight text-stone-900">
                    {fmtPrice(last.price)}
                  </span>
                </Hydrate>
                <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-4 w-24" />}>
                  <span
                    className={`text-sm font-medium tabular-nums ${tighter ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {priceChange >= 0 ? '+' : '−'}
                    {fmtPrice(Math.abs(priceChange))} ({fmtSpread(spreadChange, 1)})
                  </span>
                </Hydrate>
              </div>
            </div>
          </Hydrate>
        </div>
        <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-6 w-20 rounded-full" />}>
          <StatusChip
            tone={tighter ? 'good' : 'bad'}
            icon={tighter ? <TrendDownIcon className="h-3.5 w-3.5" /> : <TrendUpIcon className="h-3.5 w-3.5" />}
          >
            {tighter ? 'Tightening' : 'Widening'}
          </StatusChip>
        </Hydrate>
      </div>

      <div className="mt-3">
        {atLeast('data') ? (
          <div className={reduced ? '' : 'lab-fade-in'}>
            <ChartFigure caption={caption} height={208}>
              <AreaChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="studio-secondary-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis
                  domain={['dataMin - 0.05', 'dataMax + 0.05']}
                  tick={{ fontSize: 10, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <ReferenceLine
                  y={data.reofferPrice}
                  stroke="#a8a29e"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{ value: `Reoffer ${data.reofferPrice.toFixed(2)}`, position: 'insideTopRight', fontSize: 10, fill: '#a8a29e' }}
                />
                <Tooltip
                  formatter={(value: number | undefined, name) => {
                    const v = typeof value === 'number' ? value : 0;
                    return name === 'price' ? [v.toFixed(2), 'Price'] : [`+${v} bps`, 'Spread'];
                  }}
                  contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff', padding: '6px 10px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#d6d3d1' }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill="url(#studio-secondary-fill)"
                  isAnimationActive={!reduced}
                  animationDuration={800}
                  dot={false}
                />
              </AreaChart>
            </ChartFigure>
          </div>
        ) : (
          <div className="flex h-52 w-full gap-2">
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

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-stone-100 pt-3 sm:grid-cols-4">
        <MetricStat label="Reoffer spread" value={fmtSpread(data.reofferSpreadBps)} size="sm" labelReady={atLeast('labels')} valueReady={atLeast('data')} />
        <MetricStat label="Current spread" value={fmtSpread(last.spreadBps, 1)} size="sm" labelReady={atLeast('labels')} valueReady={atLeast('data')} />
        <MetricStat label="Reoffer price" value={fmtPrice(data.reofferPrice)} size="sm" labelReady={atLeast('labels')} valueReady={atLeast('data')} />
        <MetricStat label="Cash price" value={fmtPrice(last.price)} size="sm" labelReady={atLeast('labels')} valueReady={atLeast('data')} />
      </dl>
    </Card>
  );
}
