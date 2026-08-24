# Multi-tranche deal view

A portable pattern for presenting primary-market deals with one to six
tranches. The table keeps one row per tranche, groups related rows without
heavy decoration, and opens a deal-level detail card containing the complete
tranche ladder.

The implementation described here uses React, TypeScript, Tailwind CSS and AG
Grid Community with the Infinite Row Model. The final section explains the
native AG Grid Enterprise alternative.

- [Design decision](#design-decision)
- [Code-quality review](#code-quality-review)
- [Data contract](#data-contract)
- [Query and paging contract](#query-and-paging-contract)
- [Community grid implementation](#community-grid-implementation)
- [Styling](#styling)
- [Whole-deal selection](#whole-deal-selection)
- [Selected-deal card](#selected-deal-card)
- [Loading states](#loading-states)
- [Optional view toggle](#optional-view-toggle)
- [AG Grid Enterprise alternative](#ag-grid-enterprise-alternative)
- [Gotchas](#gotchas)
- [Porting checklist](#porting-checklist)

---

## Design decision

Use **one real row per tranche**. Show fields shared by the deal only on the
first visible tranche:

```text
STATUS  ISSUER                 PRICED   CCY   SIZE       TENOR  SPREAD
Live    Example Energy         20 Jul   USD   USD 750m   4Y     83bp
        2 TRANCHES                      USD   USD 1.25bn  10Y    104bp
```

The second row is not a nested grid or a synthetic child row. It is another
tranche record. The relationship is communicated by:

1. a quiet `2 TRANCHES` label beside the issuer;
2. blank repeated deal-level cells;
3. no divider between tranches of the same deal;
4. the normal divider returning after the last tranche.

Do not add a background band, vertical spine, bracket or merged-cell border.
The omission of repeated information is enough. Single-tranche rows retain the
normal table appearance.

This shape is preferable to one row per deal because a banker can compare
tenor, size, spread, NIP, book and cover without opening anything. It is also
preferable to expandable rows when the normal task is scanning every tranche.

---

## Code-quality review

### What is strong

- **Deal identity is explicit.** `dealId` is not inferred from issuer and date.
- **Counts use distinct deal IDs.** KPI and chart deal counts are not inflated
  by multi-tranche prints.
- **Grouping occurs before page slicing.** A deal remains coherent when it
  crosses an infinite-cache block boundary.
- **Sorting preserves deal integrity.** Deal groups move; their tranche rows do
  not separate.
- **Grid presentation metadata is separate from domain data.**
  `groupHead`, `groupIndex` and `groupSize` exist only on the grid projection.
- **Loading rows still use the real grid.** The implementation does not replace
  AG Grid with a second skeleton table.
- **The detail card fetches the deal independently.** It does not assume the
  current page contains every tranche.
- **The styling is restrained.** Multi-tranche grouping is achieved by content
  and divider treatment rather than another visual container.

### Findings to address in production

1. **Mixed-currency deals need normalized totals.** The prototype puts currency
   on each tranche but generates one currency per deal. Summing raw `size` or
   `book` is invalid if a real deal contains USD and EUR tranches. Store both
   native and base-currency amounts, and total only the base amounts.
2. **Detail-fetch errors are swallowed.** An empty `.catch(() => {})` leaves
   the card showing a permanent skeleton. Distinguish aborts from failures and
   render a retry state.
3. **Filtered grid versus whole-deal card is a product decision.** A size filter
   may show three of five tranches, while the selected-deal card intentionally
   shows all five. Label the card `Whole deal` or pass the active scope if that
   distinction could surprise users.
4. **The CSS selectors reach AG Grid internals.** Selectors such as
   `.ag-grid-scrolling-cells` are necessary for AG Grid 36's row-border and
   overlay layers, but should be isolated and checked on each AG Grid upgrade.
5. **Sort semantics need to be documented.** Sorting a grouped deal by spread
   uses its minimum spread ascending and maximum spread descending. That is
   useful, but less obvious than flat row sorting.
6. **Date-only strings need an explicit timezone.** Formatting
   `new Date("2026-07-23")` without `timeZone: "UTC"` can show the previous day
   west of UTC. Prefer a date-only parser or pin the formatter to UTC.

None of these invalidate the Community-edition pattern. They are boundary and
production-hardening concerns.

---

## Data contract

### Production model

Keep deals and tranches normalized:

```ts
interface Deal {
  id: string;
  issuer: string;
  ticker: string;
  pricingDate: string; // ISO date, not datetime
  region: string;
  sector: string;
  rating: string;
  status: "Live" | "Monitoring" | "Priced";
  leads: string[];
  trancheCount: number;
  totalBaseAmount: number;
  baseCurrency: "EUR";
}

interface Tranche {
  id: string;
  dealId: string;
  order: number;
  currency: string;
  amount: number;
  baseAmount: number;
  tenor: string;
  coupon: number;
  spread: number;
  nip: number;
  book: number;
  baseBook: number;
  cover: number;
}
```

The grid endpoint may return a denormalized projection so every row is
self-contained:

```ts
interface DealTrancheRow extends Deal, Tranche {
  // Name collisions should be resolved explicitly in a real API:
  trancheId: string;
  trancheCurrency: string;
}
```

Do not infer a deal from `(issuer, pricingDate)`. The same issuer can print
separate transactions on one day, and taps or reopenings need stable identity.

### Prototype projection

A compact prototype can keep the shared fields on every row:

```ts
interface IssuanceRecord {
  id: string;
  dealId: string;
  trancheIndex: number;
  trancheCount: number;
  dealEurEquivalent: number;

  // Shared deal fields
  pricingDate: string;
  issuer: string;
  ticker: string;
  region: string;
  sector: string;
  rating: string;
  leads: string;
  status: IssuanceStatus;

  // Tranche fields
  currency: string;
  size: number;
  eurEquivalent: number;
  tenor: string;
  coupon: number;
  spread: number;
  nip: number;
  book: number;
  cover: number;
}
```

The duplicated fields are transport convenience, not authority. In production,
update deal-level fields on the deal entity and project them at read time.

### Grid metadata

Add presentation metadata after filtering and sorting:

```ts
interface DealGridRow extends IssuanceRecord {
  groupHead: boolean;
  groupIndex: number;
  groupSize: number;
}
```

- `groupHead`: first **visible** tranche after filters.
- `groupIndex`: position in the visible deal group.
- `groupSize`: visible tranches, not necessarily the whole deal.

Keeping `trancheCount` and `groupSize` separate is important. A filter may turn
a six-tranche deal into a visible two-row group.

---

## Query and paging contract

The server or mock service must perform operations in this order:

```text
filter tranches
  → group by dealId
  → order tranches inside each deal
  → sort deal groups
  → stamp group metadata
  → flatten groups
  → slice the requested page
```

Stamping after the page is sliced is incorrect. A deal split between rows 24
and 25 would acquire two heads and repeat the issuer at the cache boundary.

### Group and stamp

```ts
const groups = new Map<string, IssuanceRecord[]>();

tranches.forEach((row) => {
  const group = groups.get(row.dealId);
  if (group) group.push(row);
  else groups.set(row.dealId, [row]);
});

const dealGroups = [...groups.values()];

dealGroups.forEach((group) =>
  group.sort((a, b) => a.trancheIndex - b.trancheIndex),
);

const stamped: DealGridRow[] = [];

dealGroups.forEach((group) => {
  group.forEach((row, index) => {
    stamped.push({
      ...row,
      groupHead: index === 0,
      groupIndex: index,
      groupSize: group.length,
    });
  });
});

return {
  rows: stamped.slice(startRow, endRow),
  totalRows: stamped.length,
};
```

The API should return both counts when useful:

```ts
interface DealGridPage {
  rows: DealGridRow[];
  totalTranches: number;
  totalDeals: number;
}
```

That avoids combining row count from one request with deal count from an
aggregate request that may settle at a different time.

### Deal-integrity sorting

Deal-scoped columns use the shared value. Tranche-scoped columns use a
representative value:

```ts
function representative(
  group: IssuanceRecord[],
  column: keyof IssuanceRecord,
  direction: "asc" | "desc",
) {
  const values = group.map((row) => row[column]);
  return direction === "asc" ? min(values) : max(values);
}
```

Then sort the groups and keep tranches in tenor order:

```ts
dealGroups.sort((left, right) =>
  compare(
    representative(left, column, direction),
    representative(right, column, direction),
  ) || left[0].dealId.localeCompare(right[0].dealId),
);
```

Use a stable `dealId` tie-breaker so cache blocks do not reshuffle between
requests.

### Deal-aware aggregates

Volume sums tranches; deal counts use a `Set`:

```ts
const deals = new Set<string>();
let volume = 0;

rows.forEach((row) => {
  deals.add(row.dealId);
  volume += row.baseAmount;
});

return {
  volume,
  dealCount: deals.size,
  averageDealSize: deals.size ? volume / deals.size : 0,
};
```

The same rule applies to time buckets and category breakdowns. Never use row
count as deal count after introducing multi-tranche data.

---

## Community grid implementation

This pattern works with AG Grid Community and the Infinite Row Model. It does
not use row grouping, tree data, master/detail or row spanning.

### Modules

Register only the modules used:

```ts
ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  RowSelectionModule,
  CellStyleModule,
  RowStyleModule,
  ScrollApiModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
]);
```

`RowStyleModule` is required because the implementation uses
`rowClassRules`.

### Blank repeated deal fields

The selector must preserve loading cells when `data` is absent:

```tsx
const BlankCell = () => null;

const dealScopedRenderer = ({ data }: { data?: DealGridRow }) => {
  if (!data) return { component: LoadingCell };
  return data.groupHead ? undefined : { component: BlankCell };
};
```

Apply it only to fields truly shared by the deal:

```ts
const columns: ColDef<DealGridRow>[] = [
  {
    field: "status",
    cellRenderer: StatusCell,
    cellRendererSelector: dealScopedRenderer,
  },
  {
    field: "pricingDate",
    cellRendererSelector: dealScopedRenderer,
  },
  {
    field: "issuer",
    cellRenderer: IssuerCell,
    cellRendererSelector: dealScopedRenderer,
  },
  {
    field: "ticker",
    cellRendererSelector: dealScopedRenderer,
  },

  // Tranche fields remain populated on every row.
  { field: "currency" },
  { field: "size", type: "numericColumn" },
  { field: "tenor" },
  { field: "spread", type: "numericColumn" },
];
```

Currency is tranche-scoped for a mixed-currency deal. Do not blank it unless
the domain contract guarantees one currency per deal.

### Issuer cell

The count is metadata, not a badge:

```tsx
function IssuerCell({
  value,
  data,
}: CustomCellRendererProps<DealGridRow, string>) {
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
```

Avoid a pill, background fill or icon. The count should explain the blank rows,
not compete with the issuer.

### Row classes

```ts
const rowClassRules = {
  "deal-band": ({ data }: { data?: DealGridRow }) =>
    (data?.groupSize ?? 1) > 1,

  "deal-band-end": ({ data }: { data?: DealGridRow }) =>
    data != null &&
    data.groupSize > 1 &&
    data.groupIndex === data.groupSize - 1,

  "deal-selected": ({ data }: { data?: DealGridRow }) =>
    data != null && data.dealId === selectedDealId,
};
```

When `selectedDealId` is React state, memoize the rules with that state in the
dependency list so AG Grid re-evaluates visible rows.

---

## Styling

The grid keeps its normal white background and normal divider token:

```ts
const theme = themeQuartz.withParams({
  backgroundColor: "#ffffff",
  rowBorder: { style: "solid", width: 1, color: "#F1F1F0" },
  rowHoverColor: "#F8F8F7",
  selectedRowBackgroundColor: "#EEF4FF",
  columnBorder: false,
  wrapperBorder: false,
});
```

Only internal deal dividers disappear:

```css
/* Shared values render once; interior tranche dividers disappear. */
.deal-grid .ag-row.deal-band > .ag-grid-pinned-left-cells,
.deal-grid .ag-row.deal-band > .ag-grid-scrolling-cells {
  border-bottom-color: transparent;
}

/* The normal table divider returns after the final tranche. */
.deal-grid .ag-row.deal-band-end > .ag-grid-pinned-left-cells,
.deal-grid .ag-row.deal-band-end > .ag-grid-scrolling-cells {
  border-bottom-color: #f1f1f0;
}
```

Target the per-row pinned and scrolling cell containers. In AG Grid 36, setting
the border on `.ag-row` does not change the visible row divider.

The resulting rules are deliberately minimal:

- no group background;
- no vertical connector;
- no indentation;
- no rounded group shell;
- no stronger divider at the start;
- no styling difference for a single-tranche deal.

---

## Whole-deal selection

AG Grid's built-in single-row selection only colors the clicked tranche. Keep
that semantic selection for keyboard and accessibility, then add a visual class
to every visible sibling:

```tsx
const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

<AgGridReact
  rowSelection={{
    mode: "singleRow",
    enableClickSelection: true,
    checkboxes: false,
  }}
  rowClassRules={rowClassRules}
  onRowClicked={({ data }) => {
    if (!data) return;
    setSelectedDealId(data.dealId);
    onSelect(data);
  }}
/>;
```

Match the theme's selected-row blue:

```css
.deal-grid .ag-row.deal-selected > .ag-grid-pinned-left-cells::before,
.deal-grid .ag-row.deal-selected > .ag-grid-scrolling-cells::before {
  background-color: #eef4ff;
  background-image: none;
  content: "";
  display: block;
  inset: 0;
  pointer-events: none;
  position: absolute;
}
```

This is visual grouping, not multi-row selection. If downstream actions operate
on the whole deal, pass `dealId` explicitly rather than reading AG Grid's
selected row collection.

---

## Selected-deal card

The grid row supplies identity immediately. Fetch the full deal independently:

```tsx
const [tranches, setTranches] = useState<Tranche[] | null>(null);

useEffect(() => {
  setTranches(null);
  if (!dealId) return;

  const controller = new AbortController();

  fetchDeal(dealId, controller.signal)
    .then((deal) => setTranches(deal.tranches))
    .catch((error) => {
      if (error.name !== "AbortError") setError(error);
    });

  return () => controller.abort();
}, [dealId]);
```

### Layout

Use one bordered surface next to the borderless grid:

```text
Example Energy                             Live
EXM · A2
Energy · Western Europe

PRICING              DEAL TOTAL
20 Jul 2026          €2.0bn · 2 tranches
LEADS
Bank A, Bank B, Bank C

TRANCHE LADDER · USD
TENOR   SIZE     SPREAD   NIP   BOOK   COVER
4Y      750m     83bp     4     2.1bn  2.8x
10Y     1.25bn   104bp    5     3.8bn  3.0x

TOTAL BOOK       TOTAL SIZE       WTD COVER
5.9bn            2.0bn            3.0x
```

Reference geometry:

```tsx
const SURFACE =
  "rounded-xl border border-stone-200/70 bg-white";

<div className={`${SURFACE} px-5 py-5 xl:sticky xl:top-[76px]`}>
  {/* identity */}
  <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-xs" />
  {/* tranche ladder */}
  <div className="mt-6" />
  {/* totals */}
  <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-3 py-4 text-center" />
</div>
```

The outer table/card split can use:

```tsx
<div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_282px]">
  <DealGrid />
  <DealCard />
</div>
```

Use `300px` in a wider data-workbench mode.

### Tranche ladder

The card table is intentionally plain HTML. A second AG Grid would add nested
scrolling, another loading system and unnecessary module weight for at most six
rows.

```tsx
<table className="mt-2 w-full border-collapse tabular-nums">
  <thead>
    <tr className="text-[9px] uppercase tracking-[0.08em] text-stone-400">
      <th className="pb-1.5 text-left font-medium">Tenor</th>
      <th className="pb-1.5 text-right font-medium">Size</th>
      <th className="pb-1.5 text-right font-medium">Spread</th>
      <th className="pb-1.5 text-right font-medium">NIP</th>
      <th className="pb-1.5 text-right font-medium">Book</th>
      <th className="pb-1.5 text-right font-medium">Cover</th>
    </tr>
  </thead>
  <tbody className="text-[11px]">
    {tranches.map((tranche) => (
      <tr key={tranche.id} className="border-t border-stone-100">
        {/* cells */}
      </tr>
    ))}
  </tbody>
</table>
```

### Totals

For a single-currency deal:

```ts
const totalSize = tranches.reduce((sum, row) => sum + row.amount, 0);
const totalBook = tranches.reduce((sum, row) => sum + row.book, 0);
const weightedCover = totalBook / totalSize;
```

For mixed currency, use `baseAmount` and `baseBook` instead. Never add native
currency amounts.

---

## Loading states

### Grid

Keep the real AG Grid mounted. Unloaded row nodes use the existing per-cell
renderer:

```ts
const loadingAwareRenderer = ({ data }: { data?: DealGridRow }) =>
  data ? undefined : { component: LoadingCell };
```

The deal-scoped selector must also return the loading renderer when no data has
arrived; returning `BlankCell` would make the skeleton disappear after the
first load.

### Card

When the clicked row changes:

1. render deal identity from the clicked grid row immediately;
2. set the tranche payload to `null`;
3. render exactly `trancheCount` skeleton ladder rows;
4. swap in the fetched rows without changing card height unexpectedly.

```tsx
Array.from({ length: record.trancheCount }, (_, index) => (
  <tr key={index} className="border-t border-stone-100">
    <td colSpan={6} className="py-1.5">
      <span
        className="sk-shimmer block h-2 rounded-full"
        style={{ width: `${88 - (index % 3) * 9}%` }}
      />
    </td>
  </tr>
));
```

Add an explicit error row with `Retry` for non-abort failures.

---

## Optional view toggle

Provide a two-state control:

- **Deal view** — grouped rows, repeated deal fields blanked, deals kept intact
  during sorting.
- **Tranche view** — flat rows, every field repeated, tranche-level global
  sorting.

Use those labels rather than `Grouped` / `Ungrouped`; they explain the data
semantics, not the implementation.

### Placement

Place the control at the right side of the table toolbar, before the loading
indicator and result count. It changes table presentation, so it should not sit
among filter chips.

```tsx
type RowView = "deal" | "tranche";

function RowViewToggle({
  value,
  onChange,
}: {
  value: RowView;
  onChange: (value: RowView) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg bg-stone-100 p-[3px]"
      role="group"
      aria-label="Table view"
    >
      {(["deal", "tranche"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`h-[22px] rounded-md px-2 text-[10px] font-medium ${
            value === option
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {option === "deal" ? "Deal view" : "Tranche view"}
        </button>
      ))}
    </div>
  );
}
```

### State ownership

Keep `rowView` beside the table, not in the aggregate/chart query:

```tsx
const [rowView, setRowView] = useState<RowView>("deal");

const datasource = useMemo(
  () => createDatasource({ query, rowView }),
  [query, rowView],
);
```

Changing it should:

- recreate the datasource and return to row zero;
- clear the selected deal;
- keep chart data untouched;
- optionally persist to URL or user preferences.

### Service behavior

```ts
function fetchRows(request: {
  query: Query;
  rowView: RowView;
  sort: Sort | null;
  startRow: number;
  endRow: number;
}) {
  const filtered = applyFilters(request.query);

  const visible =
    request.rowView === "deal"
      ? groupSortStampAndFlatten(filtered, request.sort)
      : flatSort(filtered, request.sort).map((row) => ({
          ...row,
          groupHead: true,
          groupIndex: 0,
          groupSize: 1,
        }));

  return visible.slice(request.startRow, request.endRow);
}
```

The count label can stay `179 tranches · 96 deals` in both modes.

---

## AG Grid Enterprise alternative

Enterprise can represent the relationship natively, but the appropriate
feature depends on the desired UX.

### Recommended native model: SSRM Tree Data

Deal → tranche is an intrinsic hierarchy, not an arbitrary grouping chosen by
the user. That makes **Server-Side Row Model Tree Data** the closest semantic
fit.

```bash
npm install ag-grid-enterprise
```

Keep `ag-grid-community`, `ag-grid-react` and `ag-grid-enterprise` on exactly
the same version. Configure the Enterprise license according to the AG Grid
license documentation.

```ts
import { ModuleRegistry } from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([
  ServerSideRowModelModule,
  RowGroupingModule,
]);
```

```tsx
<AgGridReact
  rowModelType="serverSide"
  treeData
  isServerSideGroup={(row) => row.kind === "deal"}
  getServerSideGroupKey={(row) => row.dealId}
  autoGroupColumnDef={{
    headerName: "Issuer",
    field: "issuer",
    minWidth: 220,
  }}
  serverSideDatasource={datasource}
/>;
```

The datasource receives the current hierarchy in `request.groupKeys`:

```ts
const datasource: IServerSideDatasource = {
  getRows(params) {
    const dealId = params.request.groupKeys[0];

    if (!dealId) {
      fetchDealSummaries(params.request).then(({ deals, total }) => {
        params.success({ rowData: deals, rowCount: total });
      });
      return;
    }

    fetchTranches(dealId, params.request).then((tranches) => {
      params.success({ rowData: tranches, rowCount: tranches.length });
    });
  },
};
```

This provides native:

- expand/collapse;
- group keyboard semantics;
- child loading;
- stable hierarchy state;
- selection propagation options;
- group child counts.

Open deals by default if users normally need every tranche, but test the cost:
six-tranche deals are small; thousands of expanded deals are not.

### SSRM Row Grouping

Server-side row grouping by `dealId` is also possible:

```ts
const columnDefs = [
  { field: "dealId", rowGroup: true, hide: true },
  { field: "issuer" },
  { field: "tenor" },
  { field: "size" },
];
```

The server reads `request.rowGroupCols` and `request.groupKeys` to return group
nodes or tranche children. Use this if users may regroup by issuer, sector or
currency. For a fixed deal → tranche relationship, Tree Data communicates the
domain more accurately.

### Master/detail

Master/detail uses one deal row and a detail grid for tranches. It is useful
when:

- users scan deals first;
- tranche detail is secondary;
- the top-level table must remain compact.

It is not the best match when bankers need to compare all tranches at once.
It also changes the visual rhythm more than the Community banded-row pattern.

### Row spanning

Cell spanning can visually merge repeated values, but it is not supported by
the Infinite Row Model used by the Community implementation. Do not switch to
spanning without confirming the target row model, pagination behavior and AG
Grid version.

Even where supported, spanning is presentation only. It does not solve:

- deal-aware sorting;
- distinct deal counts;
- whole-deal selection;
- detail fetching;
- mixed-currency totals.

### When Enterprise is worth it

Choose Enterprise when the product needs native collapse/expand, server-side
hierarchical loading, user-controlled grouping, group aggregation, Excel
export, or enterprise support. Keep the Community pattern when the hierarchy is
fixed, all tranches should remain visible, and the quiet run-sheet appearance
is the intended UX.

---

## Gotchas

### Do not stamp groups after pagination

It repeats deal identity at block boundaries.

### Do not blank unloaded cells

`data === undefined` means loading, not a continuation tranche.

### Do not count rows as deals

Every aggregate must deduplicate `dealId`.

### Do not globally sort tranche rows in deal view

That separates a deal and makes blank repeated cells meaningless.

### Do not sum native currencies

Use base-currency amounts for deal totals and weighted metrics.

### Do not use issuer as the group key

An issuer can have multiple deals in the same result set.

### Do not add nested AG Grid for six card rows

A semantic HTML table is smaller, clearer and easier to load.

### Do not over-style grouping

No tint, connector or bracket is required. Blank repeated fields plus removed
interior dividers are sufficient.

### Decide card scope explicitly

Choose one:

- whole deal, regardless of current tranche filters;
- visible tranches only;
- whole deal with filtered tranches marked.

Name the behavior in the UI or documentation.

---

## Porting checklist

- [ ] Stable `dealId` and `trancheId`
- [ ] Deal and tranche fields classified explicitly
- [ ] Native and base-currency amount fields
- [ ] Group/filter/sort/stamp before page slice
- [ ] Stable tie-break sort
- [ ] `groupHead`, `groupIndex`, `groupSize` grid projection
- [ ] Deal-level cells blank only on loaded continuation rows
- [ ] Tranche count rendered as quiet metadata
- [ ] Internal dividers transparent; normal divider after last tranche
- [ ] Whole-deal visual selection uses `dealId`
- [ ] Distinct deal counts in KPI, charts and result label
- [ ] Detail endpoint returns all tranches in ladder order
- [ ] Card skeleton row count matches expected tranche count
- [ ] Detail error and retry state
- [ ] Filtered-grid versus whole-card scope documented
- [ ] Optional `Deal view` / `Tranche view` changes only table state
- [ ] Block-boundary, sorting, filtering and mixed-currency tests
- [ ] AG Grid internal selector regression check after upgrades

