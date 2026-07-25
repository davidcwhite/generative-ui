import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';

/**
 * The credit tape around a date.
 *
 * An embeddable strip rather than a destination of its own — it exists to
 * answer "what was the market doing when this happened", which is a question
 * other blocks raise but none of them should have to answer twice.
 */
export function MarketBackdrop({
  series,
  level,
  changeWeekBp,
  markerDate,
  markerLabel = 'priced',
  height = 64,
}: {
  series: { date: string; level: number }[];
  level: number;
  changeWeekBp: number;
  markerDate?: string;
  markerLabel?: string;
  height?: number;
}) {
  // Widening is the risk direction for an issuer, so it reads amber, not red:
  // a tape 4bp wider is context, not a failure.
  const widened = changeWeekBp > 0;
  const tone = Math.abs(changeWeekBp) < 1.5 ? 'text-stone-500' : widened ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="flex items-center gap-6">
      <div className="shrink-0">
        <p className="text-2xl font-semibold tracking-[-0.03em] text-stone-950 tabular-nums">
          {level}
          <span className="ml-0.5 text-sm font-medium text-stone-400">bp</span>
        </p>
        <p className={`mt-1 text-[11px] ${tone}`}>
          {widened ? '+' : ''}
          {changeWeekBp}bp on the week
        </p>
      </div>

      <div className="min-w-0 flex-1" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="backdrop-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f172a" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* Hidden, but the marker needs a categorical axis to sit on. */}
            <XAxis dataKey="date" hide />
            <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
            <Area
              dataKey="level"
              stroke="#57534e"
              strokeWidth={1.5}
              fill="url(#backdrop-fill)"
              isAnimationActive={false}
            />
            {markerDate && (
              <ReferenceLine
                x={markerDate}
                stroke="#0f172a"
                strokeWidth={1}
                strokeDasharray="3 2"
                label={{
                  value: markerLabel,
                  position: 'insideTopRight',
                  fontSize: 9,
                  fill: '#a8a29e',
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
