import { Cell, Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { CHART_BAND, ChartBar, EmptyBand, useCollapsed } from './chartFrame';
import { formatBn } from './format';
import { BreakdownMenu } from './IssuanceControls';
import { DonutChartSkeleton } from './IssuanceSkeletons';
import { DIMENSION_LABELS, type CategorySlice, type Dimension } from './issuanceData';

/** Legend entries the donut shows before it offers to expand. */
const LEGEND_ROWS = 6;

export function MixDonut({
  slices,
  total,
  chartConfig,
  breakdownBy,
  shownBreakdownBy,
  dealCount,
  selectedShare,
  isFirstLoad,
  isRefreshing,
  activeOf,
  onToggle,
  onBreakdownByChange,
  onClear,
}: {
  slices: CategorySlice[];
  total: number;
  chartConfig: ChartConfig;
  breakdownBy: Dimension;
  shownBreakdownBy: Dimension;
  dealCount: number;
  /**
   * Share of volume the current filter covers. Null when nothing is picked on
   * this dimension, or when the share cannot be stated exactly — the centre
   * falls back to the deal count rather than showing a figure that is wrong.
   */
  selectedShare: number | null;
  isFirstLoad: boolean;
  isRefreshing: boolean;
  activeOf: (category: string) => boolean | null;
  onToggle: (category: string) => void;
  onBreakdownByChange: (value: Dimension) => void;
  onClear: () => void;
}) {
  return (
    <>
      <ChartBar label={`${DIMENSION_LABELS[shownBreakdownBy]} mix`}>
        <BreakdownMenu value={breakdownBy} onChange={onBreakdownByChange} />
      </ChartBar>

      {/* Min height, not height: expanding the legend grows the
          column rather than hiding rows behind a scrollbar. */}
      <div
        className={`mt-5 flex flex-col justify-center ${isRefreshing ? 'dash-stale' : ''}`}
        style={{ minHeight: CHART_BAND }}
      >
        {isFirstLoad ? (
          <DonutChartSkeleton />
        ) : slices.length === 0 ? (
          <EmptyBand message="Nothing to break down" onClear={onClear} />
        ) : (
          <div className="grid content-center gap-4 sm:grid-cols-[minmax(180px,0.8fr)_1fr] xl:grid-cols-1">
            <div className="relative mx-auto h-[184px] w-full max-w-[230px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        nameKey="category"
                        valueFormatter={(value) => formatBn(Number(value))}
                      />
                    }
                  />
                  <Pie
                    data={slices}
                    dataKey="volume"
                    nameKey="category"
                    innerRadius={62}
                    outerRadius={82}
                    paddingAngle={2}
                    strokeWidth={0}
                    animationDuration={450}
                    // Match the bar chart: retain the short data transition
                    // even when the host OS reports reduced motion.
                    isAnimationActive
                  >
                    {slices.map((slice) => (
                      <Cell
                        key={slice.category}
                        fill={slice.fill}
                        opacity={activeOf(slice.category) === false ? 0.2 : 1}
                        className="cursor-pointer transition-opacity"
                        onClick={() => onToggle(slice.category)}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tracking-[-0.04em] text-stone-950">
                  {selectedShare === null ? dealCount : `${selectedShare.toFixed(0)}%`}
                </span>
                <span className="mt-0.5 text-[10px] text-stone-400">
                  {selectedShare === null ? (dealCount === 1 ? 'deal' : 'deals') : 'of volume'}
                </span>
              </div>
            </div>

            <BreakdownLegend
              key={shownBreakdownBy}
              slices={slices}
              total={total}
              activeOf={activeOf}
              onToggle={onToggle}
            />
          </div>
        )}
      </div>
    </>
  );
}

function BreakdownLegend({
  slices,
  total,
  activeOf,
  onToggle,
}: {
  slices: CategorySlice[];
  total: number;
  activeOf: (category: string) => boolean | null;
  onToggle: (category: string) => void;
}) {
  const { shown, hidden, collapsible, expanded, toggle } = useCollapsed(slices, LEGEND_ROWS);

  return (
    <div className="grid content-center gap-0.5">
      {shown.map((slice) => {
        const percentage = total > 0 ? (slice.volume / total) * 100 : 0;
        const active = activeOf(slice.category);
        return (
          <button
            key={slice.category}
            type="button"
            onClick={() => onToggle(slice.category)}
            aria-pressed={active === true}
            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
              active === false ? 'opacity-40' : ''
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: slice.fill }}
              aria-hidden
            />
            {/* A filtering row darkens; dimming alone leaves the pick implicit. */}
            <span
              className={`min-w-0 flex-1 truncate text-[11px] ${
                active === true ? 'font-medium text-stone-900' : 'text-stone-600'
              }`}
            >
              {slice.category}
            </span>
            <span
              className={`text-[10px] tabular-nums ${
                active === true ? 'text-stone-600' : 'text-stone-400'
              }`}
            >
              {percentage.toFixed(0)}%
            </span>
          </button>
        );
      })}
      {collapsible && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[11px] text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span className="h-2 w-2 shrink-0" aria-hidden />
          {expanded ? 'Show fewer' : `${hidden} more`}
        </button>
      )}
    </div>
  );
}
