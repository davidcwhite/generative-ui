import { Area, AreaChart, YAxis } from 'recharts';
import { useHydration } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Card, CardEyebrow, CardTitle, StatusChip } from '../primitives/Card';
import { MetricStat } from '../primitives/MetricStat';
import { ChartFigure } from '../primitives/ChartFigure';
import { useReducedMotion } from '../useReducedMotion';
import { fmtDate } from '../format';
import type { IssuanceComponentProps } from '../types';
import type { IssuanceWindowData, WindowGauge, WindowRead } from '../data/market';

const READ_TONE: Record<WindowRead, 'good' | 'watch' | 'bad'> = {
  open: 'good',
  selective: 'watch',
  shut: 'bad',
};

const READ_LABEL: Record<WindowRead, string> = {
  open: 'Open',
  selective: 'Selective',
  shut: 'Shut',
};

const GAUGE_DELTA: Record<WindowGauge['tone'], 'good' | 'watch' | 'bad'> = {
  good: 'good',
  watch: 'watch',
  bad: 'bad',
};

export function IssuanceWindow({
  data,
  mode,
  runId,
  delay = 0,
}: IssuanceComponentProps<IssuanceWindowData>) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const reduced = useReducedMotion();
  const labelsReady = atLeast('labels');
  const dataReady = atLeast('data');

  const series = data.scoreSeries.map((v, i) => ({ i, v }));
  const trendUp = data.scoreSeries[data.scoreSeries.length - 1] >= data.scoreSeries[0];
  const lineColor = data.read === 'shut' ? '#ef4444' : data.read === 'selective' ? '#f59e0b' : '#10b981';
  const caption = `Window score trending ${trendUp ? 'higher' : 'lower'} over the last ${data.scoreSeries.length} sessions; read is ${READ_LABEL[data.read]}.`;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-h-[2.75rem] flex-1">
          <Hydrate
            ready={labelsReady}
            skeleton={
              <div className="space-y-1.5">
                <SkeletonText className="h-4 w-36" />
                <SkeletonText className="h-2.5 w-28" />
              </div>
            }
          >
            <div>
              <CardEyebrow>Issuance Window</CardEyebrow>
              <CardTitle>Primary market read</CardTitle>
              <p className="mt-0.5 text-xs text-stone-500">As of {fmtDate(data.asOf)}</p>
            </div>
          </Hydrate>
        </div>
        <Hydrate ready={dataReady} skeleton={<SkeletonText className="h-6 w-16 rounded-full" />}>
          <StatusChip tone={READ_TONE[data.read]}>{READ_LABEL[data.read]}</StatusChip>
        </Hydrate>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {data.gauges.map((gauge) => (
          <MetricStat
            key={gauge.id}
            label={gauge.label}
            value={gauge.value}
            delta={gauge.delta}
            deltaTone={GAUGE_DELTA[gauge.tone]}
            size="sm"
            labelReady={labelsReady}
            valueReady={dataReady}
          />
        ))}
      </dl>

      <div className="mt-4 border-t border-stone-100 pt-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Window score · 10 sessions</p>
        <div className="mt-1">
          {dataReady ? (
            <div className={reduced ? '' : 'lab-fade-in'}>
              <ChartFigure caption={caption} height={56}>
                <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="studio-window-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['dataMin - 6', 'dataMax + 6']} />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={lineColor}
                    strokeWidth={2}
                    fill="url(#studio-window-fill)"
                    isAnimationActive={!reduced}
                    animationDuration={700}
                    dot={false}
                  />
                </AreaChart>
              </ChartFigure>
            </div>
          ) : (
            <SkeletonText className="h-14 w-full rounded-lg" />
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2.5">
        <Hydrate ready={dataReady} skeleton={<SkeletonText className="h-3 w-full" />}>
          <p className="text-xs leading-relaxed text-stone-600 text-pretty">
            <span className="font-medium text-stone-800">{data.expectedSupply}.</span> {data.rationale}
          </p>
        </Hydrate>
      </div>
    </Card>
  );
}
