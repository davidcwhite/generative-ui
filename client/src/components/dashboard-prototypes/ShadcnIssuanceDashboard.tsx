import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSettingsButton, useDashboardChrome } from './DashboardSettings';
import { IssuanceDetail } from './IssuanceDetail';
import { IssuanceGrid } from './IssuanceGrid';
import { useScrolled } from './useScrolled';
import {
  BarChartSkeleton,
  DetailSkeleton,
  DonutChartSkeleton,
  RefreshIndicator,
} from './IssuanceSkeletons';
import { BreakdownMenu, GranularityTabs, RangeControl, StackByMenu } from './IssuanceControls';
import { IssuanceFilterBar } from './IssuanceFilterBar';
import { selectedValues, toggleValues } from './issuanceFilters';
import { resolvePreset, snapGranularity, type DateWindow, type RangePreset } from './issuanceRange';
import type { FilterClause, IssuanceQuery, IssuanceStats } from './issuanceApi';
import { useIssuanceAggregates, useSettledFlag } from './useIssuanceAggregates';
import {
  DIMENSION_LABELS,
  OTHER_CATEGORY,
  type Dimension,
  type Granularity,
  type IssuanceRecord,
} from './shadcnIssuanceData';

type ViewMode = 'dashboards' | 'data';
type DatasetId = 'issuance' | 'allocations' | 'market' | 'pipeline' | 'comparables';

const DATASETS: { id: DatasetId; label: string }[] = [
  { id: 'issuance', label: 'Issuance' },
  { id: 'allocations', label: 'Allocations' },
  { id: 'market', label: 'Market' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'comparables', label: 'Comparables' },
];

/** Both charts and their skeletons occupy this exact height. */
const CHART_BAND = 372;

function formatBn(value: number) {
  return value >= 1000 ? `€${(value / 1000).toFixed(2)}tn` : `€${value.toFixed(1)}bn`;
}

/** Millions in, the tidiest unit out. */
function formatMm(value: number) {
  return value >= 1000 ? `€${(value / 1000).toFixed(1)}bn` : `€${Math.round(value)}m`;
}

