import { AS_OF, DATASET } from './generate';
import type { Currency, RatingBand, Sector, TrancheRow } from './model';

export { AS_OF, DATASET };

const issuerById = new Map(DATASET.issuers.map((issuer) => [issuer.id, issuer]));
const dealById = new Map(DATASET.deals.map((deal) => [deal.id, deal]));

const trancheCountByDeal = new Map<string, number>();
DATASET.tranches.forEach((tranche) => {
  trancheCountByDeal.set(tranche.dealId, (trancheCountByDeal.get(tranche.dealId) ?? 0) + 1);
});

/** The join every block starts from: one row per tranche, deal and issuer attached. */
export const TRANCHE_ROWS: TrancheRow[] = DATASET.tranches
  .map((tranche) => {
    const deal = dealById.get(tranche.dealId)!;
    return {
      ...tranche,
      deal,
      issuer: issuerById.get(deal.issuerId)!,
      multiTranche: (trancheCountByDeal.get(tranche.dealId) ?? 1) > 1,
    };
  })
  .sort((a, b) => b.deal.pricingDate.localeCompare(a.deal.pricingDate));

export const ROW_BY_ID = new Map(TRANCHE_ROWS.map((row) => [row.id, row]));

/** Daily credit backdrop, oldest first. */
export const MARKET_SERIES = DATASET.market;

export const SECTORS = [...new Set(DATASET.issuers.map((i) => i.sector))].sort() as Sector[];
export const RATING_BANDS: RatingBand[] = ['AA', 'A', 'BBB'];
export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP'];
export const TENOR_BUCKETS = ['3-5Y', '6-8Y', '9-12Y', '13Y+'] as const;
export type TenorBucket = (typeof TENOR_BUCKETS)[number];

export function tenorBucket(years: number): TenorBucket {
  if (years <= 5) return '3-5Y';
  if (years <= 8) return '6-8Y';
  if (years <= 12) return '9-12Y';
  return '13Y+';
}

/** Linear-interpolated percentile. Quartile bands on the comps scatter use this. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function median(values: number[]): number {
  return percentile(values, 0.5);
}

/** Where a value sits in a peer set, 0-1. The honest form of "is this good?". */
export function percentileRank(values: number[], value: number): number {
  if (values.length === 0) return 0.5;
  const below = values.filter((item) => item < value).length;
  return below / values.length;
}

export function dateMinusMonths(isoDate: string, months: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

const ALLOCATIONS_BY_TRANCHE = new Map<string, typeof DATASET.allocations>();
DATASET.allocations.forEach((allocation) => {
  const list = ALLOCATIONS_BY_TRANCHE.get(allocation.trancheId) ?? [];
  list.push(allocation);
  ALLOCATIONS_BY_TRANCHE.set(allocation.trancheId, list);
});

export function allocationsFor(trancheId: string) {
  return ALLOCATIONS_BY_TRANCHE.get(trancheId) ?? [];
}

/** Tranches with book detail. Blocks that need allocations must filter on this. */
export const TRANCHES_WITH_ALLOCATIONS = new Set(ALLOCATIONS_BY_TRANCHE.keys());
