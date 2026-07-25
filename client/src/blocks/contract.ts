import type { Currency, RatingBand, Sector } from './data/model';
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

/** Only comps is implemented; the union is the extension point for the rest. */
export type BlockSpec = CompsSpec;

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

export type BlockPayload = CompsPayload;

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
  const parts: string[] = [];
  if (spec.filters.ratingBands?.length) parts.push(spec.filters.ratingBands.join('/'));
  if (spec.filters.sectors?.length) parts.push(spec.filters.sectors.join(', '));
  if (spec.filters.tenorBuckets?.length) parts.push(spec.filters.tenorBuckets.join(', '));
  if (spec.filters.currencies?.length) parts.push(spec.filters.currencies.join('/'));
  const scope = parts.length ? parts.join(' · ') : 'All issuance';
  return `${scope} · last ${spec.windowMonths}m`;
}