export default function ShadcnIssuanceDashboard() {
  const { prefs } = useDashboardChrome();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboards');
  const [dataset, setDataset] = useState<DatasetId>('issuance');

  const [preset, setPreset] = useState<RangePreset | 'CUSTOM'>('1Y');
  const [custom, setCustom] = useState<DateWindow | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [stackBy, setStackBy] = useState<Dimension | null>(null);
  const [breakdownBy, setBreakdownBy] = useState<Dimension>('sector');
  const [filters, setFilters] = useState<FilterClause[]>([]);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const [pickedRow, setPickedRow] = useState<IssuanceRecord | null>(null);
  const [defaultRow, setDefaultRow] = useState<IssuanceRecord | null>(null);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [isGridLoading, setIsGridLoading] = useState(true);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft), 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const dateWindow = useMemo<DateWindow>(
    () => (preset === 'CUSTOM' && custom ? custom : resolvePreset(preset as RangePreset)),
    [preset, custom],
  );

  // A narrower window can strand the current bucket size, so it follows along.
  useEffect(() => {
    setGranularity((current) => snapGranularity(current, dateWindow));
  }, [dateWindow]);

  const query = useMemo<IssuanceQuery>(
    () => ({
      from: dateWindow.from,
      to: dateWindow.to,
      granularity,
      stackBy,
      breakdownBy,
      filters,
      search,
    }),
    [dateWindow, granularity, stackBy, breakdownBy, filters, search],
  );

  // A new result set invalidates the user's row choice; block refetches don't.
  const queryKey = JSON.stringify(query);
  useEffect(() => setPickedRow(null), [queryKey]);

  const { data: aggregates, isFirstLoad, isRefreshing } = useIssuanceAggregates(query);
  const showRefreshing = useSettledFlag(isRefreshing);
  const showGridRefreshing = useSettledFlag(isGridLoading && totalRows !== null);

  const series = aggregates?.series ?? [];
  const categories = aggregates?.categories ?? [];
  const breakdown = aggregates?.breakdown ?? [];
  const stats = aggregates?.stats;
  // The payload's own dimensions, so a chart never renders bands it lacks data for.
  const shownStackBy = aggregates?.stackBy ?? null;
  const shownBreakdownBy = aggregates?.breakdownBy ?? breakdownBy;

  const chartConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries([
        ['total', { label: 'Volume', color: 'var(--chart-1)' }],
        ...categories.map((item) => [item.category, { label: item.category, color: item.fill }]),
        ...breakdown.map((item) => [item.category, { label: item.category, color: item.fill }]),
      ]),
    [categories, breakdown],
  );

  const clearAll = () => {
    setFilters([]);
    setSearchDraft('');
    setSearch('');
  };

  /** Chart clicks resolve "Other" back to the values it folds in. */
  const toggleCategory = (dimension: Dimension, category: string, other: string[]) => {
    setFilters((current) =>
      toggleValues(current, dimension, category === OTHER_CATEGORY ? other : [category]),
    );
  };

  const isActive = (dimension: Dimension, category: string, other: string[]) => {
    const values = selectedValues(filters, dimension);
    if (values.length === 0) return null;
    return category === OTHER_CATEGORY
      ? other.some((value) => values.includes(value))
      : values.includes(category);
  };

  if (dataset !== 'issuance') {
    return (
      <DashboardShell
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        dataset={dataset}
        onDatasetChange={setDataset}
      >
        <DatasetPlaceholder dataset={dataset} onReturn={() => setDataset('issuance')} />
      </DashboardShell>
    );
  }

  const stackOther = aggregates?.stackOther ?? [];
  const breakdownOther = aggregates?.breakdownOther ?? [];
  const breakdownTotal = aggregates?.breakdownTotal ?? 0;
  const selectedShare =
    selectedValues(filters, shownBreakdownBy).length === 0 || breakdownTotal === 0
      ? null
      : (breakdown
          .filter((slice) => isActive(shownBreakdownBy, slice.category, breakdownOther))
          .reduce((sum, slice) => sum + slice.volume, 0) /
          breakdownTotal) *
        100;

  return (
    <DashboardShell
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      dataset={dataset}
      onDatasetChange={setDataset}
    >
      <div className="mx-auto w-full max-w-[1800px] px-5 py-7 lg:px-8">
        {/* The nav already names the dataset, so the headline figure is the title. */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {/* The indicator shares the caption's line box, clear of the figure. */}
            <div className="flex items-center gap-2.5">
              <h1 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                Issuance volume
              </h1>
              {showRefreshing && <RefreshIndicator />}
            </div>
            {isFirstLoad || !stats ? <StatStripSkeleton /> : <StatStrip stats={stats} />}
          </div>

          <RangeControl
            preset={preset}
            custom={custom}
            onPresetSelect={(next) => {
              setPreset(next);
              setCustom(null);
            }}
            onCustomSelect={(next) => {
              setCustom(next);
              setPreset('CUSTOM');
            }}
          />
        </header>

        {viewMode === 'dashboards' && (
          <section className="mt-8 grid gap-9 xl:grid-cols-12 xl:gap-12">
            <div
              className={`flex flex-col ${prefs.showSectorMix ? 'xl:col-span-8' : 'xl:col-span-12'}`}
              aria-busy={isFirstLoad || isRefreshing}
            >
              <ChartBar>
                <StackByMenu value={stackBy} onChange={setStackBy} />
                <GranularityTabs value={granularity} range={dateWindow} onChange={setGranularity} />
              </ChartBar>

              {/* Fixed band height keeps the skeleton and the chart the same size. */}
              <div
                className={`mt-5 ${showRefreshing ? 'dash-stale' : ''}`}
                style={{ height: CHART_BAND }}
              >
                {isFirstLoad ? (
                  <BarChartSkeleton />
                ) : stats?.dealCount === 0 ? (
                  <EmptyBand message="No issuance in this window" onClear={clearAll} />
                ) : (
                  <div className="flex h-full flex-col">
                    <ChartContainer config={chartConfig} className="min-h-0 w-full flex-1">
                      <BarChart
                        accessibilityLayer
                        data={series}
                        margin={{ top: 8, right: 4, bottom: 0, left: -8 }}
                      >
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
                              labelFormatter={(_, payload) =>
                                String(payload?.[0]?.payload?.labelLong ?? '')
                              }
                              valueFormatter={(value) => formatBn(Number(value))}
                              footer={
                                shownStackBy
                                  ? (payload) => (
                                      <div className="flex items-center justify-between gap-4 text-foreground">
                                        <span className="text-muted-foreground">Total</span>
                                        <span className="font-mono font-medium tabular-nums">
                                          {formatBn(
                                            Number(payload[0]?.payload?.total ?? 0),
                                          )}
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
                              radius={index === categories.length - 1 ? [3, 3, 0, 0] : 0}
                              className="cursor-pointer"
                              opacity={
                                isActive(shownStackBy, item.category, stackOther) === false ? 0.25 : 1
                              }
                              onClick={() =>
                                toggleCategory(shownStackBy, item.category, stackOther)
                              }
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
                          />
                        )}
                      </BarChart>
                    </ChartContainer>

                    {shownStackBy && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-11">
                        {categories.map((item) => {
                          const active = isActive(shownStackBy, item.category, stackOther);
                          return (
                            <button
                              key={item.category}
                              type="button"
                              onClick={() => toggleCategory(shownStackBy, item.category, stackOther)}
                              aria-pressed={active === true}
                              className={`flex items-center gap-1.5 rounded text-[11px] transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 ${
                                active === false ? 'opacity-40' : ''
                              }`}
                            >
                              <span
                                className="h-2 w-2 rounded-[2px]"
                                style={{ backgroundColor: item.fill }}
                                aria-hidden
                              />
                              <span className="text-stone-600">{item.category}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-3 text-[11px] text-stone-400">
                {granularity} gross supply, EUR equivalent
              </p>
            </div>

            {prefs.showSectorMix && (
              <div className="flex flex-col xl:col-span-4" aria-busy={isFirstLoad || isRefreshing}>
                <ChartBar label={`${DIMENSION_LABELS[shownBreakdownBy]} mix`}>
                  <BreakdownMenu value={breakdownBy} onChange={setBreakdownBy} />
                </ChartBar>

                <div
                  className={`mt-5 ${showRefreshing ? 'dash-stale' : ''}`}
                  style={{ height: CHART_BAND }}
                >
                  {isFirstLoad ? (
                    <DonutChartSkeleton />
                  ) : breakdown.length === 0 ? (
                    <EmptyBand message="Nothing to break down" onClear={clearAll} />
                  ) : (
                    <div className="grid h-full content-center gap-4 sm:grid-cols-[minmax(180px,0.8fr)_1fr] xl:grid-cols-1">
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
                              data={breakdown}
                              dataKey="volume"
                              nameKey="category"
                              innerRadius={62}
                              outerRadius={82}
                              paddingAngle={2}
                              strokeWidth={0}
                              animationDuration={450}
                            >
                              {breakdown.map((slice) => (
                                <Cell
                                  key={slice.category}
                                  fill={slice.fill}
                                  opacity={
                                    isActive(shownBreakdownBy, slice.category, breakdownOther) === false
                                      ? 0.2
                                      : 1
                                  }
                                  className="cursor-pointer transition-opacity"
                                  onClick={() =>
                                    toggleCategory(shownBreakdownBy, slice.category, breakdownOther)
                                  }
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-semibold tracking-[-0.04em] text-stone-950">
                            {selectedShare === null
                              ? (stats?.dealCount ?? 0)
                              : `${selectedShare.toFixed(0)}%`}
                          </span>
                          <span className="mt-0.5 text-[10px] text-stone-400">
                            {selectedShare === null ? 'deals' : 'of volume'}
                          </span>
                        </div>
                      </div>

                      <div className="grid content-center gap-0.5">
                        {breakdown.map((slice) => {
                          const percentage =
                            breakdownTotal > 0 ? (slice.volume / breakdownTotal) * 100 : 0;
                          const active = isActive(shownBreakdownBy, slice.category, breakdownOther);
                          return (
                            <button
                              key={slice.category}
                              type="button"
                              onClick={() =>
                                toggleCategory(shownBreakdownBy, slice.category, breakdownOther)
                              }
                              aria-pressed={active === true}
                              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                                active === false ? 'opacity-40' : ''
                              }`}
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: slice.fill }}
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 truncate text-[11px] text-stone-600">
                                {slice.category}
                              </span>
                              <span className="text-[10px] tabular-nums text-stone-400">
                                {percentage.toFixed(0)}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="mt-10 border-t border-stone-200/70 pt-5">
          <IssuanceFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onClearAll={clearAll}
          >
            {showGridRefreshing && <RefreshIndicator label="Loading" />}
            {totalRows === null ? (
              <Skeleton className="h-2.5 w-14" />
            ) : (
              <span className="tabular-nums">{totalRows.toLocaleString()} issues</span>
            )}
          </IssuanceFilterBar>

          <div
            className={`mt-4 grid gap-7 ${
              !prefs.showDetailPanel
                ? ''
                : viewMode === 'data'
                  ? 'xl:grid-cols-[minmax(0,1fr)_300px]'
                  : 'xl:grid-cols-[minmax(0,1fr)_282px]'
            }`}
          >
            <div className="min-w-0">
              <IssuanceGrid
                query={query}
                density={prefs.density}
                onSelect={setPickedRow}
                onDefaultRow={setDefaultRow}
                onTotalRowsChange={setTotalRows}
                onLoadingChange={setIsGridLoading}
              />
            </div>
            {prefs.showDetailPanel && (
              <div>
                {pickedRow ?? defaultRow ? (
                  <IssuanceDetail record={pickedRow ?? defaultRow} />
                ) : isGridLoading ? (
                  <DetailSkeleton />
                ) : (
                  <IssuanceDetail record={null} />
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

/** Headline figure first, supporting figures at caption weight beside it. */
function StatStrip({ stats }: { stats: IssuanceStats }) {
  return (
    <div className={`${STRIP_BOX} flex-wrap gap-x-7 gap-y-2`}>
      <span className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-stone-950">
        {formatBn(stats.totalVolume)}
      </span>
      <div className="flex items-end gap-6">
        <Stat label="Deals" value={stats.dealCount.toLocaleString()} />
        <Stat label="Average" value={formatMm(stats.averageSize)} />
        <Stat
          label="Largest"
          value={stats.largest ? formatMm(stats.largest.volume) : '—'}
          suffix={stats.largest?.ticker}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="border-l border-stone-200/80 pl-6 first:border-l-0 first:pl-0">
      <p className="text-[10px] uppercase tracking-[0.1em] text-stone-400">{label}</p>
      <p className="mt-1.5 text-sm font-medium leading-none tabular-nums text-stone-800">
        {value}
        {suffix && <span className="ml-1.5 text-[11px] text-stone-400">{suffix}</span>}
      </p>
    </div>
  );
}

/** The strip and its skeleton share this box, so the page never shifts. */
const STRIP_BOX = 'mt-2 flex min-h-9 items-end';

function StatStripSkeleton() {
  return (
    <div className={`${STRIP_BOX} gap-7`}>
      <Skeleton className="h-8 w-40" />
      <div className="flex items-end gap-6">
        {[44, 52, 64].map((width) => (
          <div key={width} className="space-y-2">
            <Skeleton className="h-2 w-10" />
            <Skeleton className="h-3" style={{ width }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyBand({ message, onClear }: { message: string; onClear: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-xs text-stone-500">{message}</p>
      <Button variant="ghost" size="xs" className="text-stone-600" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

/**
 * A chart's own controls, sat directly above it. Both columns reserve the same
 * height so their charts start on the same line.
 */
function ChartBar({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      {label ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
          {label}
        </p>
      ) : (
        <span aria-hidden />
      )}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function DashboardShell({
  viewMode,
  onViewModeChange,
  dataset,
  onDatasetChange,
  children,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  dataset: DatasetId;
  onDatasetChange: (dataset: DatasetId) => void;
  children: React.ReactNode;
}) {
  const { ref, scrolled } = useScrolled();

  return (
    <div ref={ref} className="min-h-full bg-white">
      <div
        className={`sticky top-0 z-20 border-b bg-white/70 backdrop-blur-xl transition-colors duration-200 ${
          scrolled ? 'border-stone-200/80' : 'border-transparent'
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-6 px-5 lg:px-8">
          <nav className="flex gap-5 overflow-x-auto" aria-label="Data domains">
            {DATASETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onDatasetChange(item.id)}
                aria-current={dataset === item.id ? 'page' : undefined}
                className={`relative h-12 whitespace-nowrap text-xs font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-stone-900 after:opacity-0 ${
                  dataset === item.id
                    ? 'text-stone-950 after:opacity-100'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
              <TabsList aria-label="Dashboard or data view" className="h-8 bg-stone-100">
                <TabsTrigger value="dashboards" className="h-7">
                  Dashboards
                </TabsTrigger>
                <TabsTrigger value="data" className="h-7">
                  Data
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <DashboardSettingsButton />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function DatasetPlaceholder({
  dataset,
  onReturn,
}: {
  dataset: DatasetId;
  onReturn: () => void;
}) {
  const label = DATASETS.find((item) => item.id === dataset)?.label ?? dataset;
  return (
    <div className="mx-auto flex min-h-[34rem] max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500">
        <Database className="h-4 w-4" aria-hidden />
      </span>
      <h1 className="mt-4 text-sm font-semibold text-stone-900">{label} is not populated yet</h1>
      <p className="mt-1 text-xs leading-5 text-stone-500">
        The navigation is ready for additional data domains. This prototype currently models the
        full issuance workflow.
      </p>
      <Button className="mt-4" size="sm" onClick={onReturn}>
        Return to issuance
      </Button>
    </div>
  );
}
