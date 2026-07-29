import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { CHART_BAND, ChartBar, EmptyBand, useCollapsed } from './chartFrame';
import { formatBn } from './format';
import { GranularityTabs, StackByMenu } from './IssuanceControls';
import { BarChartSkeleton } from './IssuanceSkeletons';
import type { DateWindow } from './issuanceRange';
import type { CategorySlice, Dimension, Granularity, SeriesPoint } from './issuanceData';

/** Rows a tooltip lists before the tail collapses into one line. */
const TOOLTIP_ROWS = 7;

/** Chips the legend shows before it offers to expand. */
const STACK_CHIPS = 8;

export function VolumeChart({
  series,
  categories,
  chartConfig,
  stackBy,
  shownStackBy,
  granularity,
  dateWindow,
  isFirstLoad,
  isRefreshing,
  isEmpty,
  activeOf,
  onToggle,
  onStackByChange,
  onGranularityChange,
  onClear,
}: {
  series: SeriesPoint[];
  categories: CategorySlice[];
  chartConfig: ChartConfig;
  /** What the user has asked for; the menu follows this immediately. */
  stackBy: Dimension | null;
  /** What the data on screen was built with; the bands follow this. */
  shownStackBy: Dimension | null;
  granularity: Granularity;
  dateWindow: DateWindow;
  isFirstLoad: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  activeOf: (category: string) => boolean | null;
  onToggle: (category: string) => void;
  onStackByChange: (value: Dimension | null) => void;
  onGranularityChange: (value: Granularity) => void;
  onClear: () => void;
}) {
  return (
    <>
      <ChartBar label="Volume trend">
        <StackByMenu value={stackBy} onChange={onStackByChange} />
        <GranularityTabs value={granularity} range={dateWindow} onChange={onGranularityChange} />
      </ChartBar>

      {/* Fixed band height keeps the skeleton and the chart the same size. */}
      <div className={`mt-5 ${isRefreshing ? 'dash-stale' : ''}`} style={{ height: CHART_BAND }}>
        {isFirstLoad ? (
          <BarChartSkeleton />
        ) : isEmpty ? (
          <EmptyBand message="No issuance in this window" onClear={onClear} />
        ) : (
          <div className="flex h-full flex-col">
            <ChartContainer config={chartConfig} className="min-h-0 w-full flex-1">
              <BarChart accessibilityLayer data={series} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
                <CartesianGrid vertical={false} stroke="#F1F0EE" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  interval="preserveStartEnd"
                  minTickGap={granularity === 'daily' ? 28 : 12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(value) => `€${value}bn`}
                />
                <ChartTooltip
                  cursor={{ fill: 'rgba(120,113,108,0.07)' }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => String(payload?.[0]?.payload?.labelLong ?? '')}
                      valueFormatter={(value) => formatBn(Number(value))}
                      /* A long-tail dimension can put a dozen bands in
                         one bar, so the tooltip stays a fixed size. */
                      maxRows={TOOLTIP_ROWS}
                      hideEmpty
                      rankRows={Boolean(shownStackBy)}
                      emptyLabel="No issuance"
                      footer={
                        shownStackBy
                          ? (payload) => (
                              <div className="flex items-center justify-between gap-4 text-foreground">
                                <span className="text-muted-foreground">Total</span>
                                <span className="font-mono font-medium tabular-nums">
                                  {formatBn(Number(payload[0]?.payload?.total ?? 0))}
                                </span>
                              </div>
                            )
                          : undefined
                      }
                    />
                  }
                />
                {shownStackBy ? (
                  categories.map((item, index) => (
                    <Bar
                      key={item.category}
                      dataKey={item.category}
                      stackId="volume"
                      fill={item.fill}
                      maxBarSize={40}
                      animationDuration={450}
                      // Recharts' "auto" default disables chart motion whenever
                      // the OS reports reduced motion. This dashboard keeps the
                      // short data transition on deliberately.
                      isAnimationActive
                      radius={index === categories.length - 1 ? [3, 3, 0, 0] : 0}
                      className="cursor-pointer"
                      opacity={activeOf(item.category) === false ? 0.25 : 1}
                      onClick={() => onToggle(item.category)}
                    />
                  ))
                ) : (
                  <Bar
                    dataKey="total"
                    name="total"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    animationDuration={450}
                    isAnimationActive
                  />
                )}
              </BarChart>
            </ChartContainer>

            {shownStackBy && (
              <StackLegend
                key={shownStackBy}
                categories={categories}
                activeOf={activeOf}
                onToggle={onToggle}
              />
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-stone-400">
        {granularity} gross supply, EUR equivalent
      </p>
    </>
  );
}

/**
 * Under the bars, where the legend competes with the chart for the band's
 * height. Chips are ranked, so the head is the part worth reading.
 */
function StackLegend({
  categories,
  activeOf,
  onToggle,
}: {
  categories: CategorySlice[];
  activeOf: (category: string) => boolean | null;
  onToggle: (category: string) => void;
}) {
  const { shown, hidden, collapsible, expanded, toggle } = useCollapsed(categories, STACK_CHIPS);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-11">
      {shown.map((item) => {
        const active = activeOf(item.category);
        return (
          <button
            key={item.category}
            type="button"
            onClick={() => onToggle(item.category)}
            aria-pressed={active === true}
            className={`flex min-w-0 items-center gap-1.5 rounded text-[11px] transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 ${
              active === false ? 'opacity-40' : ''
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.fill }}
              aria-hidden
            />
            {/* A filtering chip darkens; dimming alone leaves the pick implicit. */}
            <span
              className={`max-w-[160px] truncate ${
                active === true ? 'font-medium text-stone-900' : 'text-stone-600'
              }`}
            >
              {item.category}
            </span>
          </button>
        );
      })}
      {collapsible && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="rounded text-[11px] text-stone-400 transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          {expanded ? 'Show fewer' : `${hidden} more`}
        </button>
      )}
    </div>
  );
}
