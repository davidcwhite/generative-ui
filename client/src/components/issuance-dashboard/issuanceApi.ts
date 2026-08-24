import {
  SHADCN_ISSUANCE_ROWS,
  buildSeries,
  categoryUniverse,
  otherMembers,
  rankCategories,
  type CategorySlice,
  type Dimension,
  type Granularity,
  type IssuanceRecord,
  type SeriesPoint,
} from './issuanceData';

/**
 * Stands in for a real issuance service. Every read is asynchronous and paged so
 * the UI has to cope with latency exactly as it would in production.
 */

/** Fields a filter clause can target. List fields all resolve to a string on the row. */
export type ListField = 'issuer' | 'ticker' | 'region' | 'sector' | 'rating' | 'currency' | 'status';
export type FilterField = ListField | 'size' | 'pricingDate';

/** At most one clause per field, so a clause is identified by its field alone. */
export type FilterClause =
  | { field: ListField; values: string[] }
  | { field: 'size'; min: number | null; max: number | null }
  | { field: 'pricingDate'; from: string | null; to: string | null };

export interface IssuanceQuery {
  /** Inclusive ISO date window covering the whole dashboard. */
  from: string;
  to: string;
  granularity: Granularity;
  /** Null renders a single unstacked series. */
  stackBy: Dimension | null;
  breakdownBy: Dimension;
  filters: FilterClause[];
  search: string;
}

export interface IssuanceStats {
  totalVolume: number;
  dealCount: number;
  averageSize: number;
  largest: { issuer: string; ticker: string; volume: number } | null;
}

export interface IssuanceAggregates {
  /**
   * Echoed back so the charts render the dimensions the data was built for.
   * While a new query is in flight the previous payload stays on screen, and
   * reading these off component state instead would draw empty bands.
   */
  stackBy: Dimension | null;
  breakdownBy: Dimension;
  series: SeriesPoint[];
  /** Stack bands, largest first. A single "Volume" band when stacking is off. */
  categories: CategorySlice[];
  stackOther: string[];
  breakdown: CategorySlice[];
  breakdownOther: string[];
  breakdownTotal: number;
  stats: IssuanceStats;
}

export interface IssuanceRowSort {
  colId: string;
  direction: 'asc' | 'desc';
}

/**
 * A tranche row plus the banding metadata the grid needs to emulate merged
 * deal cells. Stamped post-filter/pre-slice so it stays correct when a deal
 * splits across fetch blocks or a filter hides some of its tranches.
 */
export interface IssuanceGridRow extends IssuanceRecord {
  /** First visible row of its deal under the current sort and filters. */
  groupHead: boolean;
  /** Position among the deal's visible tranches, so the grid can spot the last one. */
  groupIndex: number;
  /** Visible tranches of the deal after filtering. */
  groupSize: number;
}

export interface IssuanceRowPage {
  rows: IssuanceGridRow[];
  totalRows: number;
}

/** Aggregates are cheap server-side; row pages are the slower call. */
const AGGREGATE_LATENCY_MS = 620;
const ROW_PAGE_LATENCY_MS = 480;
const JITTER_MS = 260;

function latency(base: number) {
  return base + Math.random() * JITTER_MS;
}

