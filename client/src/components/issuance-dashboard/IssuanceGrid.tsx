import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  CellStyleModule,
  InfiniteRowModelModule,
  ModuleRegistry,
  RowSelectionModule,
  RowStyleModule,
  ScrollApiModule,
  ValidationModule,
  themeQuartz,
  type ColDef,
  type GridApi,
  type IDatasource,
} from 'ag-grid-community';
import { AgGridReact, type CustomCellRendererProps } from 'ag-grid-react';
import {
  fetchIssuanceRows,
  type IssuanceGridRow,
  type IssuanceQuery,
  type IssuanceRowSort,
} from './issuanceApi';
import type { IssuanceStatus } from './issuanceData';

/**
 * Only the features this grid uses. `AllCommunityModule` would pull in the
 * client-side row model, every filter and the editing stack — roughly four
 * times the code, none of it reachable from here. The validation module is
 * dev-only: it names any module a feature is missing, and ships nothing to
 * production.
 */
ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  RowSelectionModule,
  CellStyleModule,
  /** Deal banding classes arrive via rowClassRules. */
  RowStyleModule,
  ScrollApiModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
]);

/** One network round trip per block; small enough that scrolling stays responsive. */
const BLOCK_SIZE = 25;

/** Built once: a formatter per cell would allocate on every scroll. */
const PRICED_DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

/**
 * The grid sits directly on the white page canvas: no wrapper, no column rules,
 * and hairline row dividers. Background matches the canvas so pinned columns
 * stay opaque without reading as a separate surface.
 */
const THEME_PARAMS = {
  accentColor: '#2563eb',
  backgroundColor: '#ffffff',
  borderColor: '#F0EFEE',
  browserColorScheme: 'light',
  columnBorder: false,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 12,
  foregroundColor: '#44403c',
  headerBackgroundColor: '#ffffff',
  headerColumnBorder: false,
  headerFontSize: 10,
  headerFontWeight: 600,
  headerRowBorder: { style: 'solid', width: 1, color: '#E7E5E4' },
  headerTextColor: '#a8a29e',
  rowBorder: { style: 'solid', width: 1, color: '#F1F1F0' },
  rowHoverColor: '#F8F8F7',
  selectedRowBackgroundColor: '#EEF4FF',
  wrapperBorder: false,
  wrapperBorderRadius: 0,
} as const;

const DENSITY = {
  comfortable: {
    theme: themeQuartz.withParams({ ...THEME_PARAMS, spacing: 6 }),
    rowHeight: 42,
    headerHeight: 38,
  },
  compact: {
    theme: themeQuartz.withParams({ ...THEME_PARAMS, spacing: 4 }),
    rowHeight: 32,
    headerHeight: 32,
  },
};

/** A dot carries the status so the column doesn't stack a pill on every row. */
const STATUS_STYLES: Record<IssuanceStatus, { dot: string; text: string }> = {
  Live: { dot: 'bg-emerald-500', text: 'text-stone-800' },
  Monitoring: { dot: 'bg-amber-500', text: 'text-stone-800' },
  Priced: { dot: 'bg-stone-300', text: 'text-stone-500' },
};

