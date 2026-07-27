# Performance

Where the cost is, what keeps it down, and which apparently-redundant code is
load-bearing.

- [Budget](#budget)
- [Bundle](#bundle)
- [Render](#render)
- [Allocation](#allocation)
- [Data layer](#data-layer)
- [Anti-patterns](#anti-patterns)
- [Measuring](#measuring)

---

## Budget

Four hot paths, in rough order of how easy they are to ruin:

| Path | Frequency | Must not |
| --- | --- | --- |
| Grid scroll | Continuous | Re-render anything outside the grid |
| Search typing | Per keystroke | Reach past the input |
| Row selection | Per click | Repaint the charts |
| Query change | Per control interaction | Blank the page |

Everything below exists to hold one of those four lines.

---

## Bundle

### AG Grid modules

The single largest saving available. `AllCommunityModule` registers the entire
community feature set: the client-side row model, every filter type, editing,
CSV export, pagination. A grid using four features pays for all of it.

| Registration | Raw | Gzipped |
| --- | --- | --- |
| `AllCommunityModule` | 659 KB | 186 KB |
| The four modules used here | 121 KB | **36 KB** |

150KB gzipped, for a change that alters nothing on screen.

```ts
import {
  CellStyleModule,
  InfiniteRowModelModule,
  ModuleRegistry,
  RowSelectionModule,
  ScrollApiModule,
  ValidationModule,
} from 'ag-grid-community';

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
  ScrollApiModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
]);
```

What each one buys:

| Module | Feature |
| --- | --- |
| `InfiniteRowModelModule` | Paged datasource |
| `RowSelectionModule` | Click-to-select rows |
| `CellStyleModule` | `cellClass` on columns |
| `ScrollApiModule` | `ensureIndexVisible` on query change |
| `ValidationModule` | Development-only diagnostics |

Include `ValidationModule` in development. Without it, a missing module fails
silently — a feature simply does not work, with no error. With it, the console
names the module to add.

Slimming is per-registration, not per-grid. A second grid elsewhere in the
application registering `AllCommunityModule` puts the whole library back into
the shared chunk and cancels the saving.

### Barrel imports

`lucide-react`, `date-fns`, `react-aria-components` and the Radix packages are
barrels. Production bundlers tree-shake them, but development transform time
suffers because the whole barrel is parsed per import site. Under Next, add them
to `optimizePackageImports`. Under Vite, they can be left alone unless dev startup
becomes slow, at which point import from source paths.

`react-aria-components` is the largest of these by a wide margin and deserves a
measurement rather than an assumption. Bundling only the five exports the date
fields use — `DateField`, `DateInput`, `DateSegment`, `Label`, `I18nProvider` —
against the whole package:

| Imported | gzip |
| --- | --- |
| `@internationalized/date` (`CalendarDate`, `parseDate`) | 3.6 kB |
| The five `react-aria-components` exports | 48.8 kB |
| `import * as RAC from 'react-aria-components'` | 265.3 kB |

Tree-shaking is therefore working — it strips 82% — but **49 kB gzip is the real
price of two date fields**, and it does not shrink further, because `DateField`
pulls in the shared focus, i18n, collection and overlay machinery that the rest of
the library sits on. Two consequences:

- The cost amortises to nothing if anything else in the application uses React
  Aria, and stays at 49 kB if the date fields are the only consumers.
- If they are the only consumers and the budget matters, a hand-written segmented
  field is roughly a hundred lines, at the cost of owning per-segment `spinbutton`
  semantics, arrow and type-ahead handling, and IME behaviour yourself. Read
  [02-functional-spec.md](./02-functional-spec.md#typed-dates) first: the reason
  the library is here is that a native `<input type="date">` cannot be pinned to a
  format, and hand-rolling means reimplementing that guarantee too.

Either way, keep the fields inside the lazy-loaded dashboard chunk so the weight
never lands on an initial route that has no date picker.

### Code splitting

The dashboard pulls in AG Grid and Recharts. If it is one route among many,
lazy-load it:

```tsx
const IssuanceDashboard = lazy(() =>
  import('./issuance-dashboard/IssuanceDashboard').then((m) => ({ default: m.IssuanceDashboard })),
);
```

---

## Render

### Colocate transient state

The dominant structural decision. State that changes often lives beside what
reads it, so a change repaints one component rather than the page.

Three examples, each removing a whole class of wasted render:

**Search draft** lives in `IssuanceFilterBar`, debounced there:

```tsx
const [searchDraft, setSearchDraft] = useState('');

// Typing shouldn't fire a request per keystroke.
useEffect(() => {
  const timer = setTimeout(() => onSearchChange(searchDraft), 300);
  return () => clearTimeout(timer);
}, [searchDraft, onSearchChange]);
```

A keystroke re-renders the bar. Nothing above it moves until the debounce fires.
`onSearchChange` must be a stable setter, or the timer restarts every render and
never fires.

**Selected row, row count and grid loading** live in `IssuanceTable`. Clicking a
row updates the detail panel and leaves the charts untouched.

**Legend expansion** lives in `useCollapsed`, inside each legend.

The test: *if changing this should not repaint the charts, it must not live
above the charts.*

### Stable identity

`query` is memoised, so it can be a dependency directly:

```tsx
const { data, isFirstLoad, isRefreshing } = useIssuanceAggregates(query);
```

```ts
useEffect(() => {
  const controller = new AbortController();
  // …
  return () => controller.abort();
}, [query]);
```

Do **not** reach for `JSON.stringify(query)` as a key. It allocates a string on
every render, walks the whole object, and is only needed when the object is
unstable — which is a bug to fix at the source, not to paper over.

Empty results share module-level constants, so a render with no data does not
produce fresh arrays that defeat every downstream memo:

```ts
/** Shared placeholders: a fresh literal per render would defeat the memos. */
const NO_SERIES: SeriesPoint[] = [];
const NO_SLICES: CategorySlice[] = [];
const NO_VALUES: string[] = [];

const categories = aggregates?.categories ?? NO_SLICES;
```

Default props follow the same rule — `DEFAULT_PREFS` is a module constant, not
an inline object literal.

### The grid

Memoised, because the surrounding page re-renders for reasons the grid does not
care about:

```tsx
export const IssuanceGrid = memo(function IssuanceGrid({ query, density, onSelect, … }) {
```

Memo only helps if the props are stable, and one of them cannot be: the reporting
callbacks change whenever the parent re-renders. They are read through a ref
instead, so the datasource can depend on `query` alone:

```tsx
/**
 * Rebuilding the datasource purges every cached block, so it may only depend
 * on the query. Reporting callbacks are read through a ref instead.
 */
const report = useRef({ onDefaultRow, onTotalRowsChange, onLoadingChange });
report.current = { onDefaultRow, onTotalRowsChange, onLoadingChange };

const datasource = useMemo<IDatasource>(
  () => ({
    rowCount: undefined,
    getRows: (params) => {
      report.current.onLoadingChange(true);
      // …
    },
  }),
  [query],
);
```

This one is worth dwelling on. A datasource rebuild is not a re-render — it
**purges the block cache**, so every visible row refetches. If the datasource
depended on the callbacks, scrolling the grid would set loading state, re-render
the parent, produce new callbacks, rebuild the datasource, and purge the cache
mid-scroll. The ref breaks that loop.

Column definitions, the default column def, the selection config and both themes
are module constants:

```ts
const COLUMNS: ColDef<IssuanceRecord>[] = [ … ];
const DEFAULT_COL_DEF: ColDef<IssuanceRecord> = { … };
const ROW_SELECTION = { mode: 'singleRow', enableClickSelection: true, checkboxes: false } as const;

const DENSITY = {
  comfortable: { theme: themeQuartz.withParams({ ...THEME_PARAMS, spacing: 6 }), rowHeight: 42, headerHeight: 38 },
  compact:     { theme: themeQuartz.withParams({ ...THEME_PARAMS, spacing: 4 }), rowHeight: 32, headerHeight: 32 },
};
```

`withParams` returns a new theme object. Calling it during render hands the grid
a new theme identity every pass, and the grid remounts.

### Derived, not stored

Values computed from the response are computed during render, not held in state
and synchronised by an effect. `selectedShare`, the chart config and the active
sets are all plain expressions.

They are also not wrapped in `useMemo`. Each is a filter and a reduce over at
most a dozen slices; the dependency comparison costs more than the work. Reserve
`useMemo` for values whose identity is a dependency elsewhere — `query` and
`chartConfig` qualify, `selectedShare` does not.

### Scroll

The sticky hairline subscribes to a **boolean**, not the offset that produces
it:

```ts
const read = () => setScrolled((target instanceof Window ? window.scrollY : target.scrollTop) > 2);
target.addEventListener('scroll', read, { passive: true });
```

`setScrolled` with the same value is a no-op, so the shell re-renders exactly
twice per scroll session regardless of distance. Holding `scrollY` in state
would re-render on every frame.

---

## Allocation

Small, and worth it only on paths that run per row or per keystroke.

**`Intl` formatters are module constants.** Constructing one is expensive
relative to formatting with it, and the grid formats a date per visible row per
scroll:

```ts
/** Built once: a formatter per cell would allocate on every scroll. */
const PRICED_DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: '2-digit',
});
```

Five of these exist across the folder. None are constructed inside a function
that renders.

**Search blobs are precomputed once**, at module load:

```ts
/**
 * One lowercased haystack per row, built once. A real service would push this
 * down to the database; here it keeps free-text search off the hot path, since
 * a single query scopes the table three times over.
 */
const SEARCH_BLOBS = ROWS.map((row) =>
  `${row.issuer} ${row.ticker} ${row.sector} ${row.region} ${row.rating} ${row.currency} ${row.tenor} ${row.status}`.toLowerCase(),
);
```

Building the haystack inside the filter predicate allocates eight-part template
strings for every row on every scope pass, and a single query scopes three
times.

**Generator weights are precomputed per month** rather than per deal, which
removes a `Date` construction from the inner loop. Only relevant to the mock
data layer, but the pattern generalises: hoist anything constant out of a loop
that runs per record.

---

## Data layer

One aggregate request runs `scope` three times — once for stats, once for the
bar chart, once for the donut — because each applies a different filter
exclusion. Three passes over the row set is the cost of the behaviour described
in [02-functional-spec.md](./02-functional-spec.md#scope-exclusion).

At a few hundred rows in memory that is free. At scale it becomes three
database queries, which is the point at which they should run concurrently, and
the point at which aggregation belongs server-side.

Requests are abortable and superseded requests are cancelled. Filter changes
supersede constantly, and without cancellation a slow early response can
overwrite a fast later one — a correctness bug that presents as flicker.

---

## Anti-patterns

Things that look like cleanups and are not.

**Do not widen the datasource's dependencies.** Anything other than `query`
purges the block cache and refetches every visible row. See
[the grid](#the-grid).

**Do not stringify the query for a cache key.** It allocates per render and
hides an unstable object rather than fixing it.

**Do not define a component inside another component.** React sees a new type
every render and remounts the subtree, losing state, focus and scroll position.
This is the most damaging single mistake available in this codebase, and the
easiest to make when extracting a wrapper.

**Do not lift grid or search state to the page.** It is the whole reason
`IssuanceTable` exists. Moving row selection up re-renders both charts on every
click.

**Do not register `AllCommunityModule`.** 150KB gzipped for features that are
not reachable.

**Do not build AG Grid themes, column defs or `Intl` formatters during render.**
All are module constants for a reason; the theme in particular remounts the
grid.

**Do not pass inline `[]`, `{}` or `() => {}` as default props.** Fresh identity
every render defeats `memo` completely.

**Do not `useMemo` a short expression with a primitive result.** The dependency
check costs more than the expression.

**Do not read stack or breakdown dimensions from component state in the
charts.** Use the values echoed back on the response. State is ahead of the data
during a refetch, and the chart will draw bands the payload does not contain.

**Do not animate `transform` on anything sharing a line box with text.** The
refresh indicator remounts as data ticks and would spend most of its visible
life mid-slide, reading as misaligned. Opacity only.

**Do not remove the `+1` in the collapse conditions.** `items.length > limit + 1`
in `useCollapsed`, `sorted.length <= limit + 1` in `rankCategories`, and
`ordered.length > maxRows + 1` in the tooltip all prevent folding a single item
into a summary that says less than the item did.

**Do not shorten the loading delays.** The 220ms delay and 420ms hold in
`useSettledFlag` exist so quick responses never flash an indicator. Removing
them makes the page feel busier, not faster.

---

## Measuring

**Module cost in isolation.** Bundle a file that imports nothing but the
registration and measure it:

```bash
npx esbuild probe.ts --bundle --minify --format=esm --outfile=out.js
gzip -c out.js | wc -c
```

This isolates a library's contribution from everything else in the chunk, which
a build report cannot.

**Re-render counts.** React DevTools Profiler with "record why each component
rendered" on. Scroll the grid, type in the search box, and click a row. Only the
grid, the filter bar and the detail panel respectively should appear.

**Behaviour under latency.** The mock's 620ms and 480ms delays exist so the
loading states are exercised in normal development. Raise them temporarily to
inspect skeletons and the dimmed refresh state.

**Verifying a refactor changed nothing.** For work that must be
behaviour-preserving, hash the dataset and compare rendered output before and
after:

```ts
createHash('sha256').update(JSON.stringify(ROWS)).digest('hex');
```

A matching hash proves the data layer is untouched; screenshots of the key
states — default, stacked, expanded legend, both popovers, scrolled grid — cover
the rest. Chart anti-aliasing can differ by one unit on a colour channel between
runs, so compare with a tolerance rather than requiring byte equality.
