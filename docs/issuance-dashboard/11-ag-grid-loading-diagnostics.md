# AG Grid loading diagnostics

Use this note when an infinite AG Grid shows blank placeholder rows, only its
pinned columns, a non-animated skeleton, or data that later disappears.

These symptoms are usually not one problem:

- A static or invisible shimmer can be a CSS/reduced-motion issue.
- Rows disappearing is normally a datasource, request-lifecycle, callback or
  layout issue.

## Fast triage

Run these in the browser console:

```js
matchMedia("(prefers-reduced-motion: reduce)").matches;
document.querySelectorAll(".sk-shimmer").length;
document.querySelector(".ag-center-cols-viewport")?.getBoundingClientRect();
```

Interpretation:

| Result                                                 | Likely cause                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Reduced motion is `true`, shimmer elements exist       | Animation is intentionally disabled; verify the static fallback |
| Shimmer elements exist but are transparent/zero-height | Loading renderer CSS                                            |
| No shimmer elements while unloaded rows exist          | `cellRendererSelector` is absent or not running                 |
| Centre viewport width is zero                          | Grid/CSS layout collapse                                        |
| Network requests repeatedly restart                    | Unstable query or datasource identity                           |
| Request succeeds but scrollbar/rows disappear          | Incorrect `successCallback` total                               |
| An earlier request changes the final count/data        | Missing cancellation or generation guard                        |

## 1. Verify the skeleton independently of animation

Reduced motion can stop the moving gradient, but it must not make the
placeholder invisible:

```css
.sk-shimmer {
  position: relative;
  overflow: hidden;
  background: #f2f1f0;
}

.sk-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(255 255 255 / 75%),
    transparent
  );
  transform: translateX(-100%);
  animation: sk-sweep 1.6s ease-in-out infinite;
}

@keyframes sk-sweep {
  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sk-shimmer::after {
    animation: none;
  }

  .sk-shimmer {
    background: #eeedec;
  }
}
```

If the machine reports reduced motion, a static grey bar is correct. This does
not explain loaded data disappearing.

## 2. Own the loading-cell class

Do not rely on a private AG Grid row class:

```css
.ag-row-loading .sk-shimmer {
  height: 9px;
}
```

AG Grid v36 placeholder rows do not reliably carry `.ag-row-loading`. Put an
owned class on the renderer instead:

```tsx
function LoadingCell({ column }: CustomCellRendererProps<IssuanceRecord>) {
  const width = LOADING_CELL_WIDTHS[column?.getColId() ?? ""] ?? "60%";

  return (
    <span className="grid-loading-cell flex h-full items-center" aria-hidden>
      <span className="sk-shimmer block h-2 rounded-full" style={{ width }} />
    </span>
  );
}
```

The renderer supplies its own height, so it stays visible if AG Grid changes its
internal DOM classes.

## 3. Confirm the renderer selector is on every column

```ts
const loadingAwareRenderer = ({ data }: { data?: IssuanceRecord }) =>
  data ? undefined : { component: LoadingCell };

const DEFAULT_COL_DEF: ColDef<IssuanceRecord> = {
  sortable: true,
  filter: false,
  resizable: true,
  suppressHeaderMenuButton: true,
  cellRendererSelector: loadingAwareRenderer,
};
```

Returning `undefined` for a loaded row is important: it restores the column's
normal renderer. Returning a loading component unconditionally leaves real rows
looking empty.

## 4. Check datasource identity

Changing the datasource purges the infinite-row cache. If it is recreated on
every render, loading state triggers a render, the datasource is replaced, and
the request/cache cycle can continue indefinitely.

The datasource should depend only on a stable query:

```tsx
const query = useMemo(
  () => ({ from, to, filters, search, sortBy }),
  [from, to, filters, search, sortBy],
);

const datasource = useMemo<IDatasource>(
  () => ({
    getRows(params) {
      // Fetch this query and this block.
    },
  }),
  [query],
);
```

Do not add freshly created reporting callbacks to the dependencies. Read them
through a ref:

