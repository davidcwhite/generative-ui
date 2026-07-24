import { useMemo, useRef, useState } from 'react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
} from 'ag-grid-community';
import { AgGridReact, type CustomCellRendererProps } from 'ag-grid-react';
import {
  Download,
  Filter,
  Search,
} from 'lucide-react';
import type { DealRow } from './data';
import {
  DashboardError,
  DashboardLoading,
  MetricStrip,
  StatusPill,
} from './shared';
import { useDashboardData } from './useDashboardData';

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  accentColor: '#57534e',
  backgroundColor: '#ffffff',
  borderColor: '#e7e5e4',
  browserColorScheme: 'light',
  columnBorder: false,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 12,
  foregroundColor: '#44403c',
  headerBackgroundColor: '#fafaf9',
  headerFontSize: 10,
  headerFontWeight: 600,
  headerTextColor: '#78716c',
  rowBorder: true,
  rowHoverColor: '#fafaf9',
  selectedRowBackgroundColor: '#f5f5f4',
  spacing: 6,
  wrapperBorderRadius: 10,
});

type StatusFilter = 'All' | DealRow['status'];

function StatusRenderer({ value }: CustomCellRendererProps<DealRow, DealRow['status']>) {
  return value ? <StatusPill status={value} /> : null;
}

export default function DataWorkbench() {
  const { data, isPending, error } = useDashboardData();
  const gridRef = useRef<AgGridReact<DealRow>>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [selected, setSelected] = useState<DealRow | null>(null);

  const columnDefs = useMemo<ColDef<DealRow>[]>(
    () => [
      {
        field: 'status',
        headerName: 'STATUS',
        width: 105,
        pinned: 'left',
        cellRenderer: StatusRenderer,
      },
      {
        field: 'issuer',
        headerName: 'ISSUER',
        minWidth: 170,
        flex: 1.1,
        pinned: 'left',
        cellClass: 'font-medium text-stone-900',
      },
      { field: 'rating', headerName: 'RATING', width: 100 },
      { field: 'sector', headerName: 'SECTOR', minWidth: 130, flex: 0.8 },
      { field: 'currency', headerName: 'CCY', width: 78 },
      {
        field: 'size',
        headerName: 'SIZE',
        width: 105,
        type: 'numericColumn',
        valueFormatter: ({ data: row }) =>
          row ? `${row.currency} ${row.size.toLocaleString()}m` : '',
      },
      { field: 'tenor', headerName: 'TENOR', width: 90 },
      {
        field: 'guidance',
        headerName: 'GUIDANCE',
        minWidth: 145,
        flex: 0.9,
      },
      {
        field: 'spread',
        headerName: 'SPREAD',
        width: 95,
        type: 'numericColumn',
        valueFormatter: ({ value }) => `${value}bp`,
      },
      {
        field: 'nip',
        headerName: 'NIP',
        width: 80,
        type: 'numericColumn',
        cellClass: 'font-medium text-stone-900',
        valueFormatter: ({ value }) => `${value}bp`,
      },
      {
        field: 'book',
        headerName: 'BOOK',
        width: 105,
        type: 'numericColumn',
        valueFormatter: ({ value }) =>
          value ? `€${(Number(value) / 1000).toFixed(1)}bn` : '—',
      },
      {
        field: 'oversubscription',
        headerName: 'COVER',
        width: 88,
        type: 'numericColumn',
        valueFormatter: ({ value }) => (value ? `${value}x` : '—'),
      },
      { field: 'leads', headerName: 'LEADS', minWidth: 180, flex: 1 },
      {
        field: 'pricingDate',
        headerName: 'PRICING',
        width: 110,
        sort: 'desc',
        valueFormatter: ({ value }) =>
          new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
          }).format(new Date(String(value))),
      },
    ],
    [],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return data.deals.filter((deal) => {
      const matchesStatus = status === 'All' || deal.status === status;
      const matchesQuery =
        !query ||
        `${deal.issuer} ${deal.sector} ${deal.rating} ${deal.currency}`
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [data, search, status]);

  if (isPending) return <DashboardLoading />;
  if (error || !data) {
    return <DashboardError message={error?.message ?? 'No workbench data returned.'} />;
  }

  const activeDeal = selected ?? rows[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 lg:px-6">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Deal intelligence
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-stone-950">
            Primary market workbench
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Scan, filter and inspect execution data without leaving the dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Live market snapshot · {data.asOf}
        </div>
      </div>

      <MetricStrip metrics={data.metrics} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 rounded-xl border border-stone-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-stone-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <label className="relative min-w-[210px] flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
                  aria-hidden
                />
                <span className="sr-only">Search deals</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search issuer, sector or rating"
                  className="h-8 w-full rounded-lg border border-stone-200 bg-white pl-8 pr-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
                />
              </label>
              <div className="inline-flex items-center gap-1 rounded-lg bg-stone-100 p-0.5">
                {(['All', 'Live', 'Priced', 'Monitoring'] as StatusFilter[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStatus(item)}
                    aria-pressed={status === item}
                    className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                      status === item
                        ? 'bg-white text-stone-900 ring-1 ring-stone-200'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: 'primary-market.csv' })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Export
              </button>
            </div>
          </div>

          <div className="h-[570px] w-full">
            <AgGridReact<DealRow>
              ref={gridRef}
              theme={gridTheme}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                suppressHeaderMenuButton: false,
              }}
              getRowId={({ data: row }) => row.id}
              rowHeight={42}
              headerHeight={38}
              rowSelection={{
                mode: 'singleRow',
                enableClickSelection: true,
                checkboxes: false,
              }}
              onRowClicked={({ data: row }) => setSelected(row ?? null)}
              animateRows
              pagination
              paginationPageSize={12}
              paginationPageSizeSelector={[12, 25, 50]}
              overlayNoRowsTemplate="<span class='text-xs text-stone-500'>No deals match these filters.</span>"
            />
          </div>
        </section>

        <aside className="rounded-xl border border-stone-200 bg-white xl:sticky xl:top-[84px] xl:self-start">
          <div className="border-b border-stone-200 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Selected deal
                </p>
                <h2 className="mt-1 text-sm font-semibold text-stone-950">
                  {activeDeal?.issuer ?? 'No selection'}
                </h2>
              </div>
              {activeDeal && <StatusPill status={activeDeal.status} />}
            </div>
          </div>

          {activeDeal && (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4 text-xs">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-stone-400">Rating</dt>
                  <dd className="mt-1 font-medium text-stone-800">{activeDeal.rating}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-stone-400">Structure</dt>
                  <dd className="mt-1 font-medium text-stone-800">
                    {activeDeal.currency} {activeDeal.tenor}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-stone-400">Size</dt>
                  <dd className="mt-1 font-medium tabular-nums text-stone-800">
                    {activeDeal.currency} {activeDeal.size.toLocaleString()}m
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-stone-400">Guidance</dt>
                  <dd className="mt-1 font-medium text-stone-800">{activeDeal.guidance}</dd>
                </div>
              </dl>

              <div className="border-y border-stone-100 bg-stone-50/60 px-4 py-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold tracking-[-0.03em] text-stone-950">
                      {activeDeal.spread}
                    </p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-stone-400">
                      Spread bp
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-[-0.03em] text-stone-950">
                      {activeDeal.nip}
                    </p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-stone-400">
                      NIP bp
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-[-0.03em] text-stone-950">
                      {activeDeal.oversubscription || '—'}
                    </p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-stone-400">
                      Book cover
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                  <Filter className="h-3 w-3" aria-hidden />
                  Execution read
                </div>
                <p className="text-xs leading-5 text-stone-600">
                  {activeDeal.nip <= 5
                    ? 'Strong execution. The book supports pricing at or through the tight end of guidance with limited concession.'
                    : activeDeal.nip <= 8
                      ? 'Balanced execution. Demand is sufficient, but the issuer should preserve a modest concession to protect the book.'
                      : 'Execution remains price-sensitive. Keep flexibility on size and avoid tightening aggressively before final updates.'}
                </p>
                <p className="mt-3 text-[10px] text-stone-400">
                  Leads · {activeDeal.leads}
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
