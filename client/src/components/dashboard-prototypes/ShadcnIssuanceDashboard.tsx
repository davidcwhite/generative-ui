import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Database, Filter, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import type { IssuanceQuery } from './issuanceApi';
import { useIssuanceAggregates, useSettledFlag } from './useIssuanceAggregates';
import {
  ISSUANCE_CURRENCIES,
  ISSUANCE_MONTHS,
  ISSUANCE_RATINGS,
  ISSUANCE_SECTORS,
  type IssuanceRecord,
} from './shadcnIssuanceData';

type ViewMode = 'dashboards' | 'data';
type DatasetId = 'issuance' | 'allocations' | 'market' | 'pipeline' | 'comparables';
type Range = '6M' | 'YTD' | '12M' | '3Y';

const DATASETS: { id: DatasetId; label: string }[] = [
  { id: 'issuance', label: 'Issuance' },
  { id: 'allocations', label: 'Allocations' },
  { id: 'market', label: 'Market' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'comparables', label: 'Comparables' },
];

const RANGES: Range[] = ['6M', 'YTD', '12M', '3Y'];

/** Both charts and their skeletons occupy this exact height. */
const CHART_BAND = 372;

const volumeChartConfig = {
  volume: {
    label: 'Volume',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export default function ShadcnIssuanceDashboard() {
  const { prefs } = useDashboardChrome();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboards');
  const [dataset, setDataset] = useState<DatasetId>('issuance');
  const [range, setRange] = useState<Range>('12M');
  const [search, setSearch] = useState('');
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [ratings, setRatings] = useState<string[]>([]);
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

  const rangeMonths = useMemo(() => {
    if (range === '6M') return ISSUANCE_MONTHS.slice(-6);
    if (range === '12M') return ISSUANCE_MONTHS.slice(-12);
    if (range === 'YTD') return ISSUANCE_MONTHS.filter((month) => month.startsWith('2026'));
    return ISSUANCE_MONTHS;
  }, [range]);

  const query = useMemo<IssuanceQuery>(
    () => ({ months: rangeMonths, currencies, ratings, sectors, search }),
    [currencies, rangeMonths, ratings, sectors, search],
  );

  // A new result set invalidates the user's row choice; block refetches don't.
  const queryKey = JSON.stringify(query);
  useEffect(() => setPickedRow(null), [queryKey]);

  const { data: aggregates, isFirstLoad, isRefreshing } = useIssuanceAggregates(query);
  const showRefreshing = useSettledFlag(isRefreshing);
  const showGridRefreshing = useSettledFlag(isGridLoading && totalRows !== null);

  const monthlyData = aggregates?.monthly ?? [];
  const sectorData = aggregates?.sectors ?? [];
  const totalVolume = aggregates?.totalVolume ?? 0;
  const otherMembers = aggregates?.otherSectors ?? [];

  const sectorChartConfig = useMemo(
    () =>
      Object.fromEntries(
        sectorData.map((item) => [item.sector, { label: item.sector, color: item.fill }]),
      ) satisfies ChartConfig,
    [sectorData],
  );

  // Falls back to the newest row of the first block so the card is never empty.
  const selected = pickedRow ?? defaultRow;
  const activeFilterCount = currencies.length + sectors.length + ratings.length;

  const toggle = (
    value: string,
    current: string[],
    setter: (values: string[]) => void,
  ) => setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  const clearFilters = () => {
    setCurrencies([]);
    setSectors([]);
    setRatings([]);
    setSearchDraft('');
    setSearch('');
  };

  const isSectorActive = (sector: string) =>
    sector === 'Other'
      ? otherMembers.some((item) => sectors.includes(item))
      : sectors.includes(sector);

  const toggleSectorGroup = (sector: string) => {
    if (sector !== 'Other') {
      toggle(sector, sectors, setSectors);
      return;
    }
    const allSelected = otherMembers.every((item) => sectors.includes(item));
    setSectors(
      allSelected
        ? sectors.filter((item) => !otherMembers.includes(item))
        : [...new Set([...sectors, ...otherMembers])],
    );
  };

  /** The donut centre reports the selection rather than repeating the headline figure. */
  const selectedShare =
    sectors.length === 0 || totalVolume === 0
      ? null
      : (sectorData
          .filter((item) => isSectorActive(item.sector))
          .reduce((sum, item) => sum + item.volume, 0) /
          totalVolume) *
        100;

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

  return (
    <DashboardShell
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      dataset={dataset}
      onDatasetChange={setDataset}
    >
      <div className="mx-auto w-full max-w-[1800px] px-5 py-7 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {/* The indicator shares the title's line box; centring it against the
                whole two-line stack drops it beside the description instead. */}
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-[-0.025em] text-stone-900">
                Issuance {viewMode === 'data' ? 'data' : 'dashboard'}
              </h1>
              {showRefreshing && <RefreshIndicator />}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {viewMode === 'data'
                ? 'Search and inspect the full issuance record.'
                : 'Volume, sector composition and execution-level detail in one view.'}
            </p>
          </div>

          <div
            className="inline-flex w-fit items-center rounded-lg bg-stone-100 p-0.5"
            aria-label="Date range"
          >
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                aria-pressed={range === item}
                className={`h-7 rounded-md px-2.5 text-[10px] font-medium transition-colors ${
                  range === item
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </header>

        {viewMode === 'dashboards' && (
          <section className="mt-8 grid gap-9 xl:grid-cols-12 xl:gap-12">
            <div
              className={`flex flex-col ${prefs.showSectorMix ? 'xl:col-span-8' : 'xl:col-span-12'}`}
              aria-busy={isFirstLoad || isRefreshing}
            >
              <SectionHeading label="Issuance volume">
                {isFirstLoad ? (
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-2.5 w-52" />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-2xl font-semibold tracking-[-0.035em] text-stone-950">
                      €{totalVolume.toFixed(1)}bn
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {aggregates?.dealCount ?? 0} deals · monthly gross supply, EUR equivalent
                    </span>
                  </div>
                )}
              </SectionHeading>

              {/* Fixed band height keeps the skeleton and the chart the same size. */}
              <div
                className={`mt-6 ${showRefreshing ? 'dash-stale' : ''}`}
                style={{ height: CHART_BAND }}
              >
                {isFirstLoad ? (
                  <BarChartSkeleton />
                ) : (
                  <ChartContainer config={volumeChartConfig} className="h-full w-full">
                    <BarChart
                      accessibilityLayer
                      data={monthlyData}
                      margin={{ top: 8, right: 4, bottom: 0, left: -8 }}
                    >
                      <CartesianGrid vertical={false} stroke="#F1F0EE" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        interval="preserveStartEnd"
                        minTickGap={12}
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
                            valueFormatter={(value) => `€${Number(value).toFixed(1)}bn`}
                          />
                        }
                      />
                      {/* TODO: add an accessible month control before making bars filter the grid. */}
                      <Bar
                        dataKey="volume"
                        name="volume"
                        fill="var(--color-volume)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                        animationDuration={450}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </div>
            </div>

            {prefs.showSectorMix && (
            <div className="flex flex-col xl:col-span-4" aria-busy={isFirstLoad || isRefreshing}>
              <SectionHeading label="Sector mix">
                <p className="text-[11px] leading-6 text-stone-500">
                  Click a segment or label to filter the table
                </p>
              </SectionHeading>

              <div
                className={`mt-6 ${showRefreshing ? 'dash-stale' : ''}`}
                style={{ height: CHART_BAND }}
              >
                {isFirstLoad ? (
                  <DonutChartSkeleton />
                ) : (
                  <div className="grid h-full content-center gap-4 sm:grid-cols-[minmax(180px,0.8fr)_1fr] xl:grid-cols-1">
                    <div className="relative mx-auto h-[184px] w-full max-w-[230px]">
                      <ChartContainer config={sectorChartConfig} className="h-full w-full">
                        <PieChart accessibilityLayer>
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                hideLabel
                                nameKey="sector"
                                valueFormatter={(value) => `€${Number(value).toFixed(1)}bn`}
                              />
                            }
                          />
                          <Pie
                            data={sectorData}
                            dataKey="volume"
                            nameKey="sector"
                            innerRadius={62}
                            outerRadius={82}
                            paddingAngle={2}
                            strokeWidth={0}
                            animationDuration={450}
                          >
                            {sectorData.map((item) => (
                              <Cell
                                key={item.sector}
                                fill={item.fill}
                                opacity={
                                  sectors.length === 0 || isSectorActive(item.sector) ? 1 : 0.2
                                }
                                className="cursor-pointer transition-opacity"
                                onClick={() => toggleSectorGroup(item.sector)}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-semibold tracking-[-0.04em] text-stone-950">
                          {selectedShare === null
                            ? (aggregates?.dealCount ?? 0)
                            : `${selectedShare.toFixed(0)}%`}
                        </span>
                        <span className="mt-0.5 text-[10px] text-stone-400">
                          {selectedShare === null ? 'deals' : 'of volume'}
                        </span>
                      </div>
                    </div>

                    <div className="grid content-center gap-0.5">
                      {sectorData.map((item) => {
                        const percentage = totalVolume > 0 ? (item.volume / totalVolume) * 100 : 0;
                        const selectedSector = isSectorActive(item.sector);
                        return (
                          <button
                            key={item.sector}
                            type="button"
                            onClick={() => toggleSectorGroup(item.sector)}
                            aria-pressed={selectedSector}
                            className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                              sectors.length === 0 || selectedSector ? '' : 'opacity-40'
                            }`}
                          >
                            <span
                              className="h-2 w-2 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: item.fill }}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate text-[11px] text-stone-600">
                              {item.sector}
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
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[200px] flex-1 sm:max-w-[300px]">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
                aria-hidden
              />
              <span className="sr-only">Search issuance</span>
              <Input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search issuer, sector or rating"
                className="h-8 border-stone-200 bg-white pl-8 text-xs"
              />
            </label>

            <MultiFilter
              label="Currency"
              values={ISSUANCE_CURRENCIES}
              selected={currencies}
              onToggle={(value) => toggle(value, currencies, setCurrencies)}
            />
            <MultiFilter
              label="Sector"
              values={ISSUANCE_SECTORS}
              selected={sectors}
              onToggle={(value) => toggle(value, sectors, setSectors)}
            />
            <MultiFilter
              label="Rating"
              values={ISSUANCE_RATINGS}
              selected={ratings}
              onToggle={(value) => toggle(value, ratings, setRatings)}
            />

            {search && (
              <FilterBadge
                label={`“${search}”`}
                onRemove={() => {
                  setSearchDraft('');
                  setSearch('');
                }}
              />
            )}
            {[
              ...currencies.map((value) => ({ value, list: currencies, set: setCurrencies })),
              ...sectors.map((value) => ({ value, list: sectors, set: setSectors })),
              ...ratings.map((value) => ({ value, list: ratings, set: setRatings })),
            ].map(({ value, list, set }) => (
              <FilterBadge key={value} label={value} onRemove={() => toggle(value, list, set)} />
            ))}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-stone-500 hover:text-stone-900"
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}

            <div className="ml-auto flex items-center gap-3 text-[11px] text-stone-400">
              {showGridRefreshing && <RefreshIndicator label="Loading" />}
              {totalRows === null ? (
                <Skeleton className="h-2.5 w-14" />
              ) : (
                <span className="tabular-nums">{totalRows.toLocaleString()} issues</span>
              )}
            </div>
          </div>

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
                {selected ? (
                  <IssuanceDetail record={selected} />
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

/** Small uppercase label over its content — replaces the old card header. */
function SectionHeading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
        {label}
      </p>
      {children}
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

function MultiFilter({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 bg-stone-100/70 text-[11px] text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        >
          <Filter className="h-3 w-3 text-stone-400" aria-hidden />
          {label}
          {selected.length > 0 && (
            <span className="ml-0.5 rounded-full bg-stone-900 px-1.5 py-0.5 text-[9px] text-white">
              {selected.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {values.map((value) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={selected.includes(value)}
            onCheckedChange={() => onToggle(value)}
            onSelect={(event) => event.preventDefault()}
          >
            {value}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge className="gap-1 border-transparent bg-stone-100/70 text-stone-600">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="-mr-0.5 rounded-full p-0.5 text-stone-400 transition-colors hover:text-stone-800"
      >
        <X className="h-2.5 w-2.5" aria-hidden />
      </button>
    </Badge>
  );
}

function DatasetPlaceholder({
  dataset,
  onReturn,
}: {
  dataset: Exclude<DatasetId, 'issuance'> | DatasetId;
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
