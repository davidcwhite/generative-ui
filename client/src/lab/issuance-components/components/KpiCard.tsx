import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { Kpi } from '../issuanceData';
import { useHydration, type HydrationMode } from '../useHydration';
import { Hydrate, SkeletonText } from '../Skeleton';
import { TrendUpIcon, TrendDownIcon, FlatIcon } from '../icons';

interface KpiCardProps {
  kpi: Kpi;
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

const TREND_STYLES: Record<Kpi['trend'], { text: string; stroke: string; fill: string }> = {
  up: { text: 'text-emerald-600', stroke: '#10b981', fill: '#10b981' },
  down: { text: 'text-emerald-600', stroke: '#10b981', fill: '#10b981' },
  flat: { text: 'text-stone-500', stroke: '#a8a29e', fill: '#a8a29e' },
};

function TrendIcon({ trend }: { trend: Kpi['trend'] }) {
  if (trend === 'up') return <TrendUpIcon className="h-3.5 w-3.5" />;
  if (trend === 'down') return <TrendDownIcon className="h-3.5 w-3.5" />;
  return <FlatIcon className="h-3.5 w-3.5" />;
}

export function KpiCard({ kpi, mode, runId, delay = 0 }: KpiCardProps) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const tone = TREND_STYLES[kpi.trend];
  const sparkData = kpi.spark.map((v, i) => ({ i, v }));
  const gradientId = `kpi-spark-${kpi.id}`;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="min-h-[2.25rem]">
        <Hydrate
          ready={atLeast('labels')}
          skeleton={
            <div className="space-y-1.5">
              <SkeletonText className="h-2.5 w-28" />
              <SkeletonText className="h-2.5 w-20" />
            </div>
          }
        >
          <p className="text-xs font-medium leading-snug text-stone-500">{kpi.label}</p>
        </Hydrate>
      </div>

      <div className="mt-3">
        <Hydrate
          ready={atLeast('data')}
          skeleton={<SkeletonText className="h-7 w-24" />}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-stone-900">
              {kpi.value}
            </span>
          </div>
        </Hydrate>

        <div className="mt-1 h-4">
          <Hydrate
            ready={atLeast('data')}
            skeleton={<SkeletonText className="h-2.5 w-16" />}
          >
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone.text}`}>
              <TrendIcon trend={kpi.trend} />
              {kpi.delta}
            </span>
          </Hydrate>
        </div>
      </div>

      <div className="mt-3 h-10">
        <Hydrate
          ready={atLeast('done')}
          skeleton={<div className="lab-shimmer h-full w-full rounded-md" />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone.fill} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={tone.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={tone.stroke}
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                isAnimationActive
                animationDuration={650}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Hydrate>
      </div>
    </div>
  );
}
