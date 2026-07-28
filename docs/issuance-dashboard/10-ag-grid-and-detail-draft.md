# AG Grid and issuance detail — Draft

Production-quality draft documentation for the complete table region: the filter
bar hand-off, AG Grid Community configuration, infinite row model, server-side
sorting, loading rows, selection, and the selected-issuance card. Code snippets
are taken from the implementation unless explicitly marked as a recommendation.

The filename and title carry `draft` deliberately. The implementation is
reproducible as written, but the [review findings](#review-findings-not-fixed)
should be resolved before treating it as a final production reference.

- [What this covers](#what-this-covers)
- [Stack and dependencies](#stack-and-dependencies)
- [File map](#file-map)
- [Anatomy and layout](#anatomy-and-layout)
- [Record and service contracts](#record-and-service-contracts)
- [Register only the AG Grid modules in use](#register-only-the-ag-grid-modules-in-use)
- [Theme and density](#theme-and-density)
- [Column definitions](#column-definitions)
- [Cell renderers and formatters](#cell-renderers-and-formatters)
- [Infinite row model](#infinite-row-model)
- [Sorting](#sorting)
- [Selection and the detail card](#selection-and-the-detail-card)
- [Loading and empty states](#loading-and-empty-states)
- [Query changes and state ownership](#query-changes-and-state-ownership)
- [Responsive and optional layouts](#responsive-and-optional-layouts)
- [Accessibility](#accessibility)
- [Performance contract](#performance-contract)
- [Review findings not fixed](#review-findings-not-fixed)
- [Gotchas and anti-patterns](#gotchas-and-anti-patterns)
- [Porting sequence](#porting-sequence)
- [Parity checklist](#parity-checklist)

---

## What this covers

The table is not just an `AgGridReact` element. It is a coordinated region with
five responsibilities:

1. The filter bar reports loading state and the total matching row count.
2. AG Grid fetches sorted pages as the user scrolls.
3. Unfetched rows render per-cell shimmer placeholders.
4. A single row selection drives a separate issuance detail card.
5. Query, grid and card state are colocated below the charts so table activity
   does not repaint the dashboard above it.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Search issuer…   + Filter   Sector Financials ×         Loading   842 issues │
├──────────────────────────────────────────────────────┬───────────────────────┤
│ STATUS │ ISSUER      │ PRICED │ TICKER │ … │ COVER  │ Orange SA       Live │
│ ● Live │ Orange SA   │ 23 Jul │ ORA    │ … │ 3.3x   │ Telecoms · BBB+ /…   │
│ ○      │ ASML Holding│ 09 Jul │ ASML   │ … │ 2.8x   │                       │
│ ○      │ Woodside    │ 08 Jul │ WDS    │ … │ 3.9x   │ STRUCTURE   SIZE     │
│ …                                                    │ EUR 10Y     EUR 500m │
│                                                      │ COUPON      PRICING  │
│ 560px high · infinite pages · pinned identity cols   │ 2.625%      23 Jul   │
│                                                      │                       │
│                                                      │ 143     6      3.3x  │
│                                                      │ Spread  NIP    Cover │
│                                                      │                       │
│                                                      │ Leads · Execution    │
└──────────────────────────────────────────────────────┴───────────────────────┘
              minmax(0, 1fr)            gap 28px             282px
```

Only the detail card is a bordered surface. The grid has no wrapper border,
rounded frame or vertical column rules, so it reads as part of the white page
rather than an embedded application.

---

## Stack and dependencies

The implementation targets:

```json
{
  "ag-grid-community": "^36.0.0",
  "ag-grid-react": "^36.0.0",
  "react": "^18.3.0",
  "tailwindcss": "^4.1.18"
}
```

Install the grid packages:

```bash
npm install ag-grid-community ag-grid-react
```

No legacy AG Grid stylesheet is imported. Version 36's Theming API injects the
grid styles from `themeQuartz.withParams`. Importing `ag-grid.css` or
`ag-theme-quartz.css` as well creates two styling systems competing for the same
DOM.

The selected-record card also uses a shadcn-style `Badge` primitive. It is not
an AG Grid Enterprise detail panel, master/detail row or side bar. It is normal
React rendered next to the grid, so Community edition is sufficient.

---

## File map

| Responsibility                                 | File                    |
| ---------------------------------------------- | ----------------------- |
| Table-region state and layout                  | `IssuanceTable.tsx`     |
| AG Grid modules, theme, columns and datasource | `IssuanceGrid.tsx`      |
| Selected-record card                           | `IssuanceDetail.tsx`    |
| Card skeleton and refresh indicator            | `IssuanceSkeletons.tsx` |
| Query, paging and server-sort contract         | `issuanceApi.ts`        |
| `IssuanceRecord` data contract                 | `issuanceData.ts`       |
| Shimmer and resize-handle CSS                  | `index.css`             |
| Search, filter popover and chips               | `IssuanceFilterBar.tsx` |

Keep these boundaries when porting. The grid should not own filter controls, and
the page above the table should not own row selection or paging state.

---

## Anatomy and layout

The whole region begins after the charts with one hairline:

```tsx
<section className="mt-10 border-t border-stone-200/70 pt-5">
  <IssuanceFilterBar>{/* loading state and row count */}</IssuanceFilterBar>

  <div
    className={`mt-4 grid gap-7 ${
      !showDetailPanel
        ? ""
        : wide
          ? "xl:grid-cols-[minmax(0,1fr)_300px]"
          : "xl:grid-cols-[minmax(0,1fr)_282px]"
    }`}
  >
    <div className="min-w-0">
      <IssuanceGrid />
    </div>
    {showDetailPanel && <div>{/* detail state */}</div>}
  </div>
</section>
```

Exact geometry:

| Element                    | Value                 |
| -------------------------- | --------------------- |
| Space above the section    | `mt-10` — 40px        |
| Section rule               | `border-stone-200/70` |
| Space below the rule       | `pt-5` — 20px         |
| Filter-to-grid space       | `mt-4` — 16px         |
| Grid/card gap              | `gap-7` — 28px        |
| Grid height                | `h-[560px]`           |
| Card width, dashboard view | 282px                 |
| Card width, data view      | 300px                 |
| Card sticky offset         | `top-[76px]`          |

`minmax(0,1fr)` and the grid wrapper's `min-w-0` are both load-bearing. A grid
contains columns wider than its viewport; without a zero minimum, CSS Grid uses
that intrinsic width, pushes the detail panel off-screen and overflows the page.

Below `xl`, no column template applies. The grid and card become ordinary block
rows, so the card moves beneath the grid. When the card is disabled, the template
is omitted and the grid fills the section.

---

## Record and service contracts

### Row record

```ts
export interface IssuanceRecord {
  id: string;
  pricingDate: string;
  monthKey: string;
  issuer: string;
  ticker: string;
  region: IssuanceRegion;
  sector: string;
  rating: string;
  currency: IssuanceCurrency;
  size: number;
  eurEquivalent: number;
  tenor: string;
  coupon: number;
  spread: number;
  nip: number;
  book: number;
  cover: number;
  leads: string;
  status: IssuanceStatus;
}
```

Units are part of the contract:

- `size` is issue-currency millions.
- `eurEquivalent` is EUR millions and is used by the charts, not the grid.
- `book` is issue-currency millions.
- `spread` and `nip` are basis points.
- `cover` is a ratio.
- `pricingDate` is zero-padded `YYYY-MM-DD`.

Do not infer units from the column formatter. The formatter is presentation; the
service contract must state the units independently.

### Shared query

```ts
export interface IssuanceQuery {
  from: string;
  to: string;
  granularity: Granularity;
  stackBy: Dimension | null;
  breakdownBy: Dimension;
  filters: FilterClause[];
  search: string;
}
```

The row endpoint receives this same query as the charts, then applies every
filter. Unlike the two charts, the table has no scope exclusion.

### Page and sort

```ts
export interface IssuanceRowSort {
  colId: string;
  direction: "asc" | "desc";
}

export interface IssuanceRowPage {
  rows: IssuanceRecord[];
  totalRows: number;
}

export function fetchIssuanceRows(
  query: IssuanceQuery,
  startRow: number,
  endRow: number,
  sort: IssuanceRowSort | null,
  signal?: AbortSignal,
): Promise<IssuanceRowPage>;
```

The implementation sorts the complete filtered result before taking the page:

```ts
const rows = scope(query);
const sorted = sort ? [...rows].sort(compareBy(sort)) : rows;
const page = {
  rows: sorted.slice(startRow, endRow),
  totalRows: sorted.length,
};
```

This ordering is non-negotiable. Slicing first and sorting later sorts only the
current 25 records and produces a globally incorrect table.

---

## Register only the AG Grid modules in use

AG Grid's module registry is global. Registering `AllCommunityModule` makes every
community feature available, but also includes filtering, editing, export and
the client-side row model even though none is reachable here.

```ts
import {
  CellStyleModule,
  InfiniteRowModelModule,
  ModuleRegistry,
  RowSelectionModule,
  ScrollApiModule,
  ValidationModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  RowSelectionModule,
  CellStyleModule,
  ScrollApiModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
]);
```

| Module                   | Why it is present                                   |
| ------------------------ | --------------------------------------------------- |
| `InfiniteRowModelModule` | Paged datasource and block cache                    |
| `RowSelectionModule`     | Single-row click selection                          |
| `CellStyleModule`        | `cellClass` values in column definitions            |
| `ScrollApiModule`        | `ensureIndexVisible(0, 'top')` after a query change |
| `ValidationModule`       | Development diagnostics for missing modules         |

`ValidationModule` is development-only. In production it adds no user-facing
feature; in development it converts a silent missing-module failure into a
specific console message.

Module slimming is application-wide, not component-local. If another eagerly
loaded grid registers larger modules, those modules still enter the shared
bundle. Route-level lazy loading is required if different grids need genuinely
different feature sets.

---

## Theme and density

### Quartz parameters

The complete theme:

```ts
const THEME_PARAMS = {
  accentColor: "#2563eb",
  backgroundColor: "#ffffff",
  borderColor: "#F0EFEE",
  browserColorScheme: "light",
  columnBorder: false,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 12,
  foregroundColor: "#44403c",
  headerBackgroundColor: "#ffffff",
  headerColumnBorder: false,
  headerFontSize: 10,
  headerFontWeight: 600,
  headerRowBorder: { style: "solid", width: 1, color: "#E7E5E4" },
  headerTextColor: "#a8a29e",
  rowBorder: { style: "solid", width: 1, color: "#F1F1F0" },
  rowHoverColor: "#F8F8F7",
  selectedRowBackgroundColor: "#EEF4FF",
  wrapperBorder: false,
  wrapperBorderRadius: 0,
} as const;
```

The visual result depends more on what is removed than what is added:

- no wrapper frame;
- no wrapper radius;
- no column borders;
- no header-column borders;
- white header and body matching the page;
- a stronger header baseline and quieter row dividers;
- an almost invisible warm-grey hover;
- one pale-blue selected-row fill.

The selected fill is intentionally the only chromatic surface in the grid.
Status colour stays confined to a 6px dot.

### Density

```ts
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
```

Density changes all three values together:

| Mode        | Theme spacing |  Row | Header |
| ----------- | ------------: | ---: | -----: |
| Comfortable |             6 | 42px |   38px |
| Compact     |             4 | 32px |   32px |

Both themes are created once at module scope. `themeQuartz.withParams` returns a
new object; calling it inside render gives AG Grid a fresh theme identity and can
rebuild styling work on unrelated React renders.

### Resize-handle CSS

The Theming API cannot express the desired hover-only resize handle:

```css
.issuance-grid .ag-header-cell-resize::after {
  background-color: transparent;
  transition: background-color 120ms ease;
}

.issuance-grid .ag-header-cell-resize:hover::after {
  background-color: #d6d3d1;
}
```

A permanently visible handle looks like a vertical column rule and defeats
`columnBorder: false`. The handle remains usable; only its resting paint is
transparent.

---

## Column definitions

The exact column order is:

1. Status
2. Priced
3. Issuer
4. Ticker
5. Region
6. CCY
7. Size
8. Tenor
9. Rating
10. Sector
11. Spread
12. NIP
13. Book
14. Cover

Status and Issuer are pinned left. Although Priced sits between them in the
definition array, pinned columns form their own left container, so the rendered
left identity block is Status then Issuer. The remaining columns start with
Priced.

```ts
const COLUMNS: ColDef<IssuanceRecord>[] = [
  {
    field: "status",
    headerName: "STATUS",
    width: 104,
    pinned: "left",
    sortable: false,
    cellRenderer: StatusCell,
  },
  {
    field: "pricingDate",
    headerName: "PRICED",
    width: 104,
    sort: "desc",
    valueFormatter: ({ value }) =>
      value ? PRICED_DATE.format(new Date(String(value))) : "",
  },
  {
    field: "issuer",
    headerName: "ISSUER",
    minWidth: 170,
    flex: 1.2,
    pinned: "left",
    cellClass: "font-medium text-stone-950",
  },
  {
    field: "ticker",
    headerName: "TICKER",
    width: 92,
    cellClass: "text-stone-500",
  },
  { field: "region", headerName: "REGION", minWidth: 130, flex: 0.7 },
  { field: "currency", headerName: "CCY", width: 72 },
  {
    field: "size",
    headerName: "SIZE",
    width: 112,
    type: "numericColumn",
    valueFormatter: ({ data }) =>
      data ? `${data.currency} ${data.size.toLocaleString()}m` : "",
  },
  { field: "tenor", headerName: "TENOR", width: 82 },
  { field: "rating", headerName: "RATING", width: 106 },
  { field: "sector", headerName: "SECTOR", minWidth: 125, flex: 0.8 },
  {
    field: "spread",
    headerName: "SPREAD",
    width: 92,
    type: "numericColumn",
    valueFormatter: ({ value }) => (value == null ? "" : `${value}bp`),
  },
  {
    field: "nip",
    headerName: "NIP",
    width: 76,
    type: "numericColumn",
    cellClass: "font-medium text-stone-950",
    valueFormatter: ({ value }) => (value == null ? "" : `${value}bp`),
  },
  {
    field: "book",
    headerName: "BOOK",
    width: 100,
    type: "numericColumn",
    valueFormatter: ({ data }) =>
      data ? `${data.currency} ${(data.book / 1000).toFixed(1)}bn` : "",
  },
  {
    field: "cover",
    headerName: "COVER",
    width: 84,
    type: "numericColumn",
    valueFormatter: ({ value }) => (value == null ? "" : `${value}x`),
  },
];
```

### Sizing rules

- Identity and short-code columns use fixed `width`.
- Issuer, Region and Sector absorb spare width through `flex`.
- Issuer has the highest weight (`1.2`) because names need room.
- Region and Sector retain minimum widths, then share remaining width at `0.7`
  and `0.8`.
- Numeric columns use `type: 'numericColumn'` for right-aligned headers and
  values.

Every header is written uppercase in `headerName`. This is deliberate: AG Grid
measures the actual displayed string, whereas uppercasing only through CSS can
make width calculations disagree with the painted text.

### Default column behavior

```ts
const DEFAULT_COL_DEF: ColDef<IssuanceRecord> = {
  sortable: true,
  filter: false,
  resizable: true,
  suppressHeaderMenuButton: true,
  cellRendererSelector: loadingAwareRenderer,
};
```

Column filters and menus are disabled because the page already has one filter
system. Exposing AG Grid filters would create two independent query states and
make the chips, charts and table disagree.

Status overrides `sortable` to false. Alphabetical status sorting has no
meaningful desk workflow and adds a control that looks useful but is not.

---

## Cell renderers and formatters

### Status

```ts
const STATUS_STYLES = {
  Live: { dot: "bg-emerald-500", text: "text-stone-800" },
  Monitoring: { dot: "bg-amber-500", text: "text-stone-800" },
  Priced: { dot: "bg-stone-300", text: "text-stone-500" },
} as const;
```

```tsx
function StatusCell({
  value,
}: CustomCellRendererProps<IssuanceRecord, IssuanceStatus>) {
  if (!value) return null;
  const style = STATUS_STYLES[value];
  return (
    <span className={`flex h-full items-center gap-2 ${style.text}`}>
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
        aria-hidden
      />
      {value}
    </span>
  );
}
```

The text remains visible; the dot is supplementary and `aria-hidden`. Do not
replace this with colour alone. Pills are avoided because 15 visible badges form
a louder vertical stripe than the data beside them.

### Dates

```ts
const PRICED_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
});
```

Build the formatter once. Constructing `Intl.DateTimeFormat` per cell allocates
on every scroll and is expensive relative to calling `.format`.

The detail card deliberately uses a separate, longer formatter:

```ts
const PRICING_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
```

This produces `23 Jul 26` in the dense grid and `23 Jul 2026` in the card.
There is a timezone portability bug in both formatters; see
[Review findings](#2-date-only-values-shift-west-of-utc).

### Numeric values

Format raw numeric fields instead of storing formatted strings:

```ts
// Size
`${data.currency} ${data.size.toLocaleString()}m`
// Spread and NIP
`${value}bp`
// Book
`${data.currency} ${(data.book / 1000).toFixed(1)}bn`
// Cover
`${value}x`;
```

Keeping the field numeric is what lets the service sort `500`, `1000`, `2500`
numerically instead of lexicographically.

---

## Infinite row model

### Grid configuration

```tsx
<div className="issuance-grid h-[560px] w-full">
  <AgGridReact<IssuanceRecord>
    theme={sizing.theme}
    columnDefs={COLUMNS}
    rowModelType="infinite"
    datasource={datasource}
    cacheBlockSize={25}
    maxBlocksInCache={12}
    infiniteInitialRowCount={25}
    blockLoadDebounceMillis={90}
    rowBuffer={4}
    defaultColDef={DEFAULT_COL_DEF}
    rowHeight={sizing.rowHeight}
    headerHeight={sizing.headerHeight}
    rowSelection={ROW_SELECTION}
    onGridReady={({ api }) => {
      apiRef.current = api;
    }}
    onRowClicked={({ data }) => {
      if (data) onSelect(data);
    }}
    overlayNoRowsTemplate="<span class='text-xs text-stone-500'>No issuance matches these filters.</span>"
  />
</div>
```

### Cache settings

| Setting                   | Value | Effect                                                         |
| ------------------------- | ----: | -------------------------------------------------------------- |
| `cacheBlockSize`          |    25 | Requests rows `[0,25)`, `[25,50)`, and so on                   |
| `maxBlocksInCache`        |    12 | Bounds cached data to roughly 300 rows                         |
| `infiniteInitialRowCount` |    25 | Gives the first render enough phantom rows to invite scrolling |
| `blockLoadDebounceMillis` |  90ms | Avoids fetching intermediate blocks during a fast fling        |
| `rowBuffer`               |     4 | Renders four rows beyond the visible viewport                  |

In comfortable density, a 560px grid leaves approximately 505px for its body
after the 38px header and surrounding grid chrome. Roughly twelve 42px rows are
visible, so a 25-row block covers about two viewports.

### Datasource

```ts
const datasource = useMemo<IDatasource>(
  () => ({
    rowCount: undefined,
    getRows: (params) => {
      const [sortItem] = params.sortModel;
      sortRef.current = sortItem
        ? {
            colId: sortItem.colId,
            direction: sortItem.sort as "asc" | "desc",
          }
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
          if (pendingBlocks.current === 0) {
            report.current.onLoadingChange(false);
          }
        });
    },
  }),
  [query],
);
```

`rowCount: undefined` means the total is unknown until the service responds.
Passing `totalRows` to `successCallback` sets the true end of the scrollbar.

The first block has one extra responsibility: its first record becomes the
default detail-card record before the user selects anything.

`pendingBlocks` is a counter, not a boolean. The infinite model can request more
than one block concurrently; the loading indicator must remain active until the
last one settles.

There is an abort/race defect in this datasource as written. Reproduce it for
parity, but resolve it for production; see
[Review findings](#1-stale-row-page-callbacks-can-win-a-race).

---

## Sorting

Default sort is pricing date descending:

```ts
{
  field: 'pricingDate',
  headerName: 'PRICED',
  sort: 'desc',
}
```

AG Grid includes the requested sort in `params.sortModel`. The datasource stores
its first item and sends it to the row service:

```ts
const [sortItem] = params.sortModel;
const sort = sortItem
  ? { colId: sortItem.colId, direction: sortItem.sort as "asc" | "desc" }
  : null;
```

The service compares numbers numerically and everything else through
`localeCompare`:

```ts
function compareBy(sort: IssuanceRowSort) {
  const direction = sort.direction === "asc" ? 1 : -1;
  return (a: IssuanceRecord, b: IssuanceRecord) => {
    const left = a[sort.colId as keyof IssuanceRecord];
    const right = b[sort.colId as keyof IssuanceRecord];
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * direction;
    }
    return String(left).localeCompare(String(right)) * direction;
  };
}
```

ISO `YYYY-MM-DD` values sort correctly as strings. Tenors do not sort by
duration — `10Y` sorts before `3Y` — because they are strings. That behavior is
true to the current implementation and should be made explicit if tenor sorting
is exposed as a desk requirement.

Only the first sort-model item is implemented. AG Grid can display a
multi-column sort when the user holds Shift, so this is a known mismatch; see
[Review findings](#5-multi-sort-is-visible-but-only-one-key-is-applied).

---

## Selection and the detail card

### Selection configuration

```ts
const ROW_SELECTION = {
  mode: "singleRow",
  enableClickSelection: true,
  checkboxes: false,
} as const;
```

There is one selected row, selected by clicking anywhere on it, with no checkbox
column. The pale-blue theme fill supplies the visual state.

The grid reports the clicked record:

```tsx
onRowClicked={({ data }) => {
  if (data) onSelect(data);
}}
```

The table region owns both the picked record and the first record:

```ts
const [pickedRow, setPickedRow] = useState<IssuanceRecord | null>(null);
const [defaultRow, setDefaultRow] = useState<IssuanceRecord | null>(null);

const record = pickedRow ?? defaultRow;
```

That rule makes the card useful immediately. It shows the first row of the first
page until the user makes an explicit choice.

### Query changes

```ts
// A new result set invalidates the user's row choice; block refetches don't.
useEffect(() => setPickedRow(null), [query]);
```

The explicit selection clears whenever filters, search or date range produce a
new query. Paging does not clear it.

`defaultRow` is intentionally not cleared. During a query refresh, the previous
first record stays in the card until the new first page arrives. This avoids a
card-to-skeleton flash but means the card can briefly show a record outside the
new result set. The current UI has no stale marker on the card.

### Card surface

```ts
const SURFACE = "rounded-xl border border-stone-200/70 bg-white";
```

```tsx
<div className={`${SURFACE} px-5 py-5 xl:sticky xl:top-[76px] xl:self-start`}>
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h3 className="truncate text-sm font-semibold tracking-[-0.01em] text-stone-950">
        {record.issuer}
      </h3>
      <p className="mt-0.5 text-xs text-stone-500">
        {record.sector} · {record.rating}
      </p>
    </div>
    <Badge className={`shrink-0 border-transparent ${statusClass}`}>
      {record.status}
    </Badge>
  </div>

  <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 text-xs">
    <Detail label="Structure" value={`${record.currency} ${record.tenor}`} />
    <Detail
      label="Size"
      value={`${record.currency} ${record.size.toLocaleString()}m`}
    />
    <Detail label="Coupon" value={`${record.coupon}%`} />
    <Detail label="Pricing" value={formatDate(record.pricingDate)} />
  </dl>

  <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-3 py-4 text-center">
    <Metric value={record.spread} label="Spread bp" />
    <Metric value={record.nip} label="NIP bp" />
    <Metric value={`${record.cover}x`} label="Book cover" />
  </div>

  <div className="mt-6 space-y-4">
    <Note label="Leads" value={record.leads} />
    <Note label="Execution read" value={executionRead} />
  </div>
</div>
```

Four blocks, each separated by `mt-6`:

1. Issuer, sector/rating and status.
2. Two-column definition list: structure, size, coupon and pricing.
3. Three-column metric well: spread, NIP and cover.
4. Leads and execution commentary.

The metric well is the only filled area:

```
rounded-lg bg-stone-50 px-3 py-4
```

That restraint preserves the card as one object instead of creating three nested
KPI cards.

### Card typography

```tsx
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.09em] text-stone-400">
        {label}
      </dt>
      <dd className="mt-1 font-medium tabular-nums text-stone-800">{value}</dd>
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="text-xl font-semibold tracking-[-0.04em] text-stone-950">
        {value}
      </p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-stone-400">
        {label}
      </p>
    </div>
  );
}
```

Labels are small, uppercase and tracked; figures are tight and dark. The `dd`
uses `tabular-nums` because values update in the same fixed card geometry.

### Status badge

```ts
const statusClass =
  record.status === "Live"
    ? "bg-emerald-50 text-emerald-700"
    : record.status === "Monitoring"
      ? "bg-amber-50 text-amber-700"
      : "bg-stone-100 text-stone-600";
```

The badge primitive supplies `h-6`, `rounded-full`, `px-2` and 10px medium text.
`border-transparent` is repeated at the call site so no status gains an outline.

### Execution note

```ts
record.nip <= 4
  ? "Strong demand supports pricing at or through the tight end of guidance."
  : record.nip <= 7
    ? "Balanced execution with a modest concession to preserve book quality."
    : "Price sensitivity remains elevated; retain flexibility on size and final terms.";
```

This is deterministic demonstration copy, not a production analytics rule.
Real applications should receive commentary or a classified execution signal
from the service, with methodology and provenance, rather than deriving banker
language from NIP alone.

---

## Loading and empty states

There are four independent states.

### Row count

```tsx
{
  totalRows === null ? (
    <Skeleton className="h-2.5 w-14" />
  ) : (
    <span className="tabular-nums">{totalRows.toLocaleString()} issues</span>
  );
}
```

The count skeleton appears only before a total has ever arrived. Subsequent
queries keep the old count visible until the new first page reports its total.

### Refresh indicator

```ts
const showRefreshing = useSettledFlag(isGridLoading && totalRows !== null);
```

```tsx
{
  showRefreshing && <RefreshIndicator label="Loading" />;
}
```

The indicator waits 220ms before appearing and stays for at least 420ms. Fast
block requests therefore do not flash a spinner.

### Per-cell loading rows

The infinite model creates row nodes whose `data` is absent. A selector swaps in
a shimmer for each cell:

```tsx
function LoadingCell({ column }: CustomCellRendererProps<IssuanceRecord>) {
  const colId = column?.getColId() ?? "";
  const width = LOADING_CELL_WIDTHS[colId] ?? "60%";
  return (
    <span className="flex h-full items-center" aria-hidden>
      <span className="sk-shimmer block h-2 rounded-full" style={{ width }} />
    </span>
  );
}

const loadingAwareRenderer = ({ data }: { data?: IssuanceRecord }) =>
  data ? undefined : { component: LoadingCell };
```

Returning `undefined` is essential. It tells AG Grid to use the column's normal
renderer for loaded rows, including `StatusCell`.

Widths are column-specific:

```ts
const LOADING_CELL_WIDTHS = {
  status: "52px",
  pricingDate: "48px",
  issuer: "78%",
  ticker: "44px",
  region: "72%",
  currency: "28px",
  size: "72px",
  tenor: "30px",
  rating: "64px",
  sector: "70%",
  spread: "40px",
  nip: "30px",
  book: "58px",
  cover: "32px",
} as const;
```

Varying lengths preserve the visual rhythm of a table. Fourteen equal grey bars
read as a disabled slab.

The implementation also contains this CSS:

```css
.issuance-grid .ag-row-loading .sk-shimmer {
  height: 9px;
}
```

In AG Grid 36, the rendered placeholder rows observed here do not carry
`.ag-row-loading`; the selector does not match, so the live shimmer remains the
Tailwind `h-2` height of 8px. This is documented as an issue, not corrected here.

### Detail skeleton

Before any first row exists, the card mirrors the eventual geometry:

```tsx
export function DetailSkeleton() {
  return (
    <div
      className="rounded-xl border border-stone-200/70 bg-white px-5 py-5"
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="sk-stagger mt-6 grid grid-cols-2 gap-x-5 gap-y-4">
        {/* four label/value pairs */}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-3 py-4">
        {/* three metrics */}
      </div>
      <div className="mt-6 space-y-2">{/* notes */}</div>
    </div>
  );
}
```

The real border and stone metric well remain visible. They are structural, not
data placeholders, so shimmering them would make the card itself look
provisional.

### Empty states

Grid:

```tsx
overlayNoRowsTemplate =
  "<span class='text-xs text-stone-500'>No issuance matches these filters.</span>";
```

Detail card after loading:

```tsx
<div
  className={`${SURFACE} flex min-h-64 flex-col items-center justify-center p-6 text-center`}
>
  <p className="text-sm font-medium text-stone-700">No issuance selected</p>
  <p className="mt-1 text-xs text-stone-500">
    Select a row to inspect its execution.
  </p>
</div>
```

The grid empty state explains the query result; the card empty state explains
the missing selection. They are different conditions and should not share copy.

---

## Query changes and state ownership

`IssuanceTable` exists so grid-local state cannot repaint the charts:

```ts
const [pickedRow, setPickedRow] = useState(null);
const [defaultRow, setDefaultRow] = useState(null);
const [totalRows, setTotalRows] = useState<number | null>(null);
const [isGridLoading, setIsGridLoading] = useState(true);
```

| State                  | Owner        | Consumers                          |
| ---------------------- | ------------ | ---------------------------------- |
| Query                  | Dashboard    | Charts, stats and table            |
| Search draft           | Filter bar   | Search input until debounce        |
| Selected row           | Table region | Detail card only                   |
| Default first row      | Table region | Detail card only                   |
| Total row count        | Table region | Filter bar only                    |
| Loading counter result | Table region | Filter bar and detail-state switch |
| Sort model             | Grid ref     | Datasource only                    |
| Block cache            | AG Grid      | Grid only                          |

### Datasource identity

```ts
const datasource = useMemo<IDatasource>(() => ({/* getRows */}), [query]);
```

A new query creates a new datasource, which causes the infinite row model to
purge cached blocks. That is required: retaining pages would mix records from
two result sets.

Reporting callbacks are deliberately read through a ref:

```ts
const report = useRef({
  onDefaultRow,
  onTotalRowsChange,
  onLoadingChange,
});
report.current = {
  onDefaultRow,
  onTotalRowsChange,
  onLoadingChange,
};
```

If these callbacks were datasource dependencies, every table-state update would
create a datasource, purge the cache, refetch, update table state and repeat.

### Return to the first row

```ts
useEffect(() => {
  apiRef.current?.ensureIndexVisible(0, "top");
}, [query]);
```

Changing the result set returns the viewport to row zero. Sorting is internal to
AG Grid and does not change the React query, but AG Grid itself refreshes the
infinite cache for a new sort.

---

## Responsive and optional layouts

Three host preferences affect the region:

```ts
interface DisplayPrefs {
  density: "comfortable" | "compact";
  showDetailPanel: boolean;
  showSectorMix: boolean; // unrelated to the grid
}
```

- `density` selects one of the two prebuilt theme/height bundles.
- `showDetailPanel=false` removes the card and its column entirely.
- `wide=true` means the dashboard is in data-focused view, so the card widens
  from 282px to 300px.

The grid remains 560px tall in every mode. Horizontal overflow stays inside AG
Grid; vertical table paging stays inside its own viewport. The page itself
scrolls to move between dashboard regions.

The card is sticky only at `xl`, where it sits beside the table:

```
xl:sticky xl:top-[76px] xl:self-start
```

The 76px offset clears the 48px sticky application bar plus breathing room.

---

## Accessibility

What the implementation gets right:

- AG Grid exposes column headers and cells with its grid semantics.
- The status remains readable text; its coloured dot is decorative.
- Single-row selection is represented with `aria-selected`.
- Numeric columns use AG Grid's numeric column type and consistent alignment.
- Loading bars and the complete detail skeleton are `aria-hidden`.
- The loading indicator is `role="status"`.
- Resize handles remain available even though their resting paint is hidden.
- The no-rows overlay is real text.
- The card uses a heading and a definition list for label/value facts.

Observed from the accessibility tree, the rendered order is the two pinned
headers (`STATUS`, `ISSUER`) followed by the scrolling columns, matching the
visual order rather than the definition-array order.

Two limitations should be resolved in production:

1. The card is updated from `onRowClicked`, not the selection event. A keyboard
   selection can change AG Grid's selected row without changing the card.
2. The card has no `aria-live` status or explicit relationship to the grid.
   A screen-reader user may not be told that row activation replaced the detail.

Those are review findings, not changes made by this document.

---

## Performance contract

### Memoised grid

```tsx
export const IssuanceGrid = memo(function IssuanceGrid({
  query,
  density,
  onSelect,
  onDefaultRow,
  onTotalRowsChange,
  onLoadingChange,
}) {
  // …
});
```

Selecting a row re-renders `IssuanceTable` so the card updates. `memo` prevents
that render from rebuilding the grid when its meaningful props are unchanged.

The contract only works because:

- `query` is memoised by its owner;
- state-setter callbacks are stable;
- reporting callbacks do not enter the datasource dependencies;
- columns, default column definition, selection config and themes live at
  module scope;
- `Intl` formatters live at module scope.

### Virtualisation and bounded memory

AG Grid virtualises DOM rows and the block cache keeps at most twelve 25-row
pages. The service returns a page, not the full result set. Horizontal
virtualisation also avoids mounting every offscreen cell at narrow widths,
except pinned columns which must remain present.

### Bundle

The narrow module registration is the main bundle control. An earlier measured
comparison for this setup was approximately 36KB gzipped for the used modules
versus 186KB for `AllCommunityModule`. Treat those figures as build-specific,
not as a library guarantee; verify with the target application's bundler.

If the dashboard is not an initial route, lazy-load the whole dashboard boundary
so AG Grid and Recharts do not enter the startup chunk.

### Allocation hot paths

Avoid allocations in:

- value formatters called per visible cell;
- cell renderers called during scroll;
- datasource creation;
- column definitions;
- theme construction.

The current implementation still calls `toLocaleString()` for each visible Size
cell. That is acceptable at this scale; if profiling shows it as hot, introduce
one module-level number formatter rather than caching formatted values on the
record.

---

## Review findings not fixed

No application code was changed while producing this document. The findings
below describe the current behavior and the recommended production response.

### 1. Stale row-page callbacks can win a race

**Severity: high.**

`fetchIssuanceRows` accepts an `AbortSignal`, but the datasource never creates or
passes one and implements no `destroy()` cleanup:

```ts
fetchIssuanceRows(query, params.startRow, params.endRow, sortRef.current);
```

When a query changes, AG Grid replaces the datasource, but the previous promise
continues. Its `params.successCallback` may be ignored by the retired row model;
the three reporting callbacks are not:

```ts
report.current.onTotalRowsChange(totalRows);
report.current.onDefaultRow(rows[0] ?? null);
report.current.onLoadingChange(false);
```

This was reproduced against the running implementation. Switching `1M → All`
after 180ms produced these row-count sequences:

```
842 issues → 20 issues → 842 issues
842 issues → 20 issues                 // stale result finished last
```

The old request can therefore overwrite the final row count, default card record
and loading state after the latest grid has settled.

**Production remedy:** create an `AbortController` per datasource, pass its
signal to every row request, track request generation, and implement the
datasource's optional `destroy()` method to abort and suppress reports from that
generation. Reset the pending counter per datasource rather than sharing one
counter across generations.

### 2. Date-only values shift west of UTC

**Severity: high for a globally deployed banking application.**

The record carries a date-only ISO string:

```ts
new Date("2026-07-23");
```

JavaScript parses that as midnight UTC. Both `Intl.DateTimeFormat` instances use
the browser's local timezone because no `timeZone` is supplied. In New York and
Los Angeles the observed output was:

```
input       2026-07-23
grid        22 Jul 26
detail      22 Jul 2026
```

The same issuance appears one day early for users west of UTC.

**Production remedy:** because the contract is date-only, either format with
`timeZone: 'UTC'` or parse the three components into a date-only type. Do not
append a local time or rely on the deployment region.

### 3. The loading-row height selector does not match AG Grid 36

**Severity: low visual defect / stale CSS.**

The stylesheet targets:

```css
.issuance-grid .ag-row-loading .sk-shimmer {
  height: 9px;
}
```

During a distant scroll, unloaded rows rendered fourteen shimmer cells but the
row DOM did not contain `.ag-row-loading`. The selector matched nothing; bars
remained `h-2` (8px). The loading experience still works, but the documented 9px
override is not active.

**Production remedy:** either remove the dead rule and accept 8px, or target a
stable state owned by the renderer rather than a private AG Grid class. A
dedicated class on `LoadingCell` is safer across AG Grid versions.

### 4. Card state and AG Grid selection can diverge

**Severity: medium UX/accessibility defect.**

There is no `getRowId`; grid row identity defaults to row position. The card is
updated by `onRowClicked`, while AG Grid owns selection independently.

Observed:

1. Select ASML: row is blue and the card shows ASML.
2. Sort Size ascending: AG Grid clears the visual selection while the card
   continues to show ASML.

A keyboard selection can create the opposite mismatch because selection can
change without a row click.

**Production remedy:** provide `getRowId={({ data }) => data.id}`, drive the card
from `onSelectionChanged`, and explicitly decide whether sort preserves the
selected record or clears both the grid and card. Either behavior is defensible;
the two surfaces must agree.

### 5. Multi-sort is visible but only one key is applied

**Severity: medium correctness defect.**

AG Grid can create a multi-column sort model through its standard modifier-key
interaction, but the datasource discards every item after the first:

```ts
const [sortItem] = params.sortModel;
```

The UI can therefore display more sorting intent than the service executes.

**Production remedy:** either suppress multi-sort at the grid level or change
the service contract to accept and apply the complete ordered sort model.

### 6. Tenor sorts lexicographically

**Severity: medium if tenor sorting is used.**

`3Y`, `8Y`, `10Y` and `20Y` are strings. The generic comparator places `10Y`
before `3Y`. This is technically consistent with the current contract but not
with banker expectations.

**Production remedy:** send a numeric tenor in months or add a field-specific
comparator in the service.

### 7. Request failures have no explanatory UI

**Severity: medium operational defect.**

The datasource calls `params.failCallback()` but stores no error state:

```ts
.catch(() => params.failCallback())
```

The user can see loading stop without a reason or retry action. The old row
count and card may remain, which can make a failed query look successful.

**Production remedy:** report a typed row-load error to the table region and
render a retryable overlay. Keep the previous card only if it is visibly marked
as stale.

### 8. Execution commentary is demonstration logic

**Severity: domain-model risk, not a rendering bug.**

The card derives an execution judgment from NIP alone. That is useful scaffolding
but too reductive for production DCM workflow; book quality, price progression,
size, market context and deal stage also matter.

**Production remedy:** make the service return a structured execution assessment
with provenance. Keep the card as a renderer.

---

## Gotchas and anti-patterns

- **Do not register `AllCommunityModule` for convenience.** It adds features and
  bundle weight this grid cannot expose.
- **Do not import legacy AG Grid CSS beside the Theming API.** Pick one styling
  system.
- **Do not create themes inside render.** Theme identity should be stable.
- **Do not inline `columnDefs`, `defaultColDef` or `rowSelection`.** Fresh objects
  force AG Grid to reprocess configuration on unrelated React renders.
- **Do not add AG Grid column filters while retaining the dashboard filter bar.**
  Two filter models make the grid disagree with the hero and charts.
- **Do not client-sort the returned page.** Sort the full filtered result before
  slicing, preferably in the backend.
- **Do not widen the datasource memo dependencies.** Callback identity changes
  can purge the block cache on every parent render.
- **Do not omit `minmax(0,1fr)` or `min-w-0`.** The table's intrinsic width will
  overflow the page and displace the card.
- **Do not key selection by row index in production.** Stable record IDs are
  required across sorting and block eviction.
- **Do not drive the card from click alone.** Selection can change through the
  keyboard and grid API.
- **Do not swallow row-load failures without UI.** A bank user must know whether
  a result is current, stale or failed.
- **Do not format date-only strings in local time.** A pricing date is not a UTC
  instant.
- **Do not target undocumented AG Grid loading classes.** Put a class on the
  renderer you own.
- **Do not clear all existing rows for every block fetch.** Infinite paging
  should shimmer only the missing block, not blank the table.
- **Do not lift selected row, row count or block loading to the dashboard page.**
  Table interactions should not repaint the charts.
- **Do not replace the side card with Enterprise master/detail unless inline
  expansion is actually wanted.** The current side-by-side inspection flow keeps
  row density and comparison context intact.

---

## Porting sequence

1. Install matching AG Grid Community and React packages.
2. Copy the record, page, sort and query contracts.
3. Implement a real row endpoint that filters and sorts before paging.
4. Register only the modules in use.
5. Copy the Quartz theme and both density bundles at module scope.
6. Copy column definitions, then map fields and units to the target contract.
7. Copy `LoadingCell`, widths and the renderer selector.
8. Build the infinite datasource with cancellation and generation guards rather
   than reproducing the documented race.
9. Add stable `getRowId` and drive the card from selection changes.
10. Copy the table-region state boundary and responsive grid.
11. Copy the detail card, replacing the demonstration execution note with a
    service field.
12. Copy shimmer and resize-handle CSS, using an owned loading-cell class.
13. Add no-results, request-error and retry states.
14. Test the parity checklist in both densities and at both sides of UTC.

---

## Parity checklist

### Layout

- [ ] Table region starts `mt-10` with one `stone-200/70` top rule and `pt-5`
- [ ] Filter bar sits 16px above the grid/card row
- [ ] Grid/card row uses 28px gap and `minmax(0,1fr)`
- [ ] Grid wrapper has `min-w-0`
- [ ] Grid is 560px high
- [ ] Card is 282px wide in dashboard view, 300px in data view
- [ ] Card stacks below the grid before `xl`
- [ ] Card is sticky at `xl` with `top-[76px]`
- [ ] Hiding the card removes its column rather than leaving empty space

### Theme

- [ ] Quartz Theming API only; no legacy AG Grid CSS
- [ ] White grid/header backgrounds matching the page
- [ ] No wrapper border, radius, column border or header-column border
- [ ] Header baseline `#E7E5E4`; row dividers `#F1F1F0`
- [ ] Header 10px/600/`#a8a29e`; body 12px/`#44403c`
- [ ] Hover `#F8F8F7`; selection `#EEF4FF`
- [ ] Resize handle invisible at rest, `#d6d3d1` on hover
- [ ] Comfortable 42/38px rows/header with spacing 6
- [ ] Compact 32/32px rows/header with spacing 4

### Grid behavior

- [ ] Infinite row model registered and selected
- [ ] Page size 25, maximum 12 blocks, initial count 25
- [ ] 90ms block-load debounce and 4-row buffer
- [ ] Status and Issuer pinned left
- [ ] Default sort is Priced descending
- [ ] Status is not sortable
- [ ] Every other column is sortable and resizable
- [ ] Column filters and menu buttons are suppressed
- [ ] Numeric columns right-align through `numericColumn`
- [ ] Query change creates a datasource, purges cache and returns to row zero
- [ ] Real backend sorts the full result before slicing
- [ ] Row requests abort when their datasource is destroyed
- [ ] Multi-sort is either fully implemented or disabled
- [ ] Tenor sorting uses numeric duration semantics if exposed

### Selection and card

- [ ] Single-row click selection, no checkbox column
- [ ] Stable `getRowId` uses the record ID
- [ ] Card follows selection events, including keyboard selection
- [ ] Sort/query behavior clears or preserves both card and highlight together
- [ ] First row supplies the initial card
- [ ] Card has issuer, sector/rating and status badge
- [ ] Two-column facts: structure, size, coupon, pricing date
- [ ] Stone-50 metric well: spread, NIP, book cover
- [ ] Leads and a service-supplied execution assessment
- [ ] Empty card copy differs from no-rows copy

### Loading and failure

- [ ] Initial row count is a `h-2.5 w-14` skeleton
- [ ] Slow table refresh shows a delayed `Loading` status
- [ ] Empty row data invokes a per-cell loading renderer
- [ ] Loading widths are specific to all 14 columns
- [ ] Loaded cells return to their own renderer
- [ ] Loading shimmer class is owned by the renderer, not an AG Grid private row class
- [ ] Detail skeleton preserves the live card frame and metric well
- [ ] No-rows overlay reads “No issuance matches these filters.”
- [ ] Failed page request shows an error and retry action
- [ ] Superseded requests cannot update count, card or loading state

### Formatting and accessibility

- [ ] Date-only values render identically in UTC−08, UTC and UTC+10
- [ ] Grid date is abbreviated; card date uses a four-digit year
- [ ] Size and Book include issue currency and correct units
- [ ] Spread/NIP use `bp`; Cover uses `x`
- [ ] Status always includes visible text; dot is `aria-hidden`
- [ ] Loading bars and card skeleton are `aria-hidden`
- [ ] Loading indicator is `role="status"`
- [ ] Keyboard row selection updates the card
- [ ] Card update is announced or explicitly related to the grid

---

**Document status: Draft**