function StatusCell({ value }: CustomCellRendererProps<IssuanceGridRow, IssuanceStatus>) {
  if (!value) return null;
  const style = STATUS_STYLES[value];
  return (
    <span className={`flex h-full items-center gap-2 ${style.text}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      {value}
    </span>
  );
}

/**
 * Issuer names the whole deal. The count is the only extra visual signal:
 * follow-on rows simply omit repeated deal-level fields and their divider.
 */
function IssuerCell({ value, data }: CustomCellRendererProps<IssuanceGridRow, string>) {
  if (!value) return null;
  const groupSize = data?.groupSize ?? 1;
  return (
    <span className="flex h-full min-w-0 items-center gap-2">
      <span className="truncate">{value}</span>
      {groupSize > 1 && (
        <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.07em] text-stone-400 tabular-nums">
          {groupSize} tranches
        </span>
      )}
    </span>
  );
}

/**
 * Rendered in every cell of a block that has not arrived yet. Widths vary by
 * column so a loading region still looks like a table rather than a grey slab.
 */
function LoadingCell({ column }: CustomCellRendererProps<IssuanceGridRow>) {
  const colId = column?.getColId() ?? '';
  const width = LOADING_CELL_WIDTHS[colId] ?? '60%';
  return (
    <span className="flex h-full items-center" aria-hidden>
      <span className="sk-shimmer block h-2 rounded-full" style={{ width }} />
    </span>
  );
}

/**
 * The infinite row model renders empty cells for rows it has not fetched, so the
 * skeleton is injected per cell. Returning undefined leaves loaded rows on the
 * column's own renderer.
 */
const loadingAwareRenderer = ({ data }: { data?: IssuanceGridRow }) =>
  data ? undefined : { component: LoadingCell };

const BlankCell = () => null;

/**
 * Deal-scoped columns render once per deal: repeated values on follow-on
 * tranche rows blank out, emulating a merged cell. Unloaded rows (data
 * undefined) still get the skeleton — banding only applies to loaded data.
 */
const dealScopedRenderer = ({ data }: { data?: IssuanceGridRow }) => {
  if (!data) return { component: LoadingCell };
  return data.groupHead ? undefined : { component: BlankCell };
};

const LOADING_CELL_WIDTHS: Record<string, string> = {
  status: '52px',
  pricingDate: '48px',
  issuer: '78%',
  ticker: '44px',
  region: '72%',
  currency: '28px',
  size: '72px',
  tenor: '30px',
  rating: '64px',
  sector: '70%',
  spread: '40px',
  nip: '30px',
  book: '58px',
  cover: '32px',
};

const COLUMNS: ColDef<IssuanceGridRow>[] = [
  {
    field: 'status',
    headerName: 'STATUS',
    width: 104,
    pinned: 'left',
    sortable: false,
    cellRenderer: StatusCell,
    cellRendererSelector: dealScopedRenderer,
  },
  {
    field: 'pricingDate',
    headerName: 'PRICED',
    width: 104,
    sort: 'desc',
    cellRendererSelector: dealScopedRenderer,
    valueFormatter: ({ value }) => (value ? PRICED_DATE.format(new Date(String(value))) : ''),
  },
  {
    field: 'issuer',
    headerName: 'ISSUER',
    minWidth: 170,
    flex: 1.2,
    pinned: 'left',
    cellClass: 'font-medium text-stone-950',
    cellRenderer: IssuerCell,
    cellRendererSelector: dealScopedRenderer,
  },
  {
    field: 'ticker',
    headerName: 'TICKER',
    width: 92,
    cellClass: 'text-stone-500',
    cellRendererSelector: dealScopedRenderer,
  },
  {
    field: 'region',
    headerName: 'REGION',
    minWidth: 130,
    flex: 0.7,
    cellRendererSelector: dealScopedRenderer,
  },
  { field: 'currency', headerName: 'CCY', width: 72 },
  {
    field: 'size',
    headerName: 'SIZE',
    width: 112,
    type: 'numericColumn',
    valueFormatter: ({ data }) => (data ? `${data.currency} ${data.size.toLocaleString()}m` : ''),
  },
  { field: 'tenor', headerName: 'TENOR', width: 82 },
  {
    field: 'rating',
    headerName: 'RATING',
    width: 106,
    cellRendererSelector: dealScopedRenderer,
  },
  {
    field: 'sector',
    headerName: 'SECTOR',
    minWidth: 125,
    flex: 0.8,
    cellRendererSelector: dealScopedRenderer,
  },
  {
    field: 'spread',
    headerName: 'SPREAD',
    width: 92,
    type: 'numericColumn',
    valueFormatter: ({ value }) => (value == null ? '' : `${value}bp`),
  },
  {
    field: 'nip',
    headerName: 'NIP',
    width: 76,
    type: 'numericColumn',
    cellClass: 'font-medium text-stone-950',
    valueFormatter: ({ value }) => (value == null ? '' : `${value}bp`),
  },
  {
    field: 'book',
    headerName: 'BOOK',
    width: 100,
    type: 'numericColumn',
    valueFormatter: ({ data }) =>
      data ? `${data.currency} ${(data.book / 1000).toFixed(1)}bn` : '',
  },
  {
    field: 'cover',
    headerName: 'COVER',
    width: 84,
    type: 'numericColumn',
    valueFormatter: ({ value }) => (value == null ? '' : `${value}x`),
  },
];

const DEFAULT_COL_DEF: ColDef<IssuanceGridRow> = {
  sortable: true,
  filter: false,
  resizable: true,
  suppressHeaderMenuButton: true,
  cellRendererSelector: loadingAwareRenderer,
};

const ROW_SELECTION = {
  mode: 'singleRow',
  enableClickSelection: true,
  checkboxes: false,
} as const;

/**
 * Memoised: selecting a row or paging the table re-renders the surrounding
 * page, and re-rendering the grid for that would be pure waste. Callers must
 * pass a memoised query and stable callbacks.
 */
export const IssuanceGrid = memo(function IssuanceGrid({
  query,
  density = 'comfortable',
  onSelect,
  onDefaultRow,
  onTotalRowsChange,
  onLoadingChange,
}: {
  query: IssuanceQuery;
  density?: keyof typeof DENSITY;
  onSelect: (record: IssuanceGridRow) => void;
  /** First row of the first block, used before the user picks anything. */
  onDefaultRow: (record: IssuanceGridRow | null) => void;
  onTotalRowsChange: (total: number | null) => void;
  onLoadingChange: (loading: boolean) => void;
}) {
  const apiRef = useRef<GridApi<IssuanceGridRow> | null>(null);
  const sortRef = useRef<IssuanceRowSort | null>({ colId: 'pricingDate', direction: 'desc' });
  const pendingBlocks = useRef(0);
  /** A click tints the whole deal, not just the clicked tranche row. */
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  /**
   * Rebuilding the datasource purges every cached block, so it may only depend
   * on the query. Reporting callbacks are read through a ref instead.
   */
  const report = useRef({ onDefaultRow, onTotalRowsChange, onLoadingChange });
  report.current = { onDefaultRow, onTotalRowsChange, onLoadingChange };

  /**
   * A new datasource per query purges the block cache, so changing a filter
   * restarts paging from the top instead of mixing old and new rows.
   */
  const datasource = useMemo<IDatasource>(
    () => ({
      rowCount: undefined,
      getRows: (params) => {
        const [sortItem] = params.sortModel;
        sortRef.current = sortItem
          ? { colId: sortItem.colId, direction: sortItem.sort as 'asc' | 'desc' }
          : null;

        pendingBlocks.current += 1;
        report.current.onLoadingChange(true);

        fetchIssuanceRows(query, params.startRow, params.endRow, sortRef.current)
          .then(({ rows, totalRows }) => {
            params.successCallback(rows, totalRows);
            report.current.onTotalRowsChange(totalRows);
            if (params.startRow === 0) {
              report.current.onDefaultRow(rows[0] ?? null);
            }
          })
          .catch(() => params.failCallback())
          .finally(() => {
            pendingBlocks.current = Math.max(0, pendingBlocks.current - 1);
            if (pendingBlocks.current === 0) report.current.onLoadingChange(false);
          });
      },
    }),
    [query],
  );

  // Scroll back to the top whenever the result set changes underneath the user.
  // The row choice is invalidated upstream at the same time, so the tint goes too.
  useEffect(() => {
    setSelectedDealId(null);
    apiRef.current?.ensureIndexVisible(0, 'top');
  }, [query]);

  /**
   * A fresh rules object per selection: AG Grid re-applies row classes when the
   * rowClassRules option changes identity, which re-tints live rows in place.
   * (redrawRows is not available with this module set, and a ref would leave
   * already-rendered rows stale.)
   */
  const rowClassRules = useMemo(
    () => ({
      /** Any row of a multi-tranche deal; single-tranche deals stay untouched. */
      'deal-band': ({ data }: { data?: IssuanceGridRow }) => (data?.groupSize ?? 1) > 1,
      /** Last visible tranche, which closes the band on the deal boundary. */
      'deal-band-end': ({ data }: { data?: IssuanceGridRow }) =>
        data != null && data.groupSize > 1 && data.groupIndex === data.groupSize - 1,
      'deal-selected': ({ data }: { data?: IssuanceGridRow }) =>
        data != null && data.dealId === selectedDealId,
    }),
    [selectedDealId],
  );

  const sizing = DENSITY[density];

  return (
    <div className="issuance-grid h-[560px] w-full">
      <AgGridReact<IssuanceGridRow>
        theme={sizing.theme}
        columnDefs={COLUMNS}
        rowModelType="infinite"
        datasource={datasource}
        cacheBlockSize={BLOCK_SIZE}
        /** Keeps memory bounded on long scrolls; older blocks refetch on return. */
        maxBlocksInCache={12}
        /** Enough phantom rows that the scrollbar invites scrolling immediately. */
        infiniteInitialRowCount={BLOCK_SIZE}
        /** Skips blocks the user has already scrolled past. */
        blockLoadDebounceMillis={90}
        rowBuffer={4}
        defaultColDef={DEFAULT_COL_DEF}
        rowHeight={sizing.rowHeight}
        headerHeight={sizing.headerHeight}
        rowSelection={ROW_SELECTION}
        rowClassRules={rowClassRules}
        onGridReady={({ api }) => {
          apiRef.current = api;
        }}
        onRowClicked={({ data }) => {
          if (!data) return;
          onSelect(data);
          setSelectedDealId(data.dealId);
        }}
        overlayNoRowsTemplate="<span class='text-xs text-stone-500'>No issuance matches these filters.</span>"
      />
    </div>
  );
});