function delay<T>(value: T, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => resolve(value), ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function matchesClause(row: IssuanceRecord, clause: FilterClause) {
  if (clause.field === 'size') {
    if (clause.min !== null && row.size < clause.min) return false;
    if (clause.max !== null && row.size > clause.max) return false;
    return true;
  }
  if (clause.field === 'pricingDate') {
    if (clause.from && row.pricingDate < clause.from) return false;
    if (clause.to && row.pricingDate > clause.to) return false;
    return true;
  }
  if (clause.values.length === 0) return true;
  return clause.values.includes(row[clause.field]);
}

/**
 * One lowercased haystack per row, built once. A real service would push this
 * down to the database; here it keeps free-text search off the hot path, since
 * a single query scopes the table three times over.
 */
const SEARCH_BLOBS = SHADCN_ISSUANCE_ROWS.map((row) =>
  `${row.issuer} ${row.ticker} ${row.sector} ${row.region} ${row.rating} ${row.currency} ${row.tenor} ${row.status}`.toLowerCase(),
);

/**
 * `ignoreField` lets a chart drop the filter on the dimension it is breaking
 * down by, so the composition stays whole while the table narrows to the
 * clicked slice.
 */
function scope(query: IssuanceQuery, ignoreField?: FilterField) {
  const term = query.search.trim().toLowerCase();
  return SHADCN_ISSUANCE_ROWS.filter((row, index) => {
    if (row.pricingDate < query.from || row.pricingDate > query.to) return false;
    if (term && !SEARCH_BLOBS[index].includes(term)) return false;
    return query.filters.every((clause) =>
      clause.field === ignoreField ? true : matchesClause(row, clause),
    );
  });
}

function computeStats(rows: IssuanceRecord[]): IssuanceStats {
  if (rows.length === 0) {
    return { totalVolume: 0, dealCount: 0, averageSize: 0, largest: null };
  }
  // Deal totals sum only the tranches in scope, so a size filter that hides
  // part of a deal prices the visible remainder rather than the whole print.
  let total = 0;
  const dealTotals = new Map<string, { issuer: string; ticker: string; volume: number }>();
  rows.forEach((row) => {
    total += row.eurEquivalent;
    const deal = dealTotals.get(row.dealId);
    if (deal) deal.volume += row.eurEquivalent;
    else {
      dealTotals.set(row.dealId, {
        issuer: row.issuer,
        ticker: row.ticker,
        volume: row.eurEquivalent,
      });
    }
  });
  let largest: { issuer: string; ticker: string; volume: number } | null = null;
  dealTotals.forEach((deal) => {
    if (!largest || deal.volume > largest.volume) largest = deal;
  });
  return {
    totalVolume: total / 1000,
    dealCount: dealTotals.size,
    averageSize: total / dealTotals.size,
    largest,
  };
}

export function fetchIssuanceAggregates(
  query: IssuanceQuery,
  signal?: AbortSignal,
): Promise<IssuanceAggregates> {
  const filtered = scope(query);
  const stackRows = query.stackBy ? scope(query, query.stackBy) : filtered;
  const breakdownRows = scope(query, query.breakdownBy);

  const categories = query.stackBy ? rankCategories(stackRows, query.stackBy) : null;
  const stackOther = categories ? otherMembers(categories, categoryUniverse(query.stackBy!)) : [];

  const breakdown = rankCategories(breakdownRows, query.breakdownBy);
  const breakdownOther = otherMembers(breakdown, categoryUniverse(query.breakdownBy));

  const aggregates: IssuanceAggregates = {
    stackBy: query.stackBy,
    breakdownBy: query.breakdownBy,
    series: buildSeries(
      stackRows,
      query.from,
      query.to,
      query.granularity,
      categories,
      stackOther,
      query.stackBy,
    ),
    categories: categories ?? [{ category: 'Volume', volume: 0, deals: 0, fill: 'var(--chart-1)' }],
    stackOther,
    breakdown,
    breakdownOther,
    breakdownTotal: breakdown.reduce((sum, slice) => sum + slice.volume, 0),
    stats: computeStats(filtered),
  };

  return delay(aggregates, latency(AGGREGATE_LATENCY_MS), signal);
}

/** Columns whose value is shared by every tranche of a deal. */
const DEAL_SCOPED_COLUMNS = new Set([
  'issuer',
  'ticker',
  'region',
  'sector',
  'rating',
  'currency',
  'status',
  'pricingDate',
]);

/** Tenor strings sort by their year count, not alphabetically ('10Y' after '8Y'). */
function sortValue(row: IssuanceRecord, colId: string): number | string {
  if (colId === 'tenor') return parseInt(row.tenor, 10);
  const value = row[colId as keyof IssuanceRecord];
  return typeof value === 'number' ? value : String(value);
}

function compareValues(left: number | string, right: number | string) {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

/**
 * Sorting never separates a deal's tranches: deal groups are ordered by a
 * representative value, and every row is stamped with banding metadata before
 * the page is sliced, so blocks fetched later agree on where deals begin.
 */
export function fetchIssuanceRows(
  query: IssuanceQuery,
  startRow: number,
  endRow: number,
  sort: IssuanceRowSort | null,
  signal?: AbortSignal,
): Promise<IssuanceRowPage> {
  const tranches = scope(query);

  const groups = new Map<string, IssuanceRecord[]>();
  tranches.forEach((row) => {
    const group = groups.get(row.dealId);
    if (group) group.push(row);
    else groups.set(row.dealId, [row]);
  });

  // Tranches always read shortest tenor first inside a deal, whatever the sort.
  const dealGroups = [...groups.values()];
  dealGroups.forEach((group) => group.sort((a, b) => a.trancheIndex - b.trancheIndex));

  if (sort) {
    const direction = sort.direction === 'asc' ? 1 : -1;
    const dealScoped = DEAL_SCOPED_COLUMNS.has(sort.colId);
    // Deal-scoped columns share one value, so any tranche represents the deal.
    // Per-tranche columns take the best value in the sort direction (min when
    // ascending, max when descending), so the deal sits where its strongest
    // tranche belongs.
    const representatives = new Map<IssuanceRecord[], number | string>(
      dealGroups.map((group) => {
        let best = sortValue(group[0], sort.colId);
        if (!dealScoped) {
          for (let index = 1; index < group.length; index += 1) {
            const value = sortValue(group[index], sort.colId);
            if (compareValues(value, best) * direction < 0) best = value;
          }
        }
        return [group, best];
      }),
    );
    dealGroups.sort(
      (a, b) =>
        compareValues(representatives.get(a)!, representatives.get(b)!) * direction ||
        a[0].dealId.localeCompare(b[0].dealId),
    );
  }

  const stamped: IssuanceGridRow[] = [];
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

  const page: IssuanceRowPage = {
    rows: stamped.slice(startRow, endRow),
    totalRows: stamped.length,
  };
  return delay(page, latency(ROW_PAGE_LATENCY_MS), signal);
}

/** Every tranche of one deal, ladder order, for the deal card. */
export function fetchDealTranches(dealId: string, signal?: AbortSignal): Promise<IssuanceRecord[]> {
  const tranches = SHADCN_ISSUANCE_ROWS.filter((row) => row.dealId === dealId).sort(
    (a, b) => a.trancheIndex - b.trancheIndex,
  );
  return delay(tranches, latency(ROW_PAGE_LATENCY_MS), signal);
}
