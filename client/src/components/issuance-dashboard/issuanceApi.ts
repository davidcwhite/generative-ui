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

export interface IssuanceRowPage {
  rows: IssuanceRecord[];
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
  let total = 0;
  let largest = rows[0];
  rows.forEach((row) => {
    total += row.eurEquivalent;
    if (row.eurEquivalent > largest.eurEquivalent) largest = row;
  });
  return {
    totalVolume: total / 1000,
    dealCount: rows.length,
    averageSize: total / rows.length,
    largest: {
      issuer: largest.issuer,
      ticker: largest.ticker,
      volume: largest.eurEquivalent,
    },
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

export function fetchIssuanceRows(
  query: IssuanceQuery,
  startRow: number,
  endRow: number,
  sort: IssuanceRowSort | null,
  signal?: AbortSignal,
): Promise<IssuanceRowPage> {
  const rows = scope(query);
  const sorted = sort ? [...rows].sort(compareBy(sort)) : rows;
  const page: IssuanceRowPage = {
    rows: sorted.slice(startRow, endRow),
    totalRows: sorted.length,
  };
  return delay(page, latency(ROW_PAGE_LATENCY_MS), signal);
}

function compareBy(sort: IssuanceRowSort) {
  const direction = sort.direction === 'asc' ? 1 : -1;
  return (a: IssuanceRecord, b: IssuanceRecord) => {
    const left = a[sort.colId as keyof IssuanceRecord];
    const right = b[sort.colId as keyof IssuanceRecord];
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }
    return String(left).localeCompare(String(right)) * direction;
  };
}
