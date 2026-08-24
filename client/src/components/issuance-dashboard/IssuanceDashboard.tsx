import { useEffect, useMemo, useState } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import {
  DashboardShell,
  DatasetPlaceholder,
  type DatasetId,
  type ViewMode,
} from './DashboardShell';
import { StatStrip, StatStripSkeleton } from './IssuanceHero';
import { IssuanceTable } from './IssuanceTable';
import { MixDonut } from './MixDonut';
import { VolumeChart } from './VolumeChart';
import { RangeControl } from './IssuanceControls';
import { RefreshIndicator } from './IssuanceSkeletons';
import { selectedValues, toggleValues } from './issuanceFilters';
import {
  DEFAULT_RANGE_PRESET,
  resolvePreset,
  snapGranularity,
  type DateWindow,
  type RangePreset,
} from './issuanceRange';
import type { FilterClause, IssuanceQuery } from './issuanceApi';
import { useIssuanceAggregates, useSettledFlag } from './useIssuanceAggregates';
import {
  OTHER_CATEGORY,
  type CategorySlice,
  type Dimension,
  type Granularity,
  type SeriesPoint,
} from './issuanceData';

export interface DisplayPrefs {
  density: 'comfortable' | 'compact';
  showSectorMix: boolean;
  showDetailPanel: boolean;
}

const DEFAULT_PREFS: DisplayPrefs = {
  density: 'comfortable',
  showSectorMix: true,
  showDetailPanel: true,
};

/** Shared placeholders: a fresh literal per render would defeat the memos. */
const NO_SERIES: SeriesPoint[] = [];
const NO_SLICES: CategorySlice[] = [];
const NO_VALUES: string[] = [];

/**
 * Holds the query and nothing else. Everything that changes for reasons the
 * query doesn't care about — a selected row, a page of the table, a half-typed
 * search term — is owned further down, which is what keeps the charts still.
 */
export function IssuanceDashboard({
  prefs = DEFAULT_PREFS,
  toolbar,
}: {
  prefs?: DisplayPrefs;
  toolbar?: React.ReactNode;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboards');
  const [dataset, setDataset] = useState<DatasetId>('issuance');

  const [preset, setPreset] = useState<RangePreset | 'CUSTOM'>(DEFAULT_RANGE_PRESET);
  const [custom, setCustom] = useState<DateWindow | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [stackBy, setStackBy] = useState<Dimension | null>(null);
  const [breakdownBy, setBreakdownBy] = useState<Dimension>('sector');
  const [filters, setFilters] = useState<FilterClause[]>([]);
  const [search, setSearch] = useState('');
  const [searchKey, setSearchKey] = useState(0);

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

  const { data: aggregates, isFirstLoad, isRefreshing } = useIssuanceAggregates(query);
  const showRefreshing = useSettledFlag(isRefreshing);

  const nav = {
    viewMode,
    onViewModeChange: setViewMode,
    dataset,
    onDatasetChange: setDataset,
    toolbar,
  };

  const categories = aggregates?.categories ?? NO_SLICES;
  const breakdown = aggregates?.breakdown ?? NO_SLICES;
  const stats = aggregates?.stats;
  // The payload's own dimensions, so a chart never renders bands it lacks data for.
  const shownStackBy = aggregates?.stackBy ?? null;
  const shownBreakdownBy = aggregates?.breakdownBy ?? breakdownBy;
  const stackOther = aggregates?.stackOther ?? NO_VALUES;
  const breakdownOther = aggregates?.breakdownOther ?? NO_VALUES;
  const breakdownTotal = aggregates?.breakdownTotal ?? 0;

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
    setSearch('');
    setSearchKey((current) => current + 1);
  };

  /** Chart clicks resolve "Other" back to the values it folds in. */
  const toggleCategory = (dimension: Dimension | null, category: string, other: string[]) => {
    if (!dimension) return;
    setFilters((current) =>
      toggleValues(current, dimension, category === OTHER_CATEGORY ? other : [category]),
    );
  };

  const isActive = (dimension: Dimension | null, category: string, other: string[]) => {
    const values = dimension ? selectedValues(filters, dimension) : NO_VALUES;
    if (values.length === 0) return null;
    return category === OTHER_CATEGORY
      ? other.some((value) => values.includes(value))
      : values.includes(category);
  };

  const breakdownValues = selectedValues(filters, shownBreakdownBy);

  /**
   * Slice volumes are exact per category, so a selection that takes only part
   * of the folded "Other" slice cannot be priced from them — it would claim the
   * whole bucket, two orders of magnitude out for a single issuer.
   */
  const otherPartlySelected =
    breakdownOther.some((value) => breakdownValues.includes(value)) &&
    !breakdownOther.every((value) => breakdownValues.includes(value));

  const selectedShare =
    breakdownValues.length === 0 || breakdownTotal === 0 || otherPartlySelected
      ? null
      : (breakdown
          .filter((slice) => isActive(shownBreakdownBy, slice.category, breakdownOther))
          .reduce((sum, slice) => sum + slice.volume, 0) /
          breakdownTotal) *
        100;

  if (dataset !== 'issuance') {
    return (
      <DashboardShell {...nav}>
        <DatasetPlaceholder dataset={dataset} onReturn={() => setDataset('issuance')} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell {...nav}>
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
              <VolumeChart
                series={aggregates?.series ?? NO_SERIES}
                categories={categories}
                chartConfig={chartConfig}
                stackBy={stackBy}
                shownStackBy={shownStackBy}
                granularity={granularity}
                dateWindow={dateWindow}
                isFirstLoad={isFirstLoad}
                isRefreshing={showRefreshing}
                isEmpty={stats?.dealCount === 0}
                activeOf={(category) => isActive(shownStackBy, category, stackOther)}
                onToggle={(category) => toggleCategory(shownStackBy, category, stackOther)}
                onStackByChange={setStackBy}
                onGranularityChange={setGranularity}
                onClear={clearAll}
              />
            </div>

            {prefs.showSectorMix && (
              <div className="flex flex-col xl:col-span-4" aria-busy={isFirstLoad || isRefreshing}>
                <MixDonut
                  slices={breakdown}
                  total={breakdownTotal}
                  chartConfig={chartConfig}
                  breakdownBy={breakdownBy}
                  shownBreakdownBy={shownBreakdownBy}
                  dealCount={stats?.dealCount ?? 0}
                  selectedShare={selectedShare}
                  isFirstLoad={isFirstLoad}
                  isRefreshing={showRefreshing}
                  activeOf={(category) => isActive(shownBreakdownBy, category, breakdownOther)}
                  onToggle={(category) =>
                    toggleCategory(shownBreakdownBy, category, breakdownOther)
                  }
                  onBreakdownByChange={setBreakdownBy}
                  onClear={clearAll}
                />
              </div>
            )}
          </section>
        )}

        <IssuanceTable
          query={query}
          filters={filters}
          onFiltersChange={setFilters}
          onSearchChange={setSearch}
          onClearAll={clearAll}
          searchKey={searchKey}
          dealCount={stats?.dealCount ?? null}
          density={prefs.density}
          showDetailPanel={prefs.showDetailPanel}
          wide={viewMode === 'data'}
        />
      </div>
    </DashboardShell>
  );
}
