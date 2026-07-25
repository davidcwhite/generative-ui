import { useEffect, useMemo, useRef } from 'react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type IDatasource,
} from 'ag-grid-community';
import { AgGridReact, type CustomCellRendererProps } from 'ag-grid-react';
import { fetchIssuanceRows, type IssuanceQuery, type IssuanceRowSort } from './issuanceApi';
import type { IssuanceRecord, IssuanceStatus } from './shadcnIssuanceData';

ModuleRegistry.registerModules([AllCommunityModule]);

/** One network round trip per block; small enough that scrolling stays responsive. */
const BLOCK_SIZE = 25;

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

function StatusCell({ value }: CustomCellRendererProps<IssuanceRecord, IssuanceStatus>) {
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
 * Rendered in every cell of a block that has not arrived yet. Widths vary by
 * column so a loading region still looks like a table rather than a grey slab.
 */
function LoadingCell({ column }: CustomCellRendererProps<IssuanceRecord>) {
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
const loadingAwareRenderer = ({ data }: { data?: IssuanceRecord }) =>
  data ? undefined : { component: LoadingCell };

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

export function IssuanceGrid({
  query,
  density = 'comfortable',
  onSelect,
  onDefaultRow,
  onTotalRowsChange,
  onLoadingChange,
}: {
  query: IssuanceQuery;
  density?: keyof typeof DENSITY;
  onSelect: (record: IssuanceRecord) => void;
  /** First row of the first block, used before the user picks anything. */
  onDefaultRow: (record: IssuanceRecord | null) => void;
  onTotalRowsChange: (total: number | null) => void;
  onLoadingChange: (loading: boolean) => void;
}) {
  const apiRef = useRef<GridApi<IssuanceRecord> | null>(null);
  const sortRef = useRef<IssuanceRowSort | null>({ colId: 'pricingDate', direction: 'desc' });
  const pendingBlocks = useRef(0);
  const queryKey = JSON.stringify(query);

  const columns = useMemo<ColDef<IssuanceRecord>[]>(
    () => [
      {
        field: 'status',
        headerName: 'STATUS',
        width: 104,
        pinned: 'left',
        sortable: false,
        cellRenderer: StatusCell,
      },
      {
        field: 'pricingDate',
        headerName: 'PRICED',
        width: 104,
        sort: 'desc',
        valueFormatter: ({ value }) =>
          value
            ? new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
              }).format(new Date(String(value)))
            : '',
      },
      {
        field: 'issuer',
        headerName: 'ISSUER',
        minWidth: 170,
        flex: 1.2,
        pinned: 'left',
        cellClass: 'font-medium text-stone-950',
      },
      { field: 'ticker', headerName: 'TICKER', width: 92, cellClass: 'text-stone-500' },
      { field: 'region', headerName: 'REGION', minWidth: 130, flex: 0.7 },
      { field: 'currency', headerName: 'CCY', width: 72 },
      {
        field: 'size',
        headerName: 'SIZE',
        width: 112,
        type: 'numericColumn',
        valueFormatter: ({ data }) =>
          data ? `${data.currency} ${data.size.toLocaleString()}m` : '',
      },
      { field: 'tenor', headerName: 'TENOR', width: 82 },
      { field: 'rating', headerName: 'RATING', width: 106 },
      { field: 'sector', headerName: 'SECTOR', minWidth: 125, flex: 0.8 },
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
    ],
    [],
  );

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
        onLoadingChange(true);

        fetchIssuanceRows(query, params.startRow, params.endRow, sortRef.current)
          .then(({ rows, totalRows }) => {
            params.successCallback(rows, totalRows);
            onTotalRowsChange(totalRows);
            if (params.startRow === 0) {
              onDefaultRow(rows[0] ?? null);
            }
          })
          .catch(() => params.failCallback())
          .finally(() => {
            pendingBlocks.current = Math.max(0, pendingBlocks.current - 1);
            if (pendingBlocks.current === 0) onLoadingChange(false);
          });
      },
    }),
    // Rebuilt only when the serialised query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey],
  );

  // Scroll back to the top whenever the result set changes underneath the user.
  useEffect(() => {
    apiRef.current?.ensureIndexVisible(0, 'top');
  }, [queryKey]);

  const sizing = DENSITY[density];

  return (
    <div className="issuance-grid h-[560px] w-full">
      <AgGridReact<IssuanceRecord>
        theme={sizing.theme}
        columnDefs={columns}
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
        defaultColDef={{
          sortable: true,
          filter: false,
          resizable: true,
          suppressHeaderMenuButton: true,
          cellRendererSelector: loadingAwareRenderer,
        }}
        rowHeight={sizing.rowHeight}
        headerHeight={sizing.headerHeight}
        rowSelection={{
          mode: 'singleRow',
          enableClickSelection: true,
          checkboxes: false,
        }}
        onGridReady={({ api }) => {
          apiRef.current = api;
        }}
        onRowClicked={({ data }) => {
          if (data) onSelect(data);
        }}
        overlayNoRowsTemplate="<span class='text-xs text-stone-500'>No issuance matches these filters.</span>"
      />
    </div>
  );
}
