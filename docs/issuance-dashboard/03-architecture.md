# Architecture

How the pieces fit, where state lives, and what to change when the dashboard
needs to do something new.

- [Layers](#layers)
- [Dependency direction](#dependency-direction)
- [State ownership](#state-ownership)
- [Data contract](#data-contract)
- [Replacing the data layer](#replacing-the-data-layer)
- [Adding a dimension](#adding-a-dimension)
- [Adding a filter field](#adding-a-filter-field)
- [Boundary rules](#boundary-rules)
- [Substitutions](#substitutions)

---

## Layers

Four layers, each depending only on the one beneath it.

```
┌──────────────────────────────────────────────────────────┐
│ Presentation                                             │
│ DashboardShell · IssuanceHero · VolumeChart · MixDonut   │
│ IssuanceTable · IssuanceGrid · IssuanceDetail            │
│ IssuanceFilterBar · IssuanceControls · IssuanceSkeletons │
├──────────────────────────────────────────────────────────┤
│ Orchestration                                            │
│ IssuanceDashboard · useIssuanceAggregates                │
├──────────────────────────────────────────────────────────┤
│ Query                                                    │
│ issuanceApi · issuanceFilters · issuanceRange            │
├──────────────────────────────────────────────────────────┤
│ Data                                                     │
│ issuanceData                                             │
└──────────────────────────────────────────────────────────┘
```

**Data** owns the record type, the dataset, date bucketing, and category
ranking. It knows nothing about React.

**Query** turns a `IssuanceQuery` into aggregates and row pages, asynchronously.
It owns the scope rules — including the per-surface filter exclusion described
in [02-functional-spec.md](./02-functional-spec.md#scope-exclusion) — and the
clause algebra. Also no React.

**Orchestration** owns the query, fetches against it, and distributes the
result. This is the only layer that knows the dashboard is a dashboard.

**Presentation** renders. Components take data and callbacks; none of them
fetch, and none reach past their props for state.

The two lowest layers are plain TypeScript and can be tested without a renderer.

---

## Dependency direction

Presentational components never import from each other's siblings except
through three shared modules, which exist because two callers each genuinely
need them:

- `format.ts` — currency formatting, used by the hero and both charts.
- `chartFrame.tsx` — band height, control bar, empty state, collapsible-legend
  hook; used by both charts.
- `IssuanceSkeletons.tsx` — loading placeholders, used across the tree.

`IssuanceControls.tsx` is the one deliberate grouping: the segmented control,
the range picker, granularity tabs, the two dimension menus, and the date
calendar and footer. They are together because the calendar and footer are
shared by the range picker and the pricing-date filter, and splitting them would
create a module whose only purpose is to be imported twice.

Nothing imports from `IssuanceDashboard.tsx`. It is the root.

---

## State ownership

State lives at the lowest level that can own it. This is a correctness
decision as much as a performance one — state placed too high causes stale
selections and cross-component coupling.

| State | Owner | Why there |
| --- | --- | --- |
| Date preset, custom window | `IssuanceDashboard` | Feeds the query |
| Granularity, stackBy, breakdownBy | `IssuanceDashboard` | Feeds the query |
| Filter clauses | `IssuanceDashboard` | Feeds the query; several surfaces write to it |
| Committed search term | `IssuanceDashboard` | Feeds the query |
| View mode, dataset | `IssuanceDashboard` | Chrome-level |
| **Search draft** | `IssuanceFilterBar` | Pre-debounce; nothing above needs it |
| **Selected row** | `IssuanceTable` | Only the detail panel reads it |
| **Row count, grid loading** | `IssuanceTable` | Only the filter bar reads them |
| **Legend expanded** | `useCollapsed`, per legend | Purely local |
| **Popover open, drafts** | Each popover | Discarded on cancel |
| Grid sort model | `IssuanceGrid` ref | Not render-relevant |

The rule: **if changing it should not repaint the charts, it must not live above
the charts.** Row selection and search keystrokes are the two that most obviously
qualify, and both are the reason `IssuanceTable` exists as a component at all.

`IssuanceDashboard` holds the query and nothing else that changes often.

### The query object

Assembled in one `useMemo` and treated as the single source of truth:

```tsx
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
```

Its **identity** is the cache key. `useIssuanceAggregates` and the grid's
datasource both depend on the object itself, not a serialisation of it. This is
a contract: a caller that builds the query inline will refetch on every render.

### Clearing everything

`clearAll` empties the filters and the committed search, then increments a
counter used as a `key` on the filter bar:

```tsx
const clearAll = () => {
  setFilters([]);
  setSearch('');
  setSearchKey((current) => current + 1);
};
```

Remounting is what empties the uncommitted draft inside the bar. The alternative
— lifting the draft up so it can be reset — would put a keystroke-frequency
value at the top of the tree, which is exactly what the colocation is avoiding.

---

## Data contract

Two types and two functions. Satisfy these and the UI works unchanged against
any source.

```ts
type IssuanceStatus = 'Priced' | 'Live' | 'Monitoring';
type IssuanceCurrency = 'EUR' | 'USD' | 'GBP';
type IssuanceRegion =
  | 'Western Europe' | 'North America' | 'APAC (DM)' | 'APAC (EM)' | 'CEEMEA';

/** Any field the charts can group by. */
type Dimension = 'sector' | 'region' | 'currency' | 'rating' | 'issuer';

interface IssuanceRecord {
  id: string;
  pricingDate: string;      // ISO date, sorts lexicographically
  monthKey: string;         // 'YYYY-MM'
  issuer: string;
  ticker: string;
  region: IssuanceRegion;
  sector: string;
  rating: string;
  currency: IssuanceCurrency;
  size: number;             // millions, local currency
  eurEquivalent: number;    // millions, EUR
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

Two constraints on `IssuanceRecord`:

- **Every `Dimension` must name a field whose value is a string.** Grouping
  reads `row[dimension]` directly.
- **`pricingDate` must be `YYYY-MM-DD`.** Range checks are string comparisons,
  which is only valid for zero-padded ISO dates.

The service surface:

```ts
function fetchIssuanceAggregates(
  query: IssuanceQuery,
  signal?: AbortSignal,
): Promise<IssuanceAggregates>;

function fetchIssuanceRows(
  query: IssuanceQuery,
  startRow: number,
  endRow: number,
  sort: IssuanceRowSort | null,
  signal?: AbortSignal,
): Promise<IssuanceRowPage>;
```

```ts
interface IssuanceAggregates {
  /**
   * Echoed back so the charts render the dimensions the data was built for.
   * While a new query is in flight the previous payload stays on screen, and
   * reading these off component state instead would draw empty bands.
   */
  stackBy: Dimension | null;
  breakdownBy: Dimension;

  series: SeriesPoint[];
  categories: CategorySlice[];   // stack bands, largest first
  stackOther: string[];          // values folded into the stack's "Other"
  breakdown: CategorySlice[];
  breakdownOther: string[];
  breakdownTotal: number;
  stats: IssuanceStats;
}

interface SeriesPoint {
  key: string;                   // bucket key
  label: string;                 // axis label
  labelLong: string;             // tooltip label
  total: number;
  deals: number;
  /** One entry per stack category; absent categories are zero-filled. */
  [category: string]: string | number;
}

interface CategorySlice {
  category: string;
  volume: number;
  deals: number;
  fill: string;                  // resolved colour, not a token name
}

interface IssuanceStats {
  totalVolume: number;           // billions
  dealCount: number;
  averageSize: number;           // millions
  largest: { issuer: string; ticker: string; volume: number } | null;
}
```

Three details in the aggregate response that are easy to miss and expensive to
get wrong:

**`stackBy` and `breakdownBy` are echoed back.** The charts render bands from
the response, never from component state, because the previous payload stays on
screen during a refetch.

**Zero-fill every bucket.** Buckets with no deals must still appear in `series`
with zero values, and every stack category must be present on every point.
Recharts draws gaps for missing keys rather than zeros.

**`fill` is a resolved colour string.** Sending a token name would force the
presentation layer to own the palette, which is what makes band colours drift
between the chart and its legend.

---

## Replacing the data layer

Delete the generator in `issuanceData.ts`, keep the types and the aggregation
helpers, and reimplement the two functions.

The mock deliberately makes the UI cope with reality: aggregates resolve in
620ms plus up to 260ms of jitter, rows in 480ms plus jitter, and both honour an
`AbortSignal`.

```ts
export async function fetchIssuanceAggregates(
  query: IssuanceQuery,
  signal?: AbortSignal,
): Promise<IssuanceAggregates> {
  const response = await fetch('/api/issuance/aggregates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal,
  });
  if (!response.ok) throw new Error(`Aggregates failed: ${response.status}`);
  return response.json();
}
```

Two ways to split the work:

**Aggregate server-side.** Send the query, return the shape above. Right for
real datasets: grouping, ranking and bucketing all become one SQL statement, and
the browser never sees the rows. The server must then implement the scope
exclusion rule, the band cap, and zero-filling.

**Aggregate client-side.** Fetch rows for the window once and keep
`rankCategories`, `buildSeries` and `computeStats` in the browser. Simpler, and
fine below roughly ten thousand rows.

Either way, keep the abort handling. Filter changes supersede in-flight requests
constantly, and without it a slow early response can overwrite a fast later one.

If the aggregation stays client-side, the row-page function still needs to sort
and slice, since the grid only ever holds one page.

---

## Adding a dimension

Say the data gains a `couponType` field and it should be groupable. Five edits,
in dependency order.

**1. Extend the record and the union** — `issuanceData.ts`:

```ts
export type Dimension = 'sector' | 'region' | 'currency' | 'rating' | 'issuer' | 'couponType';

export interface IssuanceRecord {
  // …
  couponType: string;
}
```

**2. Label it and declare its universe** — same file:

```ts
export const DIMENSION_LABELS: Record<Dimension, string> = {
  // …
  couponType: 'Coupon type',
};

export function categoryUniverse(dimension: Dimension): string[] {
  // …
  if (dimension === 'couponType') return ISSUANCE_COUPON_TYPES;
}
```

The universe is what `Other` expands to when clicked, and its length decides
whether the dimension gets 5 bands or 10.

**3. Offer it in the menus** — `IssuanceControls.tsx`:

```ts
const DIMENSIONS: Dimension[] = ['sector', 'region', 'currency', 'rating', 'issuer', 'couponType'];
```

**4. Make it filterable** — `issuanceApi.ts` and `issuanceFilters.ts`:

```ts
export type ListField = 'issuer' | 'ticker' | 'region' | 'sector' | 'rating'
  | 'currency' | 'status' | 'couponType';

export const FILTER_FIELDS: FieldDef[] = [
  // …
  { field: 'couponType', label: 'Coupon type', kind: 'list', options: ISSUANCE_COUPON_TYPES },
];
```

This step is not optional. Clicking a chart writes a clause on the grouped
dimension, so a `Dimension` that is not also a `ListField` fails to typecheck.
That is the type system enforcing a real constraint, not an inconvenience.

**5. Optionally add a grid column** — `IssuanceGrid.tsx`, plus an entry in
`LOADING_CELL_WIDTHS` so its loading cells are sized like the rest.

Nothing else changes. Ranking, colouring, the `Other` fold, tooltips, legends
and click-to-filter all read from the dimension generically.

---

## Adding a filter field

For a field that is filterable but not groupable, only steps 4 and 5 above
apply. Choose the editor with `kind`:

- `list` — multi-select with a search box above eight options.
- `size` — numeric min/max. Currently bound to the `size` field; generalising
  means widening the clause type to carry a field name.
- `date` — calendar plus typed range.

A genuinely new editor kind needs three things: a variant on the `FilterClause`
union, a branch in `matchesClause`, and a branch in `describeClause` so the chip
can label itself. The compiler finds all three if the union is extended first.

---

## Boundary rules

The folder imports React, its declared libraries, and the shadcn primitives.
Nothing else. Keeping that true is what lets it move.

Three rules hold the boundary:

**No host context.** Configuration arrives as props. `DisplayPrefs` is a plain
object with a default, so the dashboard renders standalone:

```tsx
const DEFAULT_PREFS: DisplayPrefs = {
  density: 'comfortable',
  showSectorMix: true,
  showDetailPanel: true,
};

export function IssuanceDashboard({
  prefs = DEFAULT_PREFS,
  toolbar,
}: {
  prefs?: DisplayPrefs;
  toolbar?: React.ReactNode;
}) {
```

Wire it to a settings store, a context or a URL by adapting outside:

```tsx
function HostDashboard() {
  const { prefs } = useAppSettings();
  return <IssuanceDashboard prefs={prefs} toolbar={<SettingsButton />} />;
}
```

**Host chrome comes in as a node.** `toolbar` renders in the top bar. The
dashboard does not know or care what it is.

**No router.** Navigation state is local. To drive it from the URL, lift
`dataset` and `viewMode` into the adapter and pass them down — they are already
plain props on `DashboardShell`.

Worth adding if the folder will be maintained long-term: a dependency-cruiser
rule forbidding imports from outside the folder except the primitives, run
alongside typecheck. A convention that is only written down decays.

---

## Substitutions

Several choices here are defensible rather than mandatory. What each swap costs:

**AG Grid → TanStack Table.** Removes about 36KB gzipped and the licensing
question. Costs the infinite row model, column pinning and resizing, which then
have to be built. Reasonable if the table is a few hundred rows and always
client-side; the query layer already returns pages, so the datasource is the
only thing to rewrite. The theme in
[01-design-system.md](./01-design-system.md#ag-grid-theme) becomes plain CSS.

**Recharts → ECharts.** Better at very dense series and large scatter data.
Costs the shadcn chart wrapper, which is Recharts-specific — the tooltip
behaviour in [01](./01-design-system.md#chart-wrapper) would need
reimplementing against ECharts' formatter API. Not worth it at these data
volumes.

**The fetch hook → TanStack Query.** Sensible if the host already uses it.
`useIssuanceAggregates` is a stale-while-revalidate cache of exactly one entry;
Query gives real caching, retries and devtools. Keep the memoised query object
as the key, and keep `useSettledFlag` — the delay-and-hold behaviour is not
something Query provides.

**Tailwind → CSS modules.** Every value is in
[01-design-system.md](./01-design-system.md), so translation is mechanical. The
hand-written CSS is already framework-neutral.

**Local state → URL state.** Putting the query in search params makes views
shareable, which for an analytics page is a real gain. Serialise the query,
parse it back in `IssuanceDashboard`, and keep the memo — the rest of the tree
already reads it as a prop. Take care that parsing produces a stable object
identity, or the app refetches on every render.

**Adding a second dashboard.** `DashboardShell` already accepts arbitrary
children and its dataset tabs are a plain array. A second dataset means a second
orchestrator component beside `IssuanceDashboard`, sharing the shell, the
controls and the skeletons. Split the layers before the second one arrives, not
after: the query and data layers are the parts that will need to become generic.
