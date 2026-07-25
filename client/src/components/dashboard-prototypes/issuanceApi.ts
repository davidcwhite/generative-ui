import {
  SHADCN_ISSUANCE_ROWS,
  aggregateMonthlyIssuance,
  aggregateSectorIssuance,
  otherSectorMembers,
  type IssuanceRecord,
  type MonthlyIssuance,
  type SectorIssuance,
} from './shadcnIssuanceData';

/**
 * Stands in for a real issuance service. Every read is asynchronous and paged so
 * the UI has to cope with latency exactly as it would in production.
 */

export interface IssuanceQuery {
  months: string[];
  currencies: string[];
  ratings: string[];
  sectors: string[];
  search: string;
}

export interface IssuanceAggregates {
  monthly: MonthlyIssuance[];
  sectors: SectorIssuance[];
  totalVolume: number;
  dealCount: number;
  otherSectors: string[];
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

/**
 * Charts intentionally ignore the sector filter: the donut has to keep showing
 * the whole composition while the table narrows to the picked sector.
 */
function matchesChartScope(row: IssuanceRecord, query: IssuanceQuery) {
  if (!query.months.includes(row.monthKey)) return false;
  if (query.currencies.length > 0 && !query.currencies.includes(row.currency)) return false;
  if (query.ratings.length > 0 && !query.ratings.includes(row.rating)) return false;
  return true;
}

function matchesRowScope(row: IssuanceRecord, query: IssuanceQuery) {
  if (!matchesChartScope(row, query)) return false;
  if (query.sectors.length > 0 && !query.sectors.includes(row.sector)) return false;
  const search = query.search.trim().toLowerCase();
  if (
    search &&
    !`${row.issuer} ${row.sector} ${row.rating} ${row.currency} ${row.tenor} ${row.status}`
      .toLowerCase()
      .includes(search)
  ) {
    return false;
  }
  return true;
}

export function fetchIssuanceAggregates(
  query: IssuanceQuery,
  signal?: AbortSignal,
): Promise<IssuanceAggregates> {
  const scoped = SHADCN_ISSUANCE_ROWS.filter((row) => matchesChartScope(row, query));
  const aggregates: IssuanceAggregates = {
    monthly: aggregateMonthlyIssuance(scoped, query.months),
    sectors: aggregateSectorIssuance(scoped),
    totalVolume: scoped.reduce((sum, row) => sum + row.eurEquivalent, 0) / 1000,
    dealCount: scoped.length,
    otherSectors: otherSectorMembers(scoped),
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
  const scoped = SHADCN_ISSUANCE_ROWS.filter((row) => matchesRowScope(row, query));
  const sorted = sort ? [...scoped].sort(compareBy(sort)) : scoped;
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
