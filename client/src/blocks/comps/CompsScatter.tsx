import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { CompsPayload, CompsPoint } from '../contract';
import { ratingColour } from '../primitives';

const BANDS = ['AA', 'A', 'BBB'] as const;

/** The subject sits above everything with a ring, so it reads at a glance. */
function SubjectShape(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill="#0f172a" fillOpacity={0.08} />
      <circle cx={cx} cy={cy} r={6} fill="#0f172a" stroke="#ffffff" strokeWidth={2} />
    </g>
  );
}

function PointTooltip({ active, payload }: { active?: boolean; payload?: { payload: CompsPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point?.issuer) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-stone-900">{point.issuer}</p>
      <p className="mt-0.5 text-[10px] text-stone-500">
        {point.tenorLabel} · {point.rating} · {point.currency} {point.sizeMm}m
      </p>
      <div className="mt-2 grid grid-cols-3 gap-3 tabular-nums">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-stone-400">Spread</p>
          <p className="text-xs font-semibold text-stone-900">{point.spread}bp</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-stone-400">Cover</p>
          <p className="text-xs font-semibold text-stone-900">{point.coverage}x</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-stone-400">NIP</p>
          <p className="text-xs font-semibold text-stone-900">{point.nip}bp</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Spread against tenor: the shape of a comps run as a banker draws it. Dot area
 * carries deal size, colour carries rating band, and the shaded ribbon is the
 * per-tenor interquartile range so "inside the market" is something you can see
 * rather than something you have to compute.
 */
export function CompsScatter({
  payload,
  selectedId,
  onSelect,
  height = 340,
  minimal = false,
}: {
  payload: CompsPayload;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
  minimal?: boolean;
}) {
  const byBand = useMemo(() => {
    const subjectId = payload.subject?.point.id;
    return BANDS.map((band) => ({
      band,
      points: payload.points.filter((p) => p.ratingBand === band && p.id !== subjectId),
    })).filter((group) => group.points.length > 0);
  }, [payload]);

  const subject = payload.subject?.point;
  const tenors = payload.points.map((p) => p.tenorYears);
  const maxTenor = tenors.length ? Math.max(...tenors) : 12;
  const minTenor = tenors.length ? Math.min(...tenors) : 3;
  // Ticks only where paper actually printed, so the axis doesn't imply a
  // 30Y market when the peer set stops at 12Y.
  const ticks = [3, 5, 7, 10, 12, 15, 20, 30].filter(
    (tick) => tick >= minTenor - 1 && tick <= maxTenor + 1,
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart margin={{ top: 8, right: 8, bottom: minimal ? 0 : 4, left: minimal ? -32 : -8 }}>
        {!minimal && <CartesianGrid vertical={false} stroke="#F1F0EE" />}
        {/* Log tenor: credit curves are roughly linear against log maturity, and
            it stops two 30Y prints from squeezing the whole short end into a
            corner. Ticks are labelled, so the scale is never implicit. */}
        <XAxis
          type="number"
          dataKey="tenorYears"
          scale="log"
          domain={[Math.max(1, minTenor * 0.85), maxTenor * 1.15]}
          ticks={ticks}
          tickLine={false}
          axisLine={false}
          tick={minimal ? false : { fontSize: 10, fill: '#a8a29e' }}
          tickFormatter={(value) => `${value}Y`}
          height={minimal ? 4 : 24}
        />
        <YAxis
          type="number"
          dataKey="spread"
          tickLine={false}
          axisLine={false}
          tick={minimal ? false : { fontSize: 10, fill: '#a8a29e' }}
          tickFormatter={(value) => `${value}`}
          width={minimal ? 4 : 44}
          domain={['dataMin - 12', 'dataMax + 12']}
        />
        <ZAxis type="number" dataKey="sizeEurMm" range={minimal ? [12, 90] : [36, 300]} />

        {/* Interquartile ribbon, then the median line through it. */}
        <Area
          data={payload.curve}
          dataKey="band"
          stroke="none"
          fill="#0f172a"
          fillOpacity={0.05}
          isAnimationActive={false}
          activeDot={false}
          legendType="none"
        />
        <Line
          data={payload.curve}
          dataKey="spread"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
          legendType="none"
        />

        {!minimal && <Tooltip content={<PointTooltip />} cursor={false} />}

        {byBand.map((group) => (
          <Scatter
            key={group.band}
            name={group.band}
            data={group.points}
            fill={ratingColour(group.band)}
            fillOpacity={0.62}
            stroke="#ffffff"
            strokeWidth={1}
            isAnimationActive={false}
            onClick={(entry: unknown) => {
              const point = entry as CompsPoint | undefined;
              if (point?.id) onSelect?.(point.id);
            }}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          />
        ))}

        {/* Selection sits between the cloud and the subject in the z-order. */}
        {selectedId && selectedId !== subject?.id && (
          <Scatter
            data={payload.points.filter((p) => p.id === selectedId)}
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth={2}
            isAnimationActive={false}
          />
        )}

        {subject && (
          <Scatter data={[subject]} shape={<SubjectShape />} isAnimationActive={false} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