```tsx
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

Useful temporary instrumentation:

```ts
console.count("datasource created");
console.log("getRows", params.startRow, params.endRow, query);
```

`datasource created` should increment when the query changes, not when a page
loads or a row is selected.

## 5. Validate `successCallback`

The service must filter and sort the complete result before slicing:

```ts
const filtered = applyQuery(allRows, query);
const sorted = applySort(filtered, sort);
const rows = sorted.slice(startRow, endRow);

return {
  rows,
  totalRows: sorted.length,
};
```

Then report the full matching total:

```ts
params.successCallback(rows, totalRows);
```

Do not pass:

- `rows.length` — that is the page size, not the result total;
- `0` while the total is unknown — AG Grid treats it as the end;
- `endRow` — it invents a total and can leave phantom rows;
- a total from a previous query.

An incorrect total is a common reason the scrollbar contracts and data appears
to stop.

## 6. Cancel retired datasources

Replacing the datasource does not automatically stop application promises.
Without cancellation, an older request can update row count, default-card data
or loading state after the latest query has completed.

A production datasource should own an abort controller and generation:

```ts
function createDatasource(query: IssuanceQuery): IDatasource {
  const controller = new AbortController();
  let active = true;

  return {
    getRows(params) {
      fetchRows(query, params.startRow, params.endRow, controller.signal)
        .then(({ rows, totalRows }) => {
          if (!active) return;
          params.successCallback(rows, totalRows);
        })
        .catch((error) => {
          if (!active || error?.name === "AbortError") return;
          params.failCallback();
        });
    },

    destroy() {
      active = false;
      controller.abort();
    },
  };
}
```

If several blocks can load concurrently, use a controller per request or a
datasource-level collection of controllers.

## 7. Do not swallow failures

This is insufficient on its own:

```ts
.catch(() => params.failCallback())
```

It tells AG Grid that a block failed but gives the user no explanation. Track a
typed error in the table region and provide a retry overlay. In development,
log the original error before reducing it to grid state.

Check the browser console and Network panel for:

- 4xx/5xx responses;
- a response shape that lacks `rows` or `totalRows`;
- an exception in a value formatter or cell renderer;
- aborted requests being treated as ordinary failures;
- repeated requests for the same `[startRow, endRow)` block.

## 8. Check layout when only pinned columns appear

If only two columns are visible, they may be the pinned columns while the centre
viewport has collapsed.

The grid needs explicit height and a shrinkable parent:

```tsx
<div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_282px]">
  <div className="min-w-0">
    <div className="h-[560px] w-full">
      <AgGridReact />
    </div>
  </div>

  <DetailPanel />
</div>
```

Check:

```js
const viewport = document.querySelector(".ag-center-cols-viewport");
console.log(viewport?.getBoundingClientRect());
```

A width of zero or a grid root without height is CSS, not animation.

## 9. Keep configuration stable

Build these at module scope:

```ts
const COLUMNS = [/* ... */];
const DEFAULT_COL_DEF = {/* ... */};
const ROW_SELECTION = {/* ... */};
const THEME = themeQuartz.withParams({/* ... */});
```

Fresh column definitions or theme objects force AG Grid to reprocess
configuration. They are less likely than an unstable datasource to erase data,
but they make the lifecycle harder to reason about and can reset state.

## Diagnostic order

1. Confirm whether reduced motion is active.
2. Count `.sk-shimmer` elements.
3. Inspect one shimmer's computed width, height, background and pseudo-element.
4. Measure the centre viewport and grid root.
5. Count datasource creation.
6. Log each `getRows(startRow, endRow)`.
7. Verify each request calls exactly one success or failure callback.
8. Verify success receives the full `totalRows`.
9. Rapidly change the query and confirm retired requests cannot report.
10. Test an intentional server failure and verify the UI explains it.

The key distinction is:

> Reduced motion can explain a non-moving shimmer. It cannot explain loaded
> rows later disappearing. Treat those as separate CSS and datasource
> investigations.
