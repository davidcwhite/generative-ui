import type { Currency, DealStatus, RatingBand, Sector } from './data/model';
import type { TenorBucket } from './data/queries';

/**
 * The contract between the agent and the frontend.
 *
 * The agent returns a *recipe* (`spec`) alongside the frozen `payload` it
 * narrated. Chat renders the payload; the workspace re-executes the spec. The
 * payload never travels to the workspace, because it is a snapshot of a moment
 * rather than a source of truth — and a banker who can't tell those apart will
 * eventually quote a stale number to an issuer.
 */

export type BlockType =
  | 'comps'
  | 'deal_flash'
  | 'allocation_summary'
  | 'investor_profile'
  | 'supply';

export interface CompsFilters {
  ratingBands?: RatingBand[];
  sectors?: Sector[];
  currencies?: Currency[];
  tenorBuckets?: TenorBucket[];
}

export interface CompsSpec {
  blockType: 'comps';
  /** The deal being positioned against the peer set, if there is one. */
  subject?: { trancheId: string };
  filters: CompsFilters;
  /** Trailing window in months. Comps older than this stop being comparable. */
  windowMonths: number;
  asOf: string;
}

export interface DealFlashSpec {
  blockType: 'deal_flash';
  dealId: string;
  /** Which tranche leads the view. Defaults to the largest. */
  trancheId?: string;
  asOf: string;
}

export type BlockSpec = CompsSpec | DealFlashSpec;

export interface CompsPoint {
  id: string;
  issuer: string;
  ticker: string;
  sector: Sector;
  rating: string;
  ratingBand: RatingBand;
  currency: Currency;
  tenorYears: number;
  tenorLabel: string;
  sizeMm: number;
  sizeEurMm: number;
  spread: number;
  nip: number;
  coverage: number;
  pricingDate: string;
  multiTranche: boolean;
}

/**
 * A benchmark is not decoration. "Cover 3.2x" is noise; "3.2x against a 2.8x
 * peer median" is the answer, so every headline metric carries its peer context.
 */
export interface Benchmark {
  value: number;
  peerMedian: number;
  /** 0-1 position within the peer set. */
  rank: number;
  peerCount: number;
  /**
   * What the comparison is against, shown verbatim. Spread rises with tenor, so
   * scoring a 20Y against a median that includes 3Y paper would mark every long
   * bond as expensive; the label makes the basis impossible to misread.
   */
  basis: string;
  /**
   * False when no tenor-matched peer set exists. The UI then shows the median
   * for context but withholds the quartile verdict, because a ranking drawn
   * across the whole curve is worse than no ranking at all.
   */
  reliable: boolean;
}

export interface CompsStats {
  count: number;
  medianSpread: number;
  q1Spread: number;
  q3Spread: number;
  medianCoverage: number;
  medianNip: number;
  totalEurBn: number;
}

export interface CompsPayload {
  points: CompsPoint[];
  stats: CompsStats;
  /**
   * Median spread per tenor with the interquartile range as a `[q1, q3]` band.
   * Per-tenor rather than a flat band, because spread rises with tenor and a
   * horizontal quartile stripe would flag long paper as expensive when it isn't.
   */
  curve: { tenorYears: number; spread: number; band: [number, number] }[];
  subject?: {
    point: CompsPoint;
    spread: Benchmark;
    coverage: Benchmark;
    nip: Benchmark;
  };
  /** True when `points` is a capped sample; the workspace fetches the full set. */
  truncated: boolean;
}

/**
 * A rung on the pricing ladder. `reached` is false for stages a live deal
 * hasn't got to yet, which is how one component covers every lifecycle stage
 * from announcement to pricing without inventing numbers for the ones ahead.
 */
export interface PricingStage {
  label: 'IPT' | 'Guidance' | 'Reoffer';
  spread: number | null;
  reached: boolean;
}

export interface DealFlashTranche {
  id: string;
  key: string;
  tenorLabel: string;
  tenorYears: number;
  sizeMm: number | null;
  coupon: number | null;
  maturity: string;
  format: string;
  reofferSpread: number | null;
  compressionBp: number | null;
  nipBp: number | null;
  bookMm: number | null;
  coverage: number | null;
  stages: PricingStage[];
}

export interface DealFlashPayload {
  deal: {
    id: string;
    issuer: string;
    ticker: string;
    rating: string;
    ratingBand: RatingBand;
    sector: Sector;
    status: DealStatus;
    pricingDate: string;
    currency: Currency;
    leads: string[];
  };
  tranches: DealFlashTranche[];
  /** The tranche the block leads with. */
  focus: DealFlashTranche;
  totalSizeMm: number | null;
  /**
   * The tape the deal priced into. Execution is judged against the day, not
   * against history: 95bp on a widening tape is a different piece of work from
   * 95bp on a rallying one, and the spread alone can't tell you which it was.
   */
  market: {
    level: number;
    changeWeekBp: number;
    series: { date: string; level: number }[];
  };
  spread?: Benchmark;
  coverage?: Benchmark;
  nip?: Benchmark;
  /**
   * The comps run for this deal, precomputed as a spec. Cross-block links are
   * data rather than hardcoded routes, so a block can offer a way onward
   * without knowing what else exists.
   */
  compsSpec: CompsSpec;
}

export type BlockPayload = CompsPayload | DealFlashPayload;

/**
 * What the agent attaches to a message. `payload` is frozen at `computedAt`;
 * `spec` is portable and re-executable.
 */
export interface BlockInstance {
  id: string;
  spec: BlockSpec;
  payload: BlockPayload;
  computedAt: string;
}

/** Inline chat payloads are capped so a comps table doesn't sit in context forever. */
export const INLINE_ROW_CAP = 25;

export function describeSpec(spec: BlockSpec): string {
  if (spec.blockType === 'deal_flash') return 'Single deal · terms to book';

  const parts: string[] = [];
  if (spec.filters.ratingBands?.length) parts.push(spec.filters.ratingBands.join('/'));
  if (spec.filters.sectors?.length) parts.push(spec.filters.sectors.join(', '));
  if (spec.filters.tenorBuckets?.length) parts.push(spec.filters.tenorBuckets.join(', '));
  if (spec.filters.currencies?.length) parts.push(spec.filters.currencies.join('/'));
  const scope = parts.length ? parts.join(' · ') : 'All issuance';
  return `${scope} · last ${spec.windowMonths}m`;
}
